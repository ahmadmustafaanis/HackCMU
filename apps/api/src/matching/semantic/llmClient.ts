import { GoogleGenAI } from "@google/genai";
import type { LlmClient, SemanticParseResult } from "shared-types";
import { SEMANTIC_PARSE_JSON_SCHEMA, SemanticParseSchema } from "./llmSchema.js";

/** Short, narrow system instruction: the model's only job is extracting a
 * structured `{canonicalActivity, category, tags, confidence}` guess for a
 * short activity phrase against a controlled taxonomy. It must never rank,
 * score, schedule, or reason about location — see matching/CLAUDE.md. */
const SYSTEM_INSTRUCTION =
  "You extract a single structured activity classification from a short free-text " +
  "phrase describing what a student wants to do on campus (e.g. \"wanna hoop\", " +
  "\"study sesh l8r\"). Given the phrase, respond with your best guess for: " +
  "canonicalActivity (a short lowercase kebab/plain id naming the specific activity), " +
  "category (a short lowercase id naming its general category), tags (a small list of " +
  "relevant lowercase descriptive tags), and confidence (0-1, how sure you are). " +
  "Only classify the activity itself — never rank, score, schedule, or reason about " +
  "location or other candidates.";

/** The SemanticParser's only real-API touchpoint. Throws on any failure —
 * a missing/invalid API key, a network error, a malformed or non-conforming
 * response — so that SemanticParser (the only caller) can catch it and fall
 * back gracefully instead of this class swallowing errors itself. */
export class GeminiLlmClient implements LlmClient {
  private readonly client: GoogleGenAI;
  private readonly modelId: string;

  constructor(
    apiKey: string | undefined = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
    modelId: string = process.env.GEMINI_MODEL_ID ?? "gemini-3.6-flash"
  ) {
    this.client = new GoogleGenAI({ apiKey });
    this.modelId = modelId;
  }

  async parseActivityText(normalizedText: string): Promise<SemanticParseResult> {
    const response = await this.client.models.generateContent({
      model: this.modelId,
      contents: [{ role: "user", parts: [{ text: normalizedText }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: SEMANTIC_PARSE_JSON_SCHEMA,
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("GeminiLlmClient: empty response from model");
    }

    const parsed: unknown = JSON.parse(text);
    return SemanticParseSchema.parse(parsed);
  }
}
