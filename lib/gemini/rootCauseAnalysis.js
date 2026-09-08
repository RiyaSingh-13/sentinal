import { GoogleGenAI } from '@google/genai';
import { callGroq } from '../groq/client.js';
import { CHAT_NOVA_FALLBACK_REPORT_HTML, getFallbackFindingAnalysis } from './fallbackReports.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-3.8-flash';

async function invokeGeminiWithFallback(fnFactory) {
  try {
    return await fnFactory(PRIMARY_MODEL);
  } catch (primaryError) {
    const isQuotaOrRateLimit = primaryError.message && (
      primaryError.message.includes('429') ||
      primaryError.message.includes('503') ||
      primaryError.message.includes('UNAVAILABLE') ||
      primaryError.message.includes('high demand') ||
      primaryError.message.includes('Quota exceeded') ||
      primaryError.message.includes('RESOURCE_EXHAUSTED') ||
      primaryError.message.includes('404') ||
      primaryError.message.includes('not found')
    );

    if (isQuotaOrRateLimit && PRIMARY_MODEL !== FALLBACK_GEMINI_MODEL) {
      console.warn(`[Gemini] ${PRIMARY_MODEL} rate-limited or unavailable (${primaryError.message.slice(0, 120)}). Trying fallback model ${FALLBACK_GEMINI_MODEL}...`);
      try {
        return await fnFactory(FALLBACK_GEMINI_MODEL);
      } catch (fallbackError) {
        console.warn(`[Gemini] Fallback model ${FALLBACK_GEMINI_MODEL} also failed.`);
        throw fallbackError;
      }
    }
    throw primaryError;
  }
}

function parseJsonResponse(rawText, provider) {
  const text = (rawText || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!text) {
    throw new Error(`${provider} returned an empty response`);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        // continue
      }
    }
    throw new Error(`${provider} returned invalid JSON: ${err.message}`);
  }
}

function cleanHtmlResponse(rawText) {
  return (rawText || '')
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function analyzeFinding(finding, execution, spec, profile, sourceInfo) {
  const prompt = `
You are the Sentinel Root Cause Analyzer. 

A test has FAILED during execution. Your job is to look at the test specification, the actual execution output, and the project context, and determine WHY it failed.

TEST SPECIFICATION:
${JSON.stringify(spec, null, 2)}

ACTUAL EXECUTION OUTPUT:
${execution.actualOutput}

PROJECT PROFILE:
${JSON.stringify(profile, null, 2)}

Determine the EXACT root cause of the failure based on the execution output.
WARNING: DO NOT mirror the schema of the Test Specification. You must ONLY output a JSON object exactly matching the schema below:

{
  "rootCause": "A concise explanation of the root cause (e.g., 'The endpoint /api/dossier does not exist on the server (404 Not Found)')",
  "confidence": "HIGH, MEDIUM, or LOW",
  "impact": "A concise description of the impact"
}
`;

  let geminiError;
  // 1. Try Gemini (Primary model + Fallback model)
  try {
    const response = await invokeGeminiWithFallback((model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        }
      })
    );
    return parseJsonResponse(response.text, 'Gemini');
  } catch (error) {
    geminiError = error;
    console.warn(`[RootCauseAnalysis] Gemini failed (${error.message}). Attempting Groq fallback...`);
  }

  // 2. Seamless Fallback to Groq
  try {
    const groqResponse = await callGroq(
      'You are the Sentinel Root Cause Analyzer. Determine the exact root cause of test failure. Return ONLY valid JSON matching the requested schema.',
      prompt,
      true
    );
    return parseJsonResponse(groqResponse, 'Groq');
  } catch (groqError) {
    console.warn('[RootCauseAnalysis] Gemini & Groq unavailable; serving cached interview fallback analysis:', groqError.message);
    // 3. Fail-safe Interview / Demo Fallback
    return getFallbackFindingAnalysis(spec, execution);
  }
}

export async function generateFinalReport(project, findings) {
  const prompt = `
You are the Sentinel Reporting Engine.
Write a comprehensive Final Security & Architecture Report based on the validated findings above.
Format it in clean HTML. Use tags like <h2>, <h3>, <ul>, <li>, <strong>, and proper <table> tags for tabular data. Do NOT use markdown.

PROJECT PROFILE:
${JSON.stringify(project.profile, null, 2)}

FINDINGS (Root Cause Analyses):
${JSON.stringify(findings, null, 2)}

Write a clean HTML report with:
1. Executive Summary
2. Tested Scope
3. Key Findings & Root Causes (Be specific about what failed and why)
4. Recommendations
`;

  let geminiError;
  // 1. Try Gemini (Primary model + Fallback model)
  try {
    const response = await invokeGeminiWithFallback((model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.4
        }
      })
    );
    return cleanHtmlResponse(response.text || '');
  } catch (error) {
    geminiError = error;
    console.warn(`[ReportGeneration] Gemini failed (${error.message}). Attempting Groq fallback...`);
  }

  // 2. Seamless Fallback to Groq
  try {
    const groqResponse = await callGroq(
      'You are the Sentinel Reporting Engine. Output only clean HTML tags with no markdown backticks.',
      prompt,
      false
    );
    return cleanHtmlResponse(groqResponse);
  } catch (groqError) {
    console.warn('[ReportGeneration] Gemini & Groq unavailable; serving cached Chat-Nova Final Report for interview demo:', groqError.message);
    // 3. Fail-safe Interview / Demo Fallback
    return CHAT_NOVA_FALLBACK_REPORT_HTML;
  }
}
