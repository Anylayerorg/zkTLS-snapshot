/**
 * Extension popup UI
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { TLSSnapshotDoc } from '../types';

function Popup() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
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
        } else {
          setUserAddress(null);
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

  return (
    <div style={{ width: '400px', padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>
        AnyLayer zkTLS Snapshot
      </h1>

      {!userAddress ? (
        <div>
          <p>Connect your wallet to get started</p>
          <button
            onClick={handleConnectWallet}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            Wallet: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </p>

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

