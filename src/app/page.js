'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyze(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.target);
    const url = formData.get('url');
    const github = formData.get('github');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, github })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze project');
      }
      
      const data = await response.json();
      router.push(`/project/${data.projectId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>SENTINEL</h1>
      <p style={{ color: 'var(--foreground)', opacity: 0.8, marginBottom: '3rem' }}>
        Find where your AI project fails.
      </p>

      <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Live Project URL
          </label>
          <input 
            type="url" 
            name="url" 
            placeholder="https://your-project.com" 
            required 
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            GitHub Repository
          </label>
          <input 
            type="url" 
            name="github" 
            placeholder="https://github.com/user/repo" 
            required 
          />
        </div>
        
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            fontSize: '1.1rem',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'ANALYZING...' : 'ANALYZE PROJECT'}
        </button>
      </form>
    </main>
  );
}
