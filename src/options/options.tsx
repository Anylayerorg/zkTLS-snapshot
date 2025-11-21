/**
 * Options page UI
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function Options() {
  const [exportData, setExportData] = useState<string>('');

  async function handleExport() {
    try {
      // Get all snapshots from storage
      const all = await chrome.storage.local.get(null);
      const snapshots: any[] = [];
      
      for (const key in all) {
        if (key.startsWith('zktls_snapshot_')) {
          snapshots.push({
            key,
            encrypted: all[key]
          });
        }
      }

      const exportBlob = {
        version: '1.0.0',
        snapshots,
        exportedAt: Date.now()
      };

      setExportData(JSON.stringify(exportBlob, null, 2));
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function handleDownload() {
    if (!exportData) {
      alert('Please export data first');
      return;
    }

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zktls-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>AnyLayer zkTLS Extension - Options</h1>
      
      <section style={{ marginTop: '30px' }}>
        <h2>Backup & Restore</h2>
        <p>Export your encrypted snapshots for backup (strictest privacy mode)</p>
        <button
          onClick={handleExport}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Export Snapshots
        </button>
        
        {exportData && (
          <div style={{ marginTop: '20px' }}>
            <textarea
              readOnly
              value={exportData}
              style={{
                width: '100%',
                height: '200px',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
            />
            <button
              onClick={handleDownload}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Download Backup
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}

