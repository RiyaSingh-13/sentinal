import { GoogleGenAI } from '@google/genai';
import { callGroq } from '../groq/client.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function analyzeProjectData(liveData, repoFiles, repoHistory) {
  const prompt = `
You are Sentinel, an advanced AI project analyzer.
I am providing you with information about a project from its Live URL, GitHub repository files, and Git history.

Live URL Data:
${JSON.stringify(liveData, null, 2)}

Repository Files (Sample):
${repoFiles.slice(0, 50).join('\n')}

Repository History (Last 50 commits):
${repoHistory}

Based on this information, generate a structured Project Profile.
Respond ONLY with a valid JSON object matching this schema, without markdown formatting:
{
  "title": "Project Name",
  "type": "e.g., Voice customer-support AI, Chatbot, Fintech API",
  "purpose": "A short summary of what the project does",
  "mainFeatures": ["feature 1", "feature 2"],
  "aiComponents": ["component 1"],
  "tools": ["tool 1"],
  "externalServices": ["service 1"]
}
`;

  const parseResponse = (rawText, provider) => {
    const text = (rawText || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    if (!text) throw new Error(`${provider} returned an empty response`);
    try {
      return JSON.parse(text);
    } catch (err) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw err;
    }
  };

  let geminiError;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });

    return parseResponse(response.text, 'Gemini');
  } catch (error) {
    geminiError = error;
    console.warn('Gemini Project Understanding failed; attempting Groq fallback:', error.message);
  }

  try {
    const groqResponse = await callGroq(
      'You are Sentinel, an advanced AI project analyzer. Respond ONLY with a valid JSON object matching the requested schema.',
      prompt,
      true
    );
    return parseResponse(groqResponse, 'Groq');
  } catch (groqError) {
    console.error('Groq Project Understanding fallback failed:', groqError);
    throw new Error(`Failed to analyze project data: Gemini (${geminiError?.message}), Groq (${groqError.message})`);
  }
}
