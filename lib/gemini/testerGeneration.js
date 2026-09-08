import { GoogleGenAI } from '@google/genai';
import { callGroq } from '@/../lib/groq/client';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// We default to gemini-2.5-flash
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function generateTesterProfile(projectProfile, sourceInfo) {
  const prompt = `
You are the Sentinel Intelligence Core. Your task is to analyze the provided Project Profile and Source Information, and autonomously generate a Specialized AI Tester for this exact project. 

The Specialized Tester is an AI agent that will later execute requirement-driven, parameterized, real-world, and edge-case tests against the live application. 

PROJECT PROFILE:
${JSON.stringify(projectProfile, null, 2)}

SOURCE INTELLIGENCE:
${JSON.stringify(sourceInfo, null, 2)}

Based on this information, define the Specialized Tester. 
Output MUST be ONLY valid JSON matching this schema exactly, with NO markdown formatting, NO backticks, and NO explanatory text:

{
  "tester": {
    "name": "A specialized name for this tester (e.g., 'E-Commerce Checkout Assailant')",
    "purpose": "A brief description of this tester's primary directive",
    "targetWorkflows": ["List of core workflows it must test, e.g. 'User Login', 'Payment Processing'"],
    "personas": ["List of realistic user personas it should simulate"],
    "objectives": ["List of main testing objectives"],
    "riskAreas": ["List of identified risk areas based on the profile"],
    "strategies": ["List of testing strategies (e.g., 'Fuzzing input fields', 'Simulating high concurrency')"],
    "adapters": ["List of adapters it will need (e.g., 'Playwright', 'HTTP', 'WebSocket')"]
  },
  "requirements": [
    {
      "requirementId": "REQ-001",
      "description": "The system must...",
      "expected": "Expected behavior",
      "criticality": "HIGH, MEDIUM, or LOW",
      "source": "Inferred from profile/source"
    }
  ],
  "risks": [
    {
      "requirementId": "REQ-001 (optional, can be null)",
      "description": "Potential failure point...",
      "type": "CURRENT or FUTURE",
      "reasons": ["Why this is a risk"],
      "severity": "CRITICAL, HIGH, MEDIUM, or LOW"
    }
  ]
}`;

  const parseResponse = (rawText, provider) => {
    const text = (rawText || '').replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    if (!text) {
      throw new Error(`${provider} returned an empty response`);
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      throw new Error(`${provider} returned invalid tester JSON: ${parseError.message}`);
    }
  };

  let geminiError;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      }
    });

    return parseResponse(response.text, 'Gemini');
  } catch (error) {
    geminiError = error;
    console.error('Gemini tester generation failed; trying Groq fallback:', error);
  }

  try {
    const responseText = await callGroq(
      'You are the Sentinel Intelligence Core. Return only valid JSON.',
      prompt,
      true
    );

    return parseResponse(responseText, 'Groq');
  } catch (groqError) {
    console.error('Groq tester generation fallback failed:', groqError);
    throw new Error(
      `Tester generation failed. Gemini: ${geminiError.message}. Groq fallback: ${groqError.message}`
    );
  }
}
