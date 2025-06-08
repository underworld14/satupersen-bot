import { GoogleGenAI } from "@google/genai";
import { env } from "./env-validation.js";
import type { StatsData } from "../types/bot-context.js"; // Added import

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
 * Generate prompt for a personalized motivational summary based on stats and themes.
 */
export function generateMotivationalSummaryPrompt(
  stats: StatsData,
  themes: string, // Comma-separated themes string
  period: "weekly" | "monthly",
  reflectionsSample?: string // Optional: a small sample of recent reflections text
): string {
  const {
    totalDays,
    reflectionCount,
    averageWordsPerDay,
    mostActiveDay,
  } = stats;
  const consistency =
    totalDays > 0 ? Math.round((reflectionCount / totalDays) * 100) : 0;

  let themesText = themes;
  if (!themes || themes.toLowerCase().includes("tidak ada tema") || themes.toLowerCase().includes("belum cukup data")) {
    themesText = "belum ada tema spesifik yang teridentifikasi kali ini";
  }

  let prompt = `Anda adalah seorang motivator dan coach pribadi yang suportif dan cerdas.
Tugas Anda adalah membuat ringkasan motivasi yang personal dan membangkitkan semangat berdasarkan data refleksi pengguna selama ${
    period === "weekly" ? "satu minggu" : "satu bulan"
  } terakhir.

Data Pengguna:
- Periode Analisis: ${totalDays} hari
- Jumlah Refleksi: ${reflectionCount} dari ${totalDays} hari (${consistency}%)
- Rata-rata Kata per Refleksi: ${averageWordsPerDay} kata
- Hari Paling Aktif: ${mostActiveDay || "Belum ada"}
- Tema Umum yang Teridentifikasi: ${themesText}
${
  reflectionsSample
    ? `\nCuplikan Refleksi Terbaru:
---
${reflectionsSample.substring(0, 300)}...
---`
    : ""
}

ATURAN RESPONS:
- Panjang maksimal 100-150 kata.
- Sampaikan dalam 1-2 paragraf yang mengalir.
- Mulai dengan pengakuan atas usaha pengguna, apapun hasilnya.
- Soroti 1-2 aspek positif dari data (konsistensi, kedalaman refleksi jika kata rata-rata tinggi, tema yang konstruktif, dll.).
- Jika ada area yang bisa ditingkatkan (misal konsistensi rendah), sampaikan dengan cara yang suportif dan berikan saran ringan.
- Kaitkan dengan tema yang teridentifikasi jika relevan dan positif.
- Hindari bahasa yang menggurui atau menghakimi.
- Akhiri dengan kalimat yang memotivasi dan mengajak untuk terus bertumbuh.
- Gunakan bahasa Indonesia yang hangat, empatik, dan personal.

Contoh Fokus (pilih salah satu atau kombinasikan):
- Jika konsistensi tinggi: Apresiasi dedikasi dan bagaimana ini membangun pemahaman diri.
- Jika rata-rata kata tinggi: Puji kedalaman refleksi dan wawasan yang mungkin didapat.
- Jika tema positif (misal "Pengembangan Diri", "Syukur"): Tekankan bagaimana fokus ini mendukung pertumbuhan.
- Jika konsistensi rendah tapi ada refleksi: Apresiasi setiap refleksi yang ada dan dorong untuk meningkatkan sedikit demi sedikit.
- Jika tidak ada refleksi: Berikan semangat untuk memulai, sekecil apapun.

Ringkasan Motivasi Personal:`;

  return prompt;
}

/**
 * Generate prompt for theme analysis from a block of reflections
 */
export function generateThemeAnalysisPrompt(reflectionsText: string): string {
  if (!reflectionsText || reflectionsText.trim().length < 50) { // Basic check for minimal content
    return ""; // Or throw an error, indicating not enough text for analysis
  }

  const prompt = `Anda adalah seorang analis data yang sangat baik dalam mengidentifikasi tema-tema utama dari sekumpulan teks refleksi diri.
Tugas Anda adalah membaca teks-teks refleksi berikut, yang dipisahkan oleh "---", dan mengidentifikasi 3-5 tema atau topik yang paling sering muncul atau paling signifikan.

Teks Refleksi:
---
${reflectionsText}
---

ATURAN RESPONS:
- Berikan 3-5 tema utama.
- Setiap tema harus singkat (2-4 kata).
- Format output sebagai daftar tema yang dipisahkan koma. Contoh: "Pekerjaan, Hubungan, Pengembangan Diri, Kesehatan".
- Jika tidak ada tema yang jelas atau teks tidak cukup, jawab dengan "Tidak ada tema yang dapat diidentifikasi secara jelas."
- Fokus pada tema yang berulang atau memiliki dampak emosional yang kuat dalam teks.
- Abaikan detail kecil dan fokus pada gambaran besar.

Tema Utama (pisahkan dengan koma):`;

  return prompt;
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
