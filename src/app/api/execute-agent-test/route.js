import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.6-flash';

export async function POST(request) {
  try {
    const { projectId, instruction } = await request.json();

    if (!projectId || !instruction) {
      return NextResponse.json({ error: 'Project ID and instruction required' }, { status: 400 });
    }

    const session = await prisma.agentSession.findFirst({
      where: { projectId, status: 'CONNECTED' },
      orderBy: { startedAt: 'desc' }
    });

    if (!session) {
      return NextResponse.json({ error: 'No active agent session found. Ensure Sentinel Agent is running in target terminal.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { profile: true }
    });

    // 1. Planning Phase (One LLM Call)
    const planPrompt = `
You are the Sentinel Batch Execution Planner. The Admin wants to perform a deep terminal-side test via the Sentinel Agent.
Instruction: "${instruction}"

You have full context of the target's workspace.
Project Profile: ${JSON.stringify(project.profile)}
Context Dump (OS, files, package.json): ${session.contextDump || 'Not available'}

Based on this complete context, formulate an exact, precise sequence of actions (maximum 3 actions) to execute this test.
You DO NOT need to explore or read files, because you already have the context.

CRITICAL RULES FOR TESTING:
1. NO FAKE TESTS: Do NOT write "mock" functions or test your own hallucinated code.
2. BLACK-BOX TESTING ONLY: You must test the real application externally. If writing a script, it must test the application by sending HTTP requests (fetch/curl) to the running local server (e.g., http://localhost:3000), or by running standard terminal commands (e.g. npm audit, nmap).
3. If you cannot realistically test the specific internal logic via black-box methods, simply output a script that does a basic health check and gracefully passes. Never fabricate failures.

Allowed actions:
1. write_file: Writes a test script or config. args: { "filePath": "...", "content": "..." }
2. execute_command: Runs a terminal command. args: { "command": "..." }

Output MUST be ONLY valid JSON matching this schema exactly, with NO markdown formatting:
WARNING: You must properly escape all internal double quotes inside string values!
{
  "actions": [
    {
      "action": "write_file | execute_command",
      "args": { "command": "...", "filePath": "...", "content": "..." },
      "reason": "Explain to the target terminal user why you are running this"
    }
  ]
}
`;

    const planRes = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: planPrompt,
      config: { temperature: 0.1, responseMimeType: "application/json" }
    });
    
    let planText = (planRes.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const plan = JSON.parse(planText);

    // 2. Batch Execution Phase
    let executionLogs = '';
    for (let i = 0; i < plan.actions.length; i++) {
      const step = plan.actions[i];
      
      const reqRecord = await prisma.permissionRequest.create({
        data: {
          sessionId: session.id,
          capability: step.action,
          reason: JSON.stringify({ reason: step.reason, args: step.args }),
          status: 'PENDING'
        }
      });

      let finalReq = null;
      let attempts = 0;
      while (attempts < 60) {
        await new Promise(r => setTimeout(r, 1000));
        finalReq = await prisma.permissionRequest.findUnique({ where: { id: reqRecord.id } });
        if (finalReq.status === 'APPROVED' || finalReq.status === 'DENIED') {
          break;
        }
        attempts++;
      }

      if (!finalReq || finalReq.status === 'PENDING') {
        return NextResponse.json({ error: `Agent did not respond to action ${i+1} in time.` }, { status: 408 });
      }

      if (finalReq.status === 'DENIED') {
        return NextResponse.json({ result: `Test cancelled: Target terminal user DENIED step ${i+1}: ${step.action}` });
      }

      executionLogs += `Action ${i+1} (${step.action}):\n${finalReq.result}\n\n`;
    }

    // 3. Evaluation Phase (One LLM Call)
    const evalPrompt = `
You are the Sentinel Evaluation Engine.
The admin requested: "${instruction}"
You executed a batch of actions on the target machine.
Execution Logs:
${executionLogs}

Evaluate the result and provide a final answer/finding.
Write it in clean Markdown. Be concise but highly analytical.
`;

    const evalRes = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: evalPrompt,
      config: { temperature: 0.3 }
    });

    return NextResponse.json({ success: true, result: evalRes.text });
  } catch (error) {
    console.error('Execute Agent Test API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
