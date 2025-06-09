# 🌱 Satupersen Bot - Daily Reflection Telegram Bot

<div align="center">

![Satupersen Logo](https://img.shields.io/badge/Satupersen-1%25%20Daily%20Growth-brightgreen?style=for-the-badge)
[![Made with Bun](https://img.shields.io/badge/Made%20with-Bun-black?style=for-the-badge&logo=bun)](https://bun.sh)
[![Powered by AI](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4?style=for-the-badge)](https://ai.google.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)

**🇮🇩 Telegram bot refleksi diri harian untuk berkembang 1% setiap hari**

[Features](#-features) • [Setup](#-quick-start) • [Commands](#-bot-commands) • [Deployment](#-deployment) • [API](#-api-documentation)

</div>

---

## 📋 Overview

Satupersen adalah Telegram bot canggih yang membantu pengguna melakukan refleksi diri harian dengan bantuan AI. Bot ini menganalisis perkembangan pengguna selama 3 hari terakhir dan memberikan insights, motivasi, serta tracking mood score untuk pertumbuhan personal yang berkelanjutan.

### ✨ Key Features

- 🤖 **AI-Powered Analysis** - Menggunakan Google Gemini Flash untuk analisis refleksi
- 📊 **Mood Score Tracking** - Skor suasana hati 1-100 berdasarkan analisis AI
- 📈 **Progress Analytics** - Statistik mingguan dan bulanan dengan trend analysis
- 🔄 **3-Day Context** - Perbandingan refleksi 3 hari untuk insights yang lebih dalam
- 🇮🇩 **Bahasa Indonesia** - Interface dan responses dalam Bahasa Indonesia
- 🛡️ **Enterprise-Grade** - Rate limiting, error handling, dan logging komprehensif

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2.15+
- [PostgreSQL](https://postgresql.org/) 14+
- [Telegram Bot Token](https://t.me/BotFather)
- [Google AI API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone repository**

```bash
git clone https://github.com/yourusername/satupersen-bot.git
cd satupersen-bot
```

2. **Install dependencies**

```bash
bun install
```

3. **Setup environment variables**

```bash
cp .env.example .env
```

Edit `.env` file:

```env
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/satupersen

# AI Configuration
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_AI_MODEL_NAME=gemini-1.5-flash

# Optional: Environment
NODE_ENV=development
```

4. **Setup database**

```bash
# Generate Prisma client
bun run db:generate

# Run migrations
bun run db:migrate:dev
```

5. **Start the bot**

```bash
# Development mode (with auto-reload)
bun run dev

# Production mode
bun start
```

## 🤖 Bot Commands

| Command    | Description                              | Usage      |
| ---------- | ---------------------------------------- | ---------- |
| `/start`   | Memulai bot dan registrasi pengguna      | `/start`   |
| `/help`    | Menampilkan panduan penggunaan           | `/help`    |
| `/reflect` | Input refleksi harian dengan analisis AI | `/reflect` |
| `/summary` | Ringkasan refleksi hari ini              | `/summary` |
| `/stats`   | Statistik refleksi mingguan/bulanan      | `/stats`   |

### 📱 Interactive Features

- **Inline Keyboards** - Navigasi dengan tombol interaktif
- **Session Management** - Multi-step conversations untuk input refleksi
- **Callback Handling** - Respons cepat untuk aksi pengguna
- **Error Recovery** - Penanganan error yang user-friendly

## 🏗️ Architecture

```
satupersen-bot/
├── 📁 docs/              # Project documentation
│   ├── prd.md            # Product Requirements Document
│   └── todo.md           # Development progress tracker
├── 📁 prisma/            # Database schema & migrations
│   ├── schema.prisma     # Database models
│   └── migrations/       # Database migration files
├── 📁 src/               # Source code
│   ├── 📁 commands/      # Bot command handlers
│   │   ├── start-command.ts
│   │   ├── help-command.ts
│   │   ├── reflect-command.ts
│   │   ├── summary-command.ts
│   │   └── stats-command.ts
│   ├── 📁 handlers/      # Centralized callback handlers
│   │   └── callback-handler.ts
│   ├── 📁 middleware/    # Bot middleware
│   │   ├── user-auth.ts
│   │   ├── error-handler.ts
│   │   ├── logging.ts
│   │   └── rate-limiting.ts
│   ├── 📁 services/      # Business logic
│   │   ├── user-service.ts
│   │   ├── reflection-service.ts
│   │   └── analytics-service.ts
│   ├── 📁 types/         # TypeScript definitions
│   └── 📁 utils/         # Helper functions
│       ├── database.ts
│       ├── ai-client.ts
│       ├── env-validation.ts
│       └── message-formatter.ts
├── index.ts              # Application entry point
├── package.json          # Dependencies & scripts
├── Dockerfile            # Container configuration
└── docker-compose.yml    # Multi-service orchestration
```

## 💾 Database Schema

### User Model

```typescript
model User {
  id          String        @id @default(uuid())
  telegramId  String        @unique
  username    String?
  firstName   String?
  reflections Reflection[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

### Reflection Model

```typescript
model Reflection {
  id         String   @id @default(uuid())
  userId     String
  date       DateTime
  input      String          // User's reflection input
  aiSummary  String?         // AI-generated analysis
  moodScore  Int?            // Mood score (1-100)
  wordCount  Int      @default(0)
  user       User     @relation(fields: [userId], references: [id])
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## 🧠 AI Integration

### Google Gemini Flash Integration

Bot menggunakan Google Gemini Flash untuk:

- **Analisis Refleksi** - Menganalisis input pengguna dengan context 3 hari
- **Mood Score Generation** - Menghasilkan skor suasana hati (1-100)
- **Insight Generation** - Memberikan saran dan motivasi personal
- **Progress Comparison** - Membandingkan perkembangan antar hari

### AI Prompt Structure

```typescript
// 3-day reflection context prompt
const prompt = `
Kamu adalah asisten refleksi harian untuk membantuku berkembang 1% setiap hari.

Berikut refleksi saya selama 3 hari:
📅 Dua Hari Lalu: ${twoDaysAgo}
📅 Kemarin: ${yesterday}
📅 Hari Ini: ${today}

Tolong bantu:
1. Ringkasan hari ini
2. Perbandingan perkembangan dari dua hari sebelumnya
3. Hal positif dan yang bisa ditingkatkan
4. Saran untuk hari esok
5. Motivasi singkat
6. moodScore (skor 1-100 berdasarkan analisis sentimen)
`;
```

## 📊 Analytics & Statistics

### Available Metrics

- **Reflection Frequency** - Berapa sering pengguna melakukan refleksi
- **Mood Score Trends** - Tren perubahan mood score dari waktu ke waktu
- **Word Count Analysis** - Analisis panjang refleksi
- **Common Themes** - Topik yang sering muncul dalam refleksi
- **Growth Insights** - Insights tentang perkembangan personal

### Stats Command Output

```
📊 Statistik Refleksi Mingguan:

🗓 Jumlah hari tercatat: 6 dari 7
😊 Rata-rata moodScore: 75
📈 Tren moodScore: Meningkat
🔥 Kebiasaan dominan: Menulis jurnal, olahraga pagi
💡 Perkembangan: Kamu mulai lebih konsisten
✨ Refleksi terbaik: Hari ke-4
🚀 "Kemajuan kecil setiap hari membangun masa depan luar biasa."
```

## 🔧 Development

### Available Scripts

```bash
# Development
bun run dev              # Start with auto-reload
bun start               # Production start
bun run build           # Build for production

# Database
bun run db:generate     # Generate Prisma client
bun run db:migrate:dev  # Run dev migrations
bun run db:migrate      # Deploy migrations
bun run db:studio       # Open Prisma Studio

# Testing
bun test                # Run all tests
bun test:watch          # Run tests in watch mode
```

### Code Style & Standards

- **Language**: TypeScript dengan strict type checking
- **Style**: ESLint + Prettier configuration
- **Architecture**: Clean Architecture dengan separation of concerns
- **Testing**: Comprehensive unit & integration tests
- **Documentation**: JSDoc untuk public APIs

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐳 Deployment

### Docker Deployment

1. **Build image**

```bash
docker build -t satupersen-bot .
```

2. **Run with Docker Compose**

```bash
# Start all services (bot + database)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

3. **Environment for production**

```env
NODE_ENV=production
BOT_TOKEN=your_production_bot_token
DATABASE_URL=postgresql://postgres:password@db:5432/satupersen
GOOGLE_API_KEY=your_google_api_key
GOOGLE_AI_MODEL_NAME=gemini-1.5-flash
```

### Manual Deployment

1. **Setup production server**

```bash
# Install Bun on Ubuntu/Debian
curl -fsSL https://bun.sh/install | bash

# Clone and setup
git clone https://github.com/yourusername/satupersen-bot.git
cd satupersen-bot
bun install
```

2. **Configure environment**

```bash
cp .env.example .env
# Edit .env with production values
```

3. **Setup database**

```bash
# Run migrations
bun run db:migrate

# Generate client
bun run db:generate
```

4. **Start with PM2 (recommended)**

```bash
# Install PM2
bun add -g pm2

# Start bot
pm2 start index.ts --name satupersen-bot --interpreter bun

# Setup auto-restart
pm2 startup
pm2 save
```

### Health Checks

The bot includes built-in health monitoring:

- **Database Connection** - Automatic connection testing on startup
- **AI API Status** - Google Gemini API connectivity check
- **Graceful Shutdown** - Proper cleanup on SIGINT/SIGTERM
- **Error Recovery** - Automatic error handling and user notification

### Monitoring

```bash
# View bot logs
pm2 logs satupersen-bot

# Monitor performance
pm2 monit

# Restart bot
pm2 restart satupersen-bot
```

## 🔐 Security & Best Practices

### Security Features

- **Environment Variables** - Secure API key management
- **Input Validation** - Comprehensive input sanitization
- **Rate Limiting** - Protection against spam and abuse
- **SQL Injection Protection** - Prisma ORM with parameterized queries
- **Error Handling** - No sensitive data in error messages

### Privacy Considerations

- **Data Minimization** - Only essential user data is stored
- **Secure Storage** - PostgreSQL with proper indexing and relationships
- **No Logging of Personal Content** - Reflections are not logged in application logs
- **GDPR Compliance Ready** - User data export and deletion capabilities

## 📚 API Documentation

### Core Services

#### ReflectionService

```typescript
class ReflectionService {
  async createReflection(userId: string, input: string): Promise<Reflection>;
  async getLastReflections(
    userId: string,
    limit: number
  ): Promise<Reflection[]>;
  async getTodayReflection(userId: string): Promise<Reflection | null>;
  async getReflectionsByDateRange(
    userId: string,
    start: Date,
    end: Date
  ): Promise<Reflection[]>;
}
```

#### AnalyticsService

```typescript
class AnalyticsService {
  async getWeeklyStats(userId: string): Promise<WeeklyStats>;
  async getMonthlyStats(userId: string): Promise<MonthlyStats>;
  async calculateMoodTrend(userId: string, days: number): Promise<MoodTrend>;
  async getReflectionFrequency(userId: string): Promise<FrequencyStats>;
}
```

#### UserService

```typescript
class UserService {
  async getOrCreateUser(
    telegramId: string,
    userData: TelegramUser
  ): Promise<User>;
  async updateUser(userId: string, data: Partial<User>): Promise<User>;
  async getUserById(userId: string): Promise<User | null>;
}
```

## 📈 Performance

### Optimization Features

- **Database Indexing** - Optimized queries with proper indexes
- **Connection Pooling** - Efficient database connection management
- **Caching Strategy** - In-memory caching for frequently accessed data
- **Lazy Loading** - On-demand loading of related data
- **Batch Processing** - Efficient bulk operations where applicable

### Performance Metrics

- **Response Time** - < 2s for reflection analysis
- **Throughput** - Supports 100+ concurrent users
- **Memory Usage** - < 512MB RAM in production
- **Database Queries** - Optimized with < 5 queries per request

## 🔍 Troubleshooting

### Common Issues

**Bot not responding**

```bash
# Check bot status
pm2 status satupersen-bot

# Check logs
pm2 logs satupersen-bot --lines 50
```

**Database connection issues**

```bash
# Test database connectivity
bun run src/utils/test-db-connection.ts

# Check database status
sudo systemctl status postgresql
```

**AI API errors**

```bash
# Test AI connection
bun run src/utils/test-ai-integration.ts

# Verify API key
echo $GOOGLE_API_KEY
```

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=true
```

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/satupersen-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/satupersen-bot/discussions)
- **Email**: support@satupersen.com
- **Telegram**: [@satupersen_support](https://t.me/satupersen_support)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Telegraf.js](https://telegraf.js.org/) - Modern Telegram Bot Framework
- [Google Generative AI](https://ai.google.dev/) - Powerful AI capabilities
- [Prisma](https://prisma.io/) - Next-generation ORM
- [Bun](https://bun.sh/) - Fast all-in-one JavaScript runtime
- [PostgreSQL](https://postgresql.org/) - Advanced open source database

---

<div align="center">

**Made with ❤️ for personal growth and daily reflection**

[🌱 Start your 1% daily growth journey today](https://t.me/your_bot_username)

</div>
