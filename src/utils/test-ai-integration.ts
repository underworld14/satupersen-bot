import { env } from "./env-validation.js";
import {
  generateContent,
  generateReflectionPrompt,
  testAIConnection,
} from "./ai-client.js";

/**
 * Test AI integration functionality
 */
async function testAIIntegration(): Promise<void> {
  console.log("🧪 Testing AI Integration...\n");

  try {
    // Test 1: Basic connection test
    console.log("📡 Test 1: Testing AI connection...");
    const connectionOK = await testAIConnection();
    console.log(
      connectionOK ? "✅ Connection successful\n" : "❌ Connection failed\n"
    );

    if (!connectionOK) {
      throw new Error("AI connection failed");
    }

    // Test 2: Prompt generation
    console.log("📝 Test 2: Testing prompt generation...");
    const testPrompt = generateReflectionPrompt({
      hari_ini:
        "Hari ini saya belajar TypeScript dan berhasil membuat bot Telegram. Saya merasa senang dengan progress ini.",
      kemarin: "Kemarin saya setup environment dan database untuk bot.",
      dua_hari_lalu: null,
    });
    console.log("✅ Prompt generated successfully");
    console.log("Generated prompt preview:");
    console.log(testPrompt.substring(0, 200) + "...\n");

    // Test 3: AI content generation
    console.log("🤖 Test 3: Testing AI content generation...");
    const aiResponse = await generateContent(testPrompt);
    console.log("✅ AI response generated successfully");
    console.log("Response length:", aiResponse.length, "characters");
    console.log("Response preview:");
    console.log(aiResponse.substring(0, 300) + "...\n");

    // Test 4: Simple reflection test
    console.log("🎯 Test 4: Testing simple reflection...");
    const simpleReflection = await generateContent(
      "Analisis refleksi ini: 'Hari ini saya produktif, menyelesaikan 3 task penting dan berolahraga 30 menit.'"
    );
    console.log("✅ Simple reflection analysis successful");
    console.log("Analysis preview:");
    console.log(simpleReflection.substring(0, 200) + "...\n");

    console.log("🎉 All AI integration tests passed!");
    console.log("🚀 The reflection system is ready to use!");
  } catch (error) {
    console.error("❌ AI integration test failed:", error);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check your GOOGLE_API_KEY in .env file");
    console.log("2. Ensure you have internet connection");
    console.log("3. Verify your Google AI API quota/billing");
    console.log("4. Try using a different model name");

    throw error;
  }
}

/**
 * Run tests if this file is executed directly
 */
if (import.meta.main) {
  console.log("🧪 Starting AI Integration Tests");
  console.log("=".repeat(50));
  console.log(`📊 Model: ${env.GOOGLE_AI_MODEL_NAME}`);
  console.log(
    `🔑 API Key: ${
      env.GOOGLE_API_KEY ? "***" + env.GOOGLE_API_KEY.slice(-4) : "Not set"
    }`
  );
  console.log("=".repeat(50));
  console.log();

  testAIIntegration()
    .then(() => {
      console.log("\n✅ All tests completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Tests failed:", error.message);
      process.exit(1);
    });
}
