import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const wsUrl = searchParams.get('wsUrl');
  const baseUrl = searchParams.get('baseUrl');

  if (!projectId || !wsUrl || !baseUrl) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const script = `
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const PROJECT_ID = "${projectId}";
const WS_URL = "${wsUrl}";
const BASE_URL = "${baseUrl}";

async function bootstrap() {
  console.log('\\n[Sentinel Bootstrapper] Initializing secure connection to Admin...');
  
  const tmpDir = path.join(os.tmpdir(), 'sentinel-agent-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  process.chdir(tmpDir);
  console.log('[Sentinel Bootstrapper] Created temporary secure workspace: ' + tmpDir);

  // 1. Install ws dependency if not native
  console.log('[Sentinel Bootstrapper] Setting up dependencies (ws)...');
  fs.writeFileSync('package.json', JSON.stringify({ dependencies: { ws: '^8.0.0' } }));
  execSync('npm install', { stdio: 'ignore' });

  // 2. Fetch the core agent logic
  console.log('[Sentinel Bootstrapper] Downloading Agent Core...');
  const res = await fetch(BASE_URL + '/agent-client.js');
  if (!res.ok) throw new Error('Failed to download agent logic');
  const code = await res.text();
  fs.writeFileSync('client.js', code);

  // 3. Execute
  console.log('[Sentinel Bootstrapper] Starting Agent Engine...\\n');
  const { connectToSentinel } = require(path.join(tmpDir, 'client.js'));
  connectToSentinel(PROJECT_ID, WS_URL);
}

bootstrap().catch(err => {
  console.error('[Sentinel Bootstrapper] Fatal Error:', err.message);
  process.exit(1);
});
  `;

  return new NextResponse(script, {
    headers: { 'Content-Type': 'application/javascript' }
  });
}
