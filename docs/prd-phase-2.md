# 📘 PRD Phase 2: Enhanced Habit Psychology Integration

## 🎯 Objective

Meningkatkan retensi pengguna sebesar 40% dalam 60 hari melalui implementasi prinsip neurosains pembentukan kebiasaan dan psikologi perilaku yang terbukti efektif.

---

## 🔑 Key Features (Berdasarkan Riset Habit Formation)

### 1. **Streak Visualization \& Maintenance System**

**Riset Dasar:** Studi University College London menunjukkan 66 hari rata-rata untuk membentuk kebiasaan dengan konsistensi

```ts
// Schema tambahan
model User {
  currentStreak Int @default(0)
  longestStreak Int @default(0)
  lastActive DateTime?
}
```

**Implementasi:**

- Kalender visual dalam `/stats` dengan emoji berbeda:
  - 🔥 = Streak aktif
  - ⚡ = Hari dengan moodScore >75
  - 💤 = Hari tidak aktif
- Notifikasi otomatis jam 8 PM:
  "Streak 5 hari! Lanjutkan 1 jam lagi untuk kunci 🔒 Level 2!"
- Sistem streak forgiveness: Izinkan 1 hari missed per minggu tanpa reset streak

### 2. **Micro-Milestone Celebration**

**Riset Dasar:** Penelitian BJ Fogg tentang celebration moments meningkatkan retensi kebiasaan 83%

```ts
// Schema tambahan
model User {
  milestones Json // {3d: bool, 7d: bool, 21d: bool, 66d: bool}
}
```

**Tahapan Milestone:**

- 3 hari: "Pencapaian Pertama! 🎉"
- 7 hari: "Golden Week! 🏆"
- 21 hari: "Ritual Baru Terbentuk! 💎"
- 66 hari: "Master Kebiasaan! 🚀"

**Implementasi:**

- Unlock badge khusus di profil
- Video pendek (3s) dengan animasi confetti
- Personalized message berdasarkan analisis progress:
  "Selamat! Dalam 7 hari terakhir, moodScore-mu naik 15%! 🚀"

### 3. **Habit Stacking Suggestions**

**Riset Dasar:** Konsep James Clear tentang penumpukan kebiasaan meningkatkan adoption rate 51%

**Alur Kerja:**

1. AI menganalisis 7 refleksi terakhir
2. Identifikasi anchor habit (misal: "minum kopi pagi")
3. Generate suggestion:
   "Coba tambahkan 2 menit peregangan setelah minum kopi pagi? 💪"

**Contoh Prompt AI:**

```txt
Berdasarkan aktivitas {{user_activity}}, sarankan 3 habit stacking yang relevan dengan format:
1. [Anchor Habit] + [New Habit]
2. ...
```

### 4. **Progress Visualization Engine**

**Riset Dasar:** Visualisasi progress meningkatkan motivasi intrinsik 2.3x (Studi Harvard)

**Komponen:**

- Progress bar dengan estimasi "1% better" kumulatif
  "Kamu telah berkembang 37% menuju versi terbaikmu!"
- Comparative timeline:
  "Minggu ini 20% lebih produktif dari minggu lalu!"
- Habit maturity meter:
  "Kebiasaan menulis: 54/66 hari menuju otomatisasi!"

---

## 📊 Success Metrics

| Metric                    | Target | Measurement Method        |
| :------------------------ | :----- | :------------------------ |
| Streak retention rate     | ≥65%   | Analytics 7-day retention |
| Milestone completion rate | 80%    | Event tracking            |
| Habit stacking adoption   | 45%    | User survey               |
| DAU increase              | +40%   | Mixpanel analytics        |

---

## 🔧 Technical Implementation

### Enhanced Database Schema

```prisma
model User {
  id              String        @id @default(uuid())
  // ... existing fields
  currentStreak   Int           @default(0)
  longestStreak   Int           @default(0)
  milestones      Json          // {3d: bool, 7d: bool, ...}
  habitPrefs      String[]      // ["morning_routine", "fitness", ...]
}

model Reflection {
  // ... existing fields
  habitStackingSuggestion String?
}
```

### Alur Streak Management

```ts
async function updateStreak(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const lastActive = user.lastActive;
  const today = new Date();

  if (isConsecutiveDay(lastActive, today)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: { increment: 1 },
        longestStreak: Math.max(user.longestStreak, user.currentStreak + 1),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { currentStreak: 0 },
    });
  }
}
```

---

## 🧠 AI Integration Improvements

### Habit Pattern Recognition

```txt
Prompt Gemini:
Analisis pola dari data 7 hari terakhir:
{{reflections}}

Identifikasi:
1. 3 aktivitas paling konsisten
2. Waktu produktif puncak
3. Trigger positif/negatif yang berulang
4. Saran habit stacking berdasarkan pola

Format output: JSON
```

### Personalized Milestone Messages

```txt
Template AI:
"Selamat mencapai {milestone}! Kamu telah {achievement} seperti:
- {custom_achievement_1}
- {custom_achievement_2}

Mari lanjutkan dengan {next_step_suggestion}!"

Contoh:
"Selamat mencapai 7 hari! Kamu telah meningkatkan moodScore 15% dan konsisten menulis journal.
Mari tambahkan 5 menit meditasi setelah menulis journal!"
```

---

## ⚠️ Risks \& Mitigation

1. **Streak Anxiety**
   Mitigasi: Tambahkan mode "relaxed streak" yang izinkan 2 hari missed
2. **Overwhelming Notifications**
   Mitigasi: User preference panel untuk atur frekuensi
3. **Inaccurate Suggestions**
   Mitigasi: Feedback system dengan tombol 👍/👎 di tiap saran

---

PRD ini dirancang untuk meningkatkan engagement melalui mekanisme psikologis yang terbukti sambil menjaga simplicity core product.
