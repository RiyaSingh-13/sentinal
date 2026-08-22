'use client';

import { useState } from 'react';

export default function RootCauseAnalysis({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const analyzeFindings = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/analyze-findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze findings');
      }
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <section style={{ marginTop: '2rem', backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>Root Cause Analysis & Final Report</h2>
      <p>Sentinel will analyze all FAILED test executions, investigate the root causes by cross-referencing your project profile, and generate a final security report.</p>
      
      <button 
        onClick={analyzeFindings} 
        disabled={loading}
        style={{ padding: '0.8rem 1.5rem', marginTop: '1rem', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: 'var(--primary)' }}
      >
        {loading ? 'Analyzing Root Causes & Generating Report...' : 'Analyze Findings & Generate Report'}
      </button>
      
      {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}

      {report && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: '1.5' }}>
            {report}
          </pre>
        </div>
      )}
    </section>
  );
}
