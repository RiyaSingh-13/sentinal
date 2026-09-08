import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { callGroq } from '@/../lib/groq/client';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request) {
  try {
    const { report } = await request.json();

    if (!report) {
      return NextResponse.json({ error: 'Report content is required' }, { status: 400 });
    }

    const prompt = `
You are a helpful AI assistant that explains complex technical security and execution reports to non-technical business owners.
I will provide you with a technical execution report.
Your job is to rewrite this report into very simple, easy-to-understand terms.

Please explain:
1. What was tested (in simple English).
2. If it passed, what does that mean for the business? If it failed, what is the risk?
3. Keep it brief and avoid hard technical jargon (like "Sandbox", "API", "429", "endpoints", "latency").

TECHNICAL REPORT:
${report}

Write the simplified version in clean HTML format. Use tags like <h2>, <ul>, <li>, and <p>. Do NOT use markdown.
`;

    let simplified = '';
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { temperature: 0.5 }
      });
      simplified = response.text || '';
    } catch (geminiError) {
      console.warn('Gemini simplify report failed; attempting Groq fallback:', geminiError.message);
      simplified = await callGroq(
        'You are a helpful AI assistant. Output only clean HTML tags with no markdown backticks.',
        prompt,
        false
      );
    }

    simplified = simplified.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return NextResponse.json({ success: true, simplified });
  } catch (error) {
    console.error('Simplify Report API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
