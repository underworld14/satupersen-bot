# 📘 PRD Final – Satupersen (Refleksi Harian via Telegram Bot)

## 🎯 Tujuan Aplikasi

**Satupersen** adalah Telegram bot refleksi diri harian yang membantumu berkembang **1% setiap hari**, dengan cara:

- Mencatat aktivitas/refleksi harian secara manual.
- Menganalisis dan meringkas refleksi menggunakan AI.
- Membandingkan refleksi 3 hari terakhir untuk melihat perkembangan.
- Memberikan saran dan motivasi harian.
- Melihat statistik ringkasan dalam seminggu atau sebulan terakhir.

---

## 🛠 Tech Stack

| Layer          | Teknologi                                               |
| -------------- | ------------------------------------------------------- |
| Runtime        | Bun                                                     |
| ORM            | Prisma ORM                                              |
| Database       | PostgreSQL                                              |
| Bot Framework  | Telegraf.js                                             |
| AI Integration | **Google Gemini Flash** via `@google/generative-ai` SDK |
| Bahasa         | 🇮🇩 Bahasa Indonesia                                     |
| Konfigurasi AI | `.env` (nama model & API key)                           |

### 📂 Contoh `.env`:

```env
GOOGLE_AI_MODEL_NAME=gemini-1.5-flash
GOOGLE_API_KEY=your_google_api_key_here
```

---

## 📱 Telegram Bot Commands

| Command    | Fungsi                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| `/start`   | Memulai bot dan menyapa pengguna                                       |
| `/reflect` | Menginput refleksi harian (manual)                                     |
| `/summary` | Menampilkan ringkasan refleksi hari ini                                |
| `/stats`   | Melihat statistik mingguan/bulanan (opsional berdasarkan ketersediaan) |
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

Gunakan gaya bahasa yang ringan, positif, dan membangun semangat.
```

---

## 📊 Command `/stats` – Rangkuman Perkembangan

### Fungsionalitas:

- Menampilkan ringkasan selama 7 hari atau 30 hari terakhir jika diminta.
- Format ringkasan meliputi:

  - Jumlah hari input
  - Topik paling sering muncul (opsional)
  - Rata-rata mood (jika kelak ditambahkan)
  - Refleksi paling menonjol
  - Motivasi mingguan

### Contoh Balasan `/stats`:

```txt
📊 Statistik Refleksi Mingguan:

🗓 Jumlah hari tercatat: 6 dari 7
🔥 Kebiasaan dominan: Menulis jurnal, olahraga pagi
📈 Perkembangan: Kamu mulai lebih konsisten dari pertengahan minggu
💡 Refleksi terbaik: Hari ke-4 saat kamu menyelesaikan tugas besar
🚀 Tetap semangat! “Kemajuan kecil setiap hari membangun masa depan luar biasa.”
```

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

---

## 📝 Catatan

- Penggunaan AI disederhanakan hanya untuk `reflect` dan `stats`.
- Tidak ada reminder atau notifikasi otomatis.
- Tidak ada ekspor PDF, namun nanti bisa ditambahkan bila aplikasi dipublikasi.
- Fokus untuk penggunaan personal dengan pengalaman Telegram-first.

---

Jika kamu ingin saya bantu generate scaffolding proyek `bun + telegraf + prisma + Google AI SDK`, tinggal bilang, saya bisa bantu siapkan `project template` awalnya.
