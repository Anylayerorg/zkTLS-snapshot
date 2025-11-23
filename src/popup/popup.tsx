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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check current tab for provider
    checkCurrentProvider();
    
    // Load user address from storage
    const loadUserAddress = () => {
      chrome.storage.local.get('userAddress', (result) => {
        if (result.userAddress) {
          setUserAddress(result.userAddress);
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
    
    // Poll for wallet connection every 2 seconds (fallback)
    const pollInterval = setInterval(loadUserAddress, 2000);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  async function fetchUserIdentity(address: string) {
    try {
      const response = await fetch(`https://us-central1-zksscore.cloudfunctions.net/api/api/v1/user/${address}/profile`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Popup] User profile data:', data);
        // API returns { success: true, data: { username, primaryIdentity, ... } }
        if (data.success && data.data) {
          const profile = data.data;
          if (profile.username) {
            setUserIdentity(profile.username);
          } else if (profile.primaryIdentity?.name) {
            setUserIdentity(profile.primaryIdentity.name);
          } else if (profile.identities && profile.identities.length > 0) {
            setUserIdentity(profile.identities[0].name);
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch user identity:', error);
    }
  }

  async function checkCurrentProvider() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_PROVIDER'
      });
      
      if (response.success && response.provider) {
        setCurrentProvider(response.provider);
        setIsLoggedIn(response.isLoggedIn);
      }
    } catch (error) {
      console.error('Error checking provider:', error);
    }
  }

  async function loadSnapshots(address: string) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LIST_SNAPSHOTS',
        userAddress: address
      });
      
      if (response.success && response.snapshots) {
        setSnapshots(response.snapshots);
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  }

  async function handleCreateSnapshot() {
    if (!currentProvider || !userAddress) {
      alert('Please connect wallet and navigate to a supported provider');
      return;
    }

    setLoading(true);
    try {
      // Get signature from user (would normally come from wallet)
      const signature = prompt('Please sign message with your wallet');
      if (!signature) {
        setLoading(false);
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_SNAPSHOT',
        provider: currentProvider,
        userAddress,
        signature
      });

      if (response.success) {
        // Check if snapshot has TLS verification
        const hasTLSProof = response.initialProofHash || response.proofHash;
        const message = hasTLSProof 
          ? 'Snapshot created successfully! ✓ TLS-verified'
          : 'Snapshot created successfully! ⚠️ Simulated (dev mode only)';
        alert(message);
        loadSnapshots(userAddress);
        checkCurrentProvider();
      } else {
        // Provide helpful error messages
        let errorMsg = response.error || 'Unknown error';
        if (errorMsg.includes('notary') || errorMsg.includes('connection')) {
          errorMsg += '\n\nTip: TLSNotary service may be unavailable. In dev mode, simulated proofs are used.';
        }
        alert(`Error: ${errorMsg}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <p style={{ fontSize: '14px', color: '#333', margin: 0, fontWeight: '600' }}>
              {userIdentity ? (
                <>
                  <span style={{ color: '#007bff' }}>{userIdentity}</span>
                  <br />
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal' }}>
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                </>
              ) : (
                <span>{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span>
              )}
            </p>
            <button
              onClick={handleDisconnect}
              title="Disconnect"
              style={{
                padding: '8px',
                fontSize: '16px',
                backgroundColor: 'transparent',
                color: '#dc3545',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {currentProvider ? (
            <div style={{ marginBottom: '20px' }}>
              <p>
                Provider: <strong>{currentProvider}</strong>
              </p>
              <p>Status: {isLoggedIn ? '✅ Logged in' : '❌ Not logged in'}</p>
              
              {isLoggedIn && (
                <button
                  onClick={handleCreateSnapshot}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: loading ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '10px'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Snapshot'}
                </button>
              )}
            </div>
          ) : (
            <p style={{ color: '#666' }}>
              Navigate to a supported provider (Twitter, Binance, etc.)
            </p>
          )}

          <div style={{ marginTop: '20px' }}>
            <h2 style={{ fontSize: '14px', marginBottom: '10px' }}>Your Snapshots</h2>
            {snapshots.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#666' }}>No snapshots yet</p>
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

