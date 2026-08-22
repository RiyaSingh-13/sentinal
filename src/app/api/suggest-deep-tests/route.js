import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.6-flash';

export async function POST(request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { profile: true }
    });

    if (!project || !project.profile) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

const prompt = `
You are the Sentinel Intelligence Core. Based on the following Project Profile, comprehensively identify ALL the major aspects and parameters on which this specific project should be tested.
For each major category, provide 3-5 specific sub-tests that the Sentinel Autonomous Agent can execute in the target's terminal.

PROJECT PROFILE:
${JSON.stringify(project.profile, null, 2)}

Output MUST be ONLY valid JSON matching this schema exactly, with NO markdown formatting. Return 5-8 distinct categories.
WARNING: You must properly escape all internal double quotes inside string values (e.g. use \\" for quotes inside descriptions).

{
  "categories": [
    {
      "name": "Category Name (e.g., Security, Architecture, Config)",
      "description": "Short explanation of why this category is critical for this specific project",
      "subOptions": [
        "A highly specific, actionable instruction for the Agent (e.g. 'Audit package.json for known vulnerabilities', 'Check OS identity using whoami', 'Check Next.js API routes')"
      ]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { temperature: 0.3, responseMimeType: "application/json" }
    });

    const text = (response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);

    return NextResponse.json({ categories: data.categories });
  } catch (error) {
    console.error('Suggest Deep Tests Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
