import { GoogleGenAI } from "@google/genai";
import { env } from "./env-validation.js";

/**
 * Google Generative AI client instance
 */
export const aiClient = new GoogleGenAI({
  apiKey: env.GOOGLE_API_KEY,
});

/**
 * Generate content using the configured AI model
 */
export async function generateContent(prompt: string): Promise<string> {
  try {
    const response = await aiClient.models.generateContent({
      model: env.GOOGLE_AI_MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 300,
        candidateCount: 1,
      },
    });

    if (!response.text) {
      throw new Error("No text content received from AI model");
    }

    return response.text;
  } catch (error) {
    console.error("❌ AI generation error:", error);
    throw new Error(
      `AI service error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate prompt for reflection analysis
 */
export function generateReflectionPrompt(data: {
  hari_ini: string;
  kemarin?: string | null;
  dua_hari_lalu?: string | null;
}): string {
  const prompt = `Kamu adalah asisten refleksi harian yang membantu berkembang 1% setiap hari.

Refleksi 3 hari:

📅 Dua Hari Lalu: ${data.dua_hari_lalu || "Tidak ada refleksi"}
📅 Kemarin: ${data.kemarin || "Tidak ada refleksi"}
📅 Hari Ini: ${data.hari_ini}

ATURAN RESPONS:
- MAKSIMAL 200 kata total
- Fokus sebagai penutup hari yang memotivasi
- Tangani keluhan/masalah dengan empati dan solusi
- Jangan buat poin-poin terpisah, tulis dalam paragraf mengalir
- Akhiri dengan motivasi singkat (1-2 kalimat)

Format respons:
Mulai dengan apresiasi hari ini (baik achievement maupun tantangan yang dihadapi), kemudian bandingkan dengan hari sebelumnya jika ada, berikan 1 saran praktis untuk besok, dan tutup dengan motivasi.

Gunakan bahasa hangat, empati, dan membangun semangat. Jika ada keluhan/masalah, berikan dukungan moral dan saran konstruktif.`;

  return prompt;
}

/**
 * Test AI connection
 */
export async function testAIConnection(): Promise<boolean> {
  try {
    const testResponse = await generateContent(
      "Test connection. Jawab dengan 'OK' saja."
    );
    console.log("✅ AI connection test successful:", testResponse);
    return true;
  } catch (error) {
    console.error("❌ AI connection test failed:", error);
    return false;
  }
}
