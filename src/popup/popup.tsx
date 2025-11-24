/**
 * Extension popup UI
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { TLSSnapshotDoc } from '../types';

function Popup() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userIdentity, setUserIdentity] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<TLSSnapshotDoc[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingIdentity, setLoadingIdentity] = useState(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check current tab for provider
    checkCurrentProvider();
    
    // Load user address from storage
    const loadUserAddress = () => {
      chrome.storage.local.get('userAddress', (result) => {
        if (result.userAddress) {
          setUserAddress(result.userAddress);
          setError(null);
          loadSnapshots(result.userAddress);
          fetchUserIdentity(result.userAddress);
        }
      });
    };
    
    loadUserAddress();
    
    // Listen for storage changes (when wallet connects in dashboard)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.userAddress) {
        const newAddress = changes.userAddress.newValue;
        if (newAddress) {
          setUserAddress(newAddress);
          loadSnapshots(newAddress);
          fetchUserIdentity(newAddress);
        } else {
          setUserAddress(null);
          setUserIdentity(null);
          setSnapshots([]);
        }
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  async function fetchUserIdentity(address: string) {
    setLoadingIdentity(true);
    setError(null);
    try {
      // First try to get identities (which contains the identity names)
      const identitiesResponse = await fetch(`https://us-central1-zksscore.cloudfunctions.net/api/api/v1/user/${address}/identities`);
      if (identitiesResponse.ok) {
        const identitiesData = await identitiesResponse.json();
        console.log('[Popup] User identities data:', identitiesData);
        
        if (identitiesData.success && identitiesData.identities && identitiesData.identities.length > 0) {
          // Find primary identity first
          const primaryIdentity = identitiesData.identities.find((id: any) => id.isPrimary === true);
          if (primaryIdentity?.name) {
            setUserIdentity(primaryIdentity.name);
            setLoadingIdentity(false);
            return;
          }
          
          // Then find activated/soulbound identity
          const activatedIdentity = identitiesData.identities.find((id: any) => id.soulbound === true || id.phase === 'SOULBOUND');
          if (activatedIdentity?.name) {
            setUserIdentity(activatedIdentity.name);
            setLoadingIdentity(false);
            return;
          }
          
          // Fallback to first identity
          if (identitiesData.identities[0]?.name) {
            setUserIdentity(identitiesData.identities[0].name);
            setLoadingIdentity(false);
            return;
          }
        }
      }
      
      // Fallback: try profile endpoint for username
      const profileResponse = await fetch(`https://us-central1-zksscore.cloudfunctions.net/api/api/v1/user/${address}/profile`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('[Popup] User profile data:', profileData);
        
        if (profileData.success && profileData.data) {
          const profile = profileData.data;
          if (profile.username) {
            setUserIdentity(profile.username);
            setLoadingIdentity(false);
            return;
          }
        }
      }
      
      setLoadingIdentity(false);
    } catch (error) {
      console.warn('Could not fetch user identity:', error);
      setLoadingIdentity(false);
      // Keep userIdentity as null, will show wallet address instead
    }
  }

  async function checkCurrentProvider() {
    setLoadingProvider(true);
    setError(null);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_PROVIDER'
      });
      
      if (response.success && response.provider) {
        setCurrentProvider(response.provider);
        setIsLoggedIn(response.isLoggedIn);
      } else {
        setCurrentProvider(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking provider:', error);
      setError('Failed to check provider. Please refresh the page.');
    } finally {
      setLoadingProvider(false);
    }
  }

  async function loadSnapshots(address: string) {
    setLoadingSnapshots(true);
    setError(null);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LIST_SNAPSHOTS',
        userAddress: address
      });
      
      if (response.success && response.snapshots) {
        setSnapshots(response.snapshots);
      } else {
        setSnapshots([]);
        if (response.error) {
          console.warn('Error loading snapshots:', response.error);
        }
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
      setError('Failed to load snapshots. Please try again.');
    } finally {
      setLoadingSnapshots(false);
    }
  }

  // Snapshot creation removed - only overlay should create snapshots
  // This ensures all requirements are properly checked before creation

  function handleConnectWallet() {
    // Open dashboard in new tab for wallet connection
    chrome.tabs.create({
      url: 'https://app.anylayer.org/dashboard'
    });
  }

  function handleDisconnect() {
    // Clear wallet address from storage
    chrome.storage.local.remove('userAddress', () => {
      setUserAddress(null);
      setUserIdentity(null);
      setSnapshots([]);
      // Notify dashboard to disconnect (if open)
      chrome.tabs.query({ url: 'https://app.anylayer.org/*' }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'DISCONNECT_WALLET' });
        }
      });
    });
  }

  return (
    <div style={{ width: '400px', padding: '20px', fontFamily: 'system-ui' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>
        AnyLayer zkTLS Snapshot
      </h1>

      {!userAddress ? (
        // IMPROVED: Better UI when wallet not connected
        <div style={{ textAlign: 'center', padding: '30px 20px' }}>
          {/* Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px'
          }}>
            🔐
          </div>
          
          {/* Title */}
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '12px'
          }}>
            Connect Your Wallet
          </h2>
          
          {/* Description */}
          <p style={{
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.6',
            marginBottom: '24px'
          }}>
            Connect your wallet to create privacy-preserving snapshots of your Web2 profiles and verify your digital identity.
          </p>
          
          {/* Features list */}
          <div style={{
            textAlign: 'left',
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '13px', color: '#495057', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#28a745', fontSize: '16px' }}>✓</span>
              <span>Verify Twitter, LinkedIn, YouTube profiles</span>
            </div>
            <div style={{ fontSize: '13px', color: '#495057', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#28a745', fontSize: '16px' }}>✓</span>
              <span>Prove KYC from exchanges (Binance, Coinbase)</span>
            </div>
            <div style={{ fontSize: '13px', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#28a745', fontSize: '16px' }}>✓</span>
              <span>Data stays local • Zero-knowledge proofs</span>
            </div>
          </div>
          
          {/* Connect button */}
          <button
            onClick={handleConnectWallet}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Connect Wallet
          </button>
          
          {/* Help text */}
          <p style={{
            fontSize: '11px',
            color: '#adb5bd',
            marginTop: '16px',
            lineHeight: '1.4'
          }}>
            You'll be redirected to the dashboard to connect your wallet securely.
          </p>
        </div>
      ) : (
        <div>
          {/* Error message */}
          {error && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#856404', 
                  margin: 0, 
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  Error
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#856404', 
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.5'
                }}>
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: 'transparent',
                    border: '1px solid #856404',
                    borderRadius: '4px',
                    color: '#856404',
                    cursor: 'pointer'
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e9ecef' }}>
            <div style={{ flex: 1 }}>
              {loadingIdentity ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e9ecef',
                    borderTopColor: '#007bff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                    Loading identity...
                  </p>
                </div>
              ) : userIdentity ? (
                <>
                  <p style={{ fontSize: '18px', color: '#007bff', margin: 0, fontWeight: '700', marginBottom: '4px', lineHeight: '1.2' }}>
                    {userIdentity}
                  </p>
                  <p style={{ fontSize: '11px', color: '#666', margin: 0, fontWeight: 'normal' }}>
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '16px', color: '#333', margin: 0, fontWeight: '600' }}>
                  {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </p>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              title="Disconnect Wallet"
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                transition: 'all 0.2s',
                marginLeft: '12px',
                boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#c82333';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc3545';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.2)';
              }}
            >
              Disconnect
            </button>
          </div>

          {/* How to create snapshots section */}
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>📌</span>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#495057',
                margin: 0
              }}>
                How to create snapshots:
              </h3>
            </div>
            <ol style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '13px',
              color: '#495057',
              lineHeight: '1.8'
            }}>
              <li style={{ marginBottom: '8px' }}>
                Go to <strong>app.anylayer.org/dashboard</strong>
              </li>
              <li style={{ marginBottom: '8px' }}>
                Click <strong>"Improve Trust Score"</strong> button
              </li>
              <li>
                Select a provider → Overlay will open on provider page
              </li>
            </ol>
          </div>

          {loadingProvider ? (
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e9ecef',
                borderTopColor: '#007bff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}></div>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                Checking provider...
              </p>
            </div>
          ) : currentProvider ? (
            <div style={{ 
              marginBottom: '20px',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: `1px solid ${isLoggedIn ? '#28a745' : '#ffc107'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>
                  {isLoggedIn ? '✅' : '⚠️'}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    Provider: <strong style={{ textTransform: 'capitalize' }}>{currentProvider}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                    Status: {isLoggedIn ? 'Logged in' : 'Not logged in'}
                  </p>
                </div>
              </div>
              
              {!isLoggedIn && (
                <p style={{ 
                  margin: '12px 0 0 0', 
                  fontSize: '12px', 
                  color: '#856404',
                  padding: '8px',
                  background: '#fff3cd',
                  borderRadius: '4px'
                }}>
                  ⚠️ Please log in to {currentProvider} to create snapshots via the overlay.
                </p>
              )}
            </div>
          ) : (
            <div style={{ 
              marginBottom: '20px',
              padding: '16px',
              background: '#fff3cd',
              borderRadius: '8px',
              border: '1px solid #ffc107'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>ℹ️</span>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#856404' }}>
                  No Provider Detected
                </p>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#856404', lineHeight: '1.5' }}>
                Navigate to a supported provider (Twitter, LinkedIn, Binance, etc.) to create snapshots.
              </p>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📸</span>
                <h2 style={{ fontSize: '14px', margin: 0, fontWeight: '600' }}>Your Snapshots</h2>
              </div>
              {loadingSnapshots && (
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid #e9ecef',
                  borderTopColor: '#007bff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
              )}
            </div>
            {loadingSnapshots ? (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                Loading snapshots...
              </div>
            ) : snapshots.length === 0 ? (
              <div style={{
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                  No snapshots yet
                </p>
                <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0' }}>
                  Create your first snapshot using the overlay on a provider page
                </p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {snapshots.map((snapshot) => {
                  const hasTLSProof = snapshot.initialProofHash || (snapshot as any).proofHash;
                  const verificationLabel = hasTLSProof ? '✓ TLS-verified' : '⚠️ Simulated';
                  const verificationColor = hasTLSProof ? '#28a745' : '#ffc107';
                  
                  return (
                    <li
                      key={snapshot.snapshotId}
                      style={{
                        padding: '10px',
                        marginBottom: '5px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{snapshot.provider}</strong> - {snapshot.status}
                          <br />
                          <span style={{ color: '#666' }}>
                            Created: {new Date(snapshot.snapshotAt.seconds * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <span style={{ 
                          color: verificationColor, 
                          fontSize: '10px',
                          fontWeight: 'bold',
                          marginLeft: '10px'
                        }}>
                          {verificationLabel}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

