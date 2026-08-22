'use client';

import { useState, useEffect } from 'react';

export default function AgentConnection({ projectId }) {
  const [status, setStatus] = useState({ isConnected: false, session: null });
  const [ipAddress, setIpAddress] = useState('localhost');
  const [loadingReq, setLoadingReq] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/project/${projectId}/agent-status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  const requestCapability = async (capability, reason) => {
    setLoadingReq(true);
    try {
      await fetch('/api/agent/request-capability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, capability, reason })
      });
    } catch (e) {
      console.error(e);
    }
    setLoadingReq(false);
  };

  return (
    <section style={{ marginTop: '2rem', backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>Deep Connection</h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ 
          width: '12px', height: '12px', borderRadius: '50%', 
          backgroundColor: status.isConnected ? 'var(--success)' : 'var(--danger)' 
        }} />
        <strong>{status.isConnected ? 'Sentinel Agent connected.' : 'Waiting for Sentinel Agent...'}</strong>
      </div>

      {status.isConnected ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--success)' }}>
            ✓ Secure WebSocket link established. Sentinel can now securely communicate with the target environment.
          </p>
          <h3>Request Capabilities</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {['inspect_runtime', 'inspect_tools', 'inspect_ai'].map(cap => (
              <button 
                key={cap} 
                onClick={() => requestCapability(cap, `Required to analyze ${cap.split('_')[1]}`)}
                disabled={loadingReq}
                style={{ padding: '0.5rem', fontSize: '0.9rem', backgroundColor: 'var(--surface-border)' }}
              >
                Request {cap}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem', backgroundColor: '#000', padding: '1.5rem', borderRadius: '4px' }}>
          <p style={{ marginTop: 0, fontWeight: 'bold' }}>To connect a Target Machine to this Admin panel, run the following 1-Liner on the target:</p>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: '#ccc' }}>Your Admin IP Address (if remote, enter your local IPv4):</label>
            <input 
              type="text" 
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', backgroundColor: '#1e1e1e', color: 'white', width: '250px' }}
            />
          </div>

          <div style={{ backgroundColor: '#1e1e1e', padding: '1rem', borderRadius: '4px', border: '1px solid var(--primary)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '-10px', left: '10px', backgroundColor: '#000', padding: '0 5px', fontSize: '0.8rem', color: 'var(--primary)' }}>Zero-Dependency Bootstrapper</span>
            <code style={{ color: 'var(--primary)', userSelect: 'all', display: 'block', wordBreak: 'break-all' }}>
              node -e "fetch('http://{ipAddress}:3000/api/bootstrapper?projectId={projectId}&baseUrl=http://{ipAddress}:3000&wsUrl=ws://{ipAddress}:3001').then(r=&gt;r.text()).then(t=&gt;eval(t))"
            </code>
          </div>
          
          <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '1rem' }}>
            * This command will autonomously download the Agent, install its dependencies in a secure temp folder, and connect back to this UI.
          </p>
        </div>
      )}

      {status.session?.permissions?.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3>Capability Requests</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {status.session.permissions.map(req => (
              <li key={req.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                <strong>{req.capability}</strong> - {req.status}
                {req.result && (
                  <pre style={{ fontSize: '0.8rem', background: '#000', padding: '0.5rem', marginTop: '0.5rem' }}>
                    {JSON.stringify(JSON.parse(req.result), null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {status.session?.telemetry?.length > 0 && (
        <div>
          <h3>Live Telemetry</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {status.session.telemetry.map(t => (
              <li key={t.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                <strong>{t.type}</strong>: {t.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
