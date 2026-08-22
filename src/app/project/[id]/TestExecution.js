'use client';

import { useState, useEffect } from 'react';

export default function TestExecution({ projectId, initialTestSpecs }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  // Deep Testing States
  const [instruction, setInstruction] = useState('');
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepResult, setDeepResult] = useState(null);
  const [deepError, setDeepError] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (projectId) {
      setCategoriesLoading(true);
      fetch('/api/suggest-deep-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.categories) setCategories(data.categories);
        setCategoriesLoading(false);
      })
      .catch(err => {
        console.error("Failed to load categories:", err);
        setCategoriesLoading(false);
      });
    }
  }, [projectId]);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('/api/execute-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute tests');
      }
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const runDeepTest = async (overrideInstruction = null) => {
    const finalInstruction = overrideInstruction || instruction;
    if (!finalInstruction) return;
    
    if (overrideInstruction) {
      setInstruction(overrideInstruction);
    }

    setDeepLoading(true);
    setDeepError(null);
    setDeepResult(null);

    try {
      const res = await fetch('/api/execute-agent-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, instruction: finalInstruction })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deep test failed');
      
      setDeepResult(data.result);
    } catch (e) {
      setDeepError(e.message);
    }
    setDeepLoading(false);
  };

  return (
    <section style={{ marginTop: '2rem', backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>Dynamic Test Execution</h2>
      <p>Sentinel will now take the Tester Strategy, dynamically generate specific HTTP attacks/tests, and execute them in real-time against the live application.</p>
      
      <button 
        onClick={runTests} 
        disabled={loading}
        style={{ padding: '0.8rem 1.5rem', marginTop: '1rem', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: 'var(--primary)' }}
      >
        {loading ? 'Attacking Target (Executing Tests)...' : 'Run Tests'}
      </button>
      
      {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}

      {results && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Execution Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {results.map((r, i) => (
              <div key={i} style={{ padding: '1rem', border: '1px solid var(--surface-border)', borderRadius: '4px', borderLeft: `4px solid ${r.execution.status === 'PASSED' ? 'var(--success)' : 'var(--danger)'}` }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{r.spec.objective}</h4>
                <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>
                  <strong>Scenario:</strong> {r.spec.inputScenario} <br/>
                  <strong>Expected:</strong> {r.spec.expected}
                </div>
                <div style={{ fontSize: '0.9rem', backgroundColor: '#000', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
                  <span style={{ color: r.execution.status === 'PASSED' ? 'var(--success)' : 'var(--danger)' }}>
                    [{r.execution.status}]
                  </span> 
                  <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>
                    {r.execution.actualOutput}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deep Interactive Testing Section */}
      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-border)' }}>
        <h3>Deep Agent-Driven Testing</h3>
        <p>Instruct the Sentinel Agent to perform a specific terminal check (e.g. "Run npm audit to check for security vulnerabilities"). Sentinel will formulate a command and ask for approval in your terminal.</p>
        
        {categoriesLoading && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#1e1e1e', borderRadius: '8px', color: '#888' }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>AI is mapping testing domains for your project...</span>
          </div>
        )}

        {/* Drill-down Categories */}
        {!deepLoading && !deepResult && categories.length > 0 && !categoriesLoading && (
          <div style={{ marginTop: '1.5rem', backgroundColor: '#1e1e1e', padding: '1.5rem', borderRadius: '8px' }}>
            {!selectedCategory ? (
              <>
                <h4 style={{ margin: '0 0 1rem 0' }}>Select a testing domain:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {categories.map((cat, i) => (
                    <button 
                      key={i}
                      onClick={() => setSelectedCategory(cat)}
                      style={{ padding: '0.8rem 1.2rem', borderRadius: '4px', border: '1px solid var(--primary)', backgroundColor: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
                      title={cat.description}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <button onClick={() => setSelectedCategory(null)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', padding: 0 }}>← Back</button>
                  <h4 style={{ margin: 0, color: 'var(--primary)' }}>{selectedCategory.name} Tests</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedCategory.subOptions.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => runDeepTest(opt)}
                      style={{ padding: '0.8rem', textAlign: 'left', borderRadius: '4px', border: '1px solid var(--surface-border)', backgroundColor: '#000', color: 'white', cursor: 'pointer' }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <input 
            type="text" 
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runDeepTest()}
            placeholder="Or type a custom specific instruction... (e.g. 'Read package.json')"
            style={{ flex: 1, padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--surface-border)', backgroundColor: '#1e1e1e', color: 'white' }}
          />
          <button 
            onClick={() => runDeepTest()} 
            disabled={deepLoading || !instruction}
            style={{ padding: '0.8rem 1.5rem', cursor: (deepLoading || !instruction) ? 'not-allowed' : 'pointer', backgroundColor: 'purple', color: 'white' }}
          >
            {deepLoading ? 'Processing...' : 'Send Custom Instruction'}
          </button>
        </div>

        {deepError && <p style={{ color: 'var(--danger)', marginTop: '1rem', padding: '1rem', border: '1px solid var(--danger)', borderRadius: '4px' }}><strong>Error:</strong> {deepError}</p>}

        {/* Final Result */}
        {deepResult && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#000', borderRadius: '8px', border: '1px solid purple' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'purple' }}>Sentinel Evaluation</h4>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: '1.5' }}>
              {deepResult}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
