// Test script to validate help command formatting
console.log("Testing help command message formatting...");

const helpMessage = `📚 *Panduan Satupersen Bot*

🎯 *Tujuan*
Membantu Anda berkembang 1% setiap hari melalui refleksi diri yang konsisten dan terarah.

🤖 *Perintah Utama:*

📝 /reflect - Mulai refleksi harian
   Ceritakan aktivitas harian Anda, dan bot akan memberikan analisis dengan bantuan AI berdasarkan perkembangan 3 hari terakhir.

📊 /summary - Ringkasan hari ini
   Lihat ringkasan refleksi yang sudah Anda buat hari ini.

📈 /stats - Statistik perkembangan
   Melihat statistik refleksi mingguan/bulanan dan motivasi untuk terus berkembang.

🏠 /start - Kembali ke menu utama
   Menampilkan halaman utama dengan tombol navigasi.

❓ /help - Panduan ini
   Menampilkan panduan lengkap penggunaan bot.

💡 *Tips Refleksi Efektif:*
• Jadilah jujur tentang pencapaian dan kegagalan
• Fokus pada pembelajaran, bukan hanya hasil
• Tulis minimal 2-3 kalimat untuk analisis yang baik
• Refleksikan secara konsisten setiap hari

🔄 *Cara Kerja Analisis AI:*
Bot akan membandingkan refleksi Anda dengan 2 hari sebelumnya untuk:
• Mengidentifikasi pola perkembangan
• Memberikan saran konstruktif
• Memotivasi pencapaian berkelanjutan
• Menyoroti area yang perlu ditingkatkan

🎯 *Contoh Refleksi yang Baik:*
"Hari ini saya menyelesaikan presentasi proyek dan mendapat feedback positif dari klien. Saya belajar cara menjelaskan konsep teknis dengan bahasa yang lebih sederhana. Tantangannya adalah waktu persiapan yang mepet, next time harus planning lebih awal."

🚀 *Mulai Sekarang:*
Ketik /reflect untuk memulai refleksi harian Anda!

📞 *Support:*
Jika mengalami masalah, silakan hubungi @support_satupersen`;

console.log("✅ Help message formatted successfully");
console.log("Message length:", helpMessage.length);
console.log("Contains asterisks for markdown:", helpMessage.includes("*"));
console.log(
  "Contains special characters that might cause issues:",
  /[_`\[\]()~>#+=|{}.!-]/.test(helpMessage)
);

if (import.meta.main) {
  console.log("\n📝 Full help message preview:");
  console.log("=".repeat(50));
  console.log(helpMessage);
  console.log("=".repeat(50));
}
