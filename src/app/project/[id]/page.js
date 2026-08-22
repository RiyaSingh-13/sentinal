import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import AgentConnection from './AgentConnection';
import TesterGeneration from './TesterGeneration';
import TestExecution from './TestExecution';
import RootCauseAnalysis from './RootCauseAnalysis';

const prisma = new PrismaClient();

export default async function ProjectPage({ params }) {
  const { id } = await params;
  
  const project = await prisma.project.findUnique({
    where: { id },
    include: { 
      profile: true,
      tester: true,
      requirements: { orderBy: { createdAt: 'asc' } },
      risks: { include: { requirement: true }, orderBy: { createdAt: 'asc' } }
    }
  });

  if (!project) return notFound();

  const profile = project.profile;

  return (
    <main style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1rem' }}>
      <header style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>{profile?.title || 'Project'}</h1>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--primary)' }}>
          <a href={project.url} target="_blank" rel="noreferrer">Live URL</a>
          <a href={project.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>

      {profile ? (
        <section style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px' }}>
          <h2>Project Understanding</h2>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Type:</strong> {profile.type}
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Purpose:</strong>
            <p>{profile.purpose}</p>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Main Features:</strong>
            <ul>
              {JSON.parse(profile.mainFeatures).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>AI Components:</strong>
            <ul>
              {JSON.parse(profile.aiComponents).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </section>
      ) : (
        <p>Project analysis is incomplete.</p>
      )}

      {/* Deep Connection Module */}
      <AgentConnection projectId={id} />

      {/* Tester Generation Module */}
      <TesterGeneration 
        projectId={id} 
        initialTester={project.tester}
        initialRequirements={project.requirements}
        initialRisks={project.risks}
      />

      {/* Test Execution Module */}
      {project.tester && (
        <TestExecution 
          projectId={id}
          initialTestSpecs={[]}
        />
      )}

      {/* Root Cause & Reporting Module */}
      {project.tester && (
        <RootCauseAnalysis projectId={id} />
      )}

    </main>
  );
}
