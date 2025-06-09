# 📘 PRD Final – Satupersen (Refleksi Harian via Telegram Bot)

## 🎯 Tujuan Aplikasi

**Satupersen** adalah Telegram bot refleksi diri harian yang membantumu berkembang **1% setiap hari**, dengan cara:

- Mencatat aktivitas/refleksi harian secara manual.
- Menganalisis dan meringkas refleksi menggunakan AI.
- Membandingkan refleksi 3 hari terakhir untuk melihat perkembangan.
- Memberikan saran dan motivasi harian.
- Melihat statistik ringkasan dalam seminggu atau sebulan terakhir.
- Melacak kesejahteraan emosional pengguna melalui `moodScore`.

---

## 🛠 Tech Stack

| Layer          | Teknologi                                       |
| -------------- | ----------------------------------------------- |
| Runtime        | Bun                                             |
| ORM            | Prisma ORM                                      |
| Database       | PostgreSQL                                      |
| Bot Framework  | Telegraf.js                                     |
| AI Integration | **Google Gemini Flash** via `@google/genai` SDK |
| Bahasa         | 🇮🇩 Bahasa Indonesia                             |
| Konfigurasi AI | `.env` (nama model & API key)                   |

### 📂 Contoh `.env`:

```env
GOOGLE_AI_MODEL_NAME=gemini-1.5-flash
GOOGLE_API_KEY=your_google_api_key_here
```

---

## ✨ Fitur moodScore

`moodScore` adalah sebuah skor numerik dari 1 hingga 100 yang merepresentasikan suasana hati atau kondisi emosional pengguna pada hari tertentu.

**Bagaimana `moodScore` dihasilkan?**
Skor ini dihasilkan secara otomatis oleh AI (Google Gemini Flash) berdasarkan analisis teks refleksi harian yang ditulis oleh pengguna. AI akan mengevaluasi sentimen dan konten refleksi untuk menentukan skor yang paling sesuai.

**Tujuan `moodScore`:**
- Memberikan ukuran kuantitatif terhadap suasana hati harian.
- Membantu AI memahami tren emosional pengguna dari waktu ke waktu, sehingga dapat memberikan respon yang lebih personal dan relevan.
- Membantu pengguna menyadari pola suasana hatinya.

**Penyimpanan `moodScore`:**
Setiap `moodScore` akan disimpan dalam database dan terhubung dengan catatan refleksi harian masing-masing pengguna.

---

## 📱 Telegram Bot Commands

| Command    | Fungsi                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| `/start`   | Memulai bot dan menyapa pengguna                                       |
| `/reflect` | Menginput refleksi harian (manual)                                     |
| `/summary` | Menampilkan ringkasan refleksi hari ini (termasuk `moodScore`)         |
| `/stats`   | Melihat statistik mingguan/bulanan (termasuk info `moodScore`)         |
| `/help`    | Menampilkan panduan singkat penggunaan bot                             |

---

## 🔁 Alur Refleksi

1. Pengguna menjalankan `/reflect`.
2. Bot meminta input aktivitas harian.
3. Setelah pengguna mengetik, bot mengambil 2 refleksi sebelumnya (jika ada).
4. Bot membentuk prompt refleksi 3 hari ke Gemini.
5. Hasil AI dikirim ke pengguna dan disimpan ke database.

---

## 🧠 Prompt AI – Refleksi Harian 3 Hari

```txt
Kamu adalah asisten refleksi harian untuk membantuku berkembang 1% setiap hari.

Berikut refleksi saya selama 3 hari:

📅 Dua Hari Lalu:
{{refleksi_2_hari_lalu}}

📅 Kemarin:
{{refleksi_kemarin}}

📅 Hari Ini:
{{refleksi_hari_ini}}

Tolong bantu:
1. Ringkasan hari ini
2. Perbandingan perkembangan dari dua hari sebelumnya
3. Hal positif dan yang bisa ditingkatkan
4. Saran untuk hari esok
5. Motivasi singkat
6. `moodScore` (skor 1-100 berdasarkan analisis sentimen refleksi hari ini)

Gunakan gaya bahasa yang ringan, positif, dan membangun semangat.
```

---

## 📊 Command `/stats` – Rangkuman Perkembangan

### Fungsionalitas:

- Menampilkan ringkasan selama 7 hari atau 30 hari terakhir jika diminta.
- Format ringkasan meliputi:

  - Jumlah hari input
  - Topik paling sering muncul (opsional)
  - Rata-rata `moodScore`
  - Tren `moodScore` (misalnya: meningkat, menurun, stabil)
  - Refleksi paling menonjol
  - Motivasi mingguan

### Contoh Balasan `/stats`:

```txt
📊 Statistik Refleksi Mingguan:

🗓 Jumlah hari tercatat: 6 dari 7
😊 Rata-rata `moodScore`: 75
📈 Tren `moodScore`: Meningkat
🔥 Kebiasaan dominan: Menulis jurnal, olahraga pagi
💡 Perkembangan: Kamu mulai lebih konsisten dari pertengahan minggu
✨ Refleksi terbaik: Hari ke-4 saat kamu menyelesaikan tugas besar
🚀 Tetap semangat! “Kemajuan kecil setiap hari membangun masa depan luar biasa.”
```

---

### ✨ Peningkatan Konteks AI dengan `moodScore` Rata-Rata

Untuk meningkatkan kualitas interaksi dan relevansi saran dari AI, bot akan menghitung rata-rata `moodScore` pengguna secara mingguan dan bulanan. Informasi rata-rata `moodScore` ini akan disertakan dalam prompt ke AI (selain refleksi harian). Dengan adanya data tren emosional jangka panjang ini, AI diharapkan dapat memberikan respons yang lebih empatik, personal, dan memahami konteks pengguna secara lebih mendalam.

---

## 🧑‍💻 Struktur Database (Prisma)

### `User`

```ts
model User {
  id          String        @id @default(uuid())
  telegramId  String        @unique
  reflections Reflection[]
  createdAt   DateTime      @default(now())
}
```

### `Reflection`

```ts
model Reflection {
  id        String   @id @default(uuid())
  userId    String
  date      DateTime @default(now())
  input     String
  summary   Json
  moodScore Int? // Skor suasana hati (1-100), opsional jika AI tidak dapat menghasilkan
  User      User     @relation(fields: [userId], references: [id])
}
```

---

## 🤖 Pseudocode Refleksi Harian

```ts
bot.command("/reflect", async (ctx) => {
  const userId = await getOrCreateUser(ctx.from.id);

  ctx.reply("Apa saja yang kamu lakukan hari ini?");
  bot.once("text", async (ctx) => {
    const inputToday = ctx.message.text;

    const [yesterday, twoDaysAgo] = await getLastReflections(userId, 2);
    const prompt = generatePrompt({
      hari_ini: inputToday,
      kemarin: yesterday?.input,
      dua_hari_lalu: twoDaysAgo?.input,
    });

    const model = new GoogleAI(process.env.GOOGLE_API_KEY).getGenerativeModel({
      model: process.env.GOOGLE_AI_MODEL_NAME,
    });
    const aiResponse = await model.generateContent(prompt);

    await prisma.reflection.create({
      data: {
        userId,
        input: inputToday,
        summary: aiResponse.text(),
      },
    });

    ctx.reply(aiResponse.text());
  });
});
```
