import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { env } from "../utils/env-validation.js"; // Assuming env-validation exports GOOGLE_API_KEY and GOOGLE_AI_MODEL_NAME

// Initialize the AI client directly here for more control over model parameters if needed,
// or reuse a generic client if available and suitable.
// The existing aiClient in ai-client.ts might have default settings not ideal for this task.
const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: env.GOOGLE_AI_MODEL_NAME,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ],
  generationConfig: {
    temperature: 0.2, // Lower temperature for more deterministic score
    maxOutputTokens: 10, // Expecting a short numerical answer
    topP: 0.1,
    topK: 1,
  }
});

/**
 * Calculates the mood score for a given reflection text using AI.
 *
 * @param reflectionText The text of the user's reflection.
 * @returns A promise that resolves to a number between 1 and 100, or null if parsing fails or an error occurs.
 */
export async function calculateMoodScore(reflectionText: string): Promise<number | null> {
  const prompt = `Analisis sentimen teks berikut dan berikan skor suasana hati (moodScore) antara 1 dan 100.
Skor 1 menunjukkan suasana hati yang sangat negatif, 50 netral, dan 100 sangat positif.
Hanya kembalikan angka skornya saja. Tidak ada teks tambahan.

Teks Refleksi:
"${reflectionText}"

moodScore:`;

  try {
    console.log(`[MoodService] Sending prompt to AI for mood score: ${reflectionText.substring(0,50)}...`);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log(`[MoodService] AI response for mood score: "${text}"`);

    if (!text) {
      console.warn("[MoodService] AI returned no text for mood score.");
      return null; // Or a default score like 50
    }

    // Attempt to parse the first continuous sequence of digits
    const match = text.match(/\d+/);
    if (match) {
      const score = parseInt(match[0], 10);
      if (!isNaN(score) && score >= 1 && score <= 100) {
        console.log(`[MoodService] Parsed mood score: ${score}`);
        return score;
      } else {
        console.warn(`[MoodService] Parsed score out of range or NaN: ${score}. Raw text: "${text}"`);
        return null; // Or a default score
      }
    } else {
      console.warn(`[MoodService] Could not parse mood score from AI response: "${text}"`);
      return null; // Or a default score
    }
  } catch (error) {
    console.error("[MoodService] Error calculating mood score:", error);
    // Check if the error is due to safety settings
    if (error.message && error.message.includes("SAFETY")) {
        console.warn("[MoodService] AI content generation blocked due to safety settings.");
        // Potentially return a neutral score or specific indicator
        return 50; // Neutral score if blocked
    }
    return null; // Or rethrow, or return a default
  }
}
