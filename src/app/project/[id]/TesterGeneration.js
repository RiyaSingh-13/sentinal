'use client';

import { useState } from 'react';

export default function TesterGeneration({ projectId, initialTester, initialRequirements, initialRisks }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [tester, setTester] = useState(initialTester);
  const [requirements, setRequirements] = useState(initialRequirements || []);
  const [risks, setRisks] = useState(initialRisks || []);

  const generateTester = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate tester');
      }
      
      // Reload the page to get the updated DB records
      window.location.reload();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  if (!tester) {
    return (
      <section style={{ marginTop: '2rem', backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>Specialized Tester</h2>
        <p>This project does not have a specialized AI tester yet.</p>
        <button 
          onClick={generateTester} 
          disabled={loading}
          style={{ padding: '0.8rem 1.5rem', marginTop: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Generating Tester Profile (Using AI)...' : 'Generate Specialized Tester'}
        </button>
        {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}
      </section>
    );
  }

  return (
    <section style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Tester Profile */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>Tester: {tester.name}</h2>
        <p><strong>Purpose:</strong> {tester.purpose}</p>
        
        <div style={{ marginTop: '1rem' }}>
          <strong>Target Workflows:</strong>
          <ul>
            {JSON.parse(tester.targetWorkflows).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <strong>Strategies:</strong>
          <ul>
            {JSON.parse(tester.strategies).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      {/* Requirements */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Extracted Requirements</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)', textAlign: 'left' }}>
              <th>ID</th>
              <th>Description</th>
              <th>Expected</th>
              <th>Criticality</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map(req => (
              <tr key={req.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.5rem 0' }}>{req.requirementId}</td>
                <td>{req.description}</td>
                <td>{req.expected}</td>
                <td>
                  <span style={{ 
                    color: req.criticality === 'HIGH' || req.criticality === 'CRITICAL' ? 'var(--danger)' : 
                           req.criticality === 'MEDIUM' ? 'orange' : 'var(--success)'
                  }}>
                    {req.criticality}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risks */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Identified Risks</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)', textAlign: 'left' }}>
              <th>Risk</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Requirement</th>
            </tr>
          </thead>
          <tbody>
            {risks.map(risk => (
              <tr key={risk.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.5rem 0' }}>{risk.description}</td>
                <td>{risk.type}</td>
                <td>
                  <span style={{ 
                    color: risk.severity === 'HIGH' || risk.severity === 'CRITICAL' ? 'var(--danger)' : 
                           risk.severity === 'MEDIUM' ? 'orange' : 'var(--success)'
                  }}>
                    {risk.severity}
                  </span>
                </td>
                <td>{risk.requirement?.requirementId || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </section>
  );
}
