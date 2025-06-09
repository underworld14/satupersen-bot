// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { ReflectionService } from "./reflection-service";
import { generateContent } from "../utils/ai-client";

// Mock PrismaClient
jest.mock("@prisma/client", () => {
  const mPrismaClient = {
    reflection: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      // Mock other models if needed by the service
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

// Mock AI Client
jest.mock("../utils/ai-client", () => ({
  generateReflectionPrompt: jest.fn(
    (data) => `Prompt for ${data.hari_ini}`
  ), // Mocked prompt generation
  generateContent: jest.fn(), // This will be primarily mocked in tests
}));

describe("ReflectionService", () => {
  let reflectionService: ReflectionService;
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    reflectionService = new ReflectionService(mockPrisma);
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe("createReflection - moodScore extraction", () => {
    const userId = "test-user-id";
    const inputToday = "Had a great day, very productive!";
    const mockReflectionCreate = mockPrisma.reflection.create as jest.Mock;
    const mockGenerateContent = generateContent as jest.Mock;

    beforeEach(() => {
      // Default mock for getLastReflections (called by createReflection)
      (mockPrisma.reflection.findMany as jest.Mock).mockResolvedValue([]);
      // Default mock for reflection creation
      mockReflectionCreate.mockImplementation(async (data) => ({
        id: "new-reflection-id",
        ...data.data, // Return the data passed to create
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: data.data.input.split(" ").length,
      }));
    });

    it("should extract and store a valid moodScore, and clean summary", async () => {
      mockGenerateContent.mockResolvedValue(
        "This is the AI summary.\n moodScore: 75"
      );
      const { reflection, aiSummary } =
        await reflectionService.createReflection(userId, inputToday);

      expect(mockReflectionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            moodScore: 75,
            aiSummary: "This is the AI summary.",
          }),
        })
      );
      expect(reflection.moodScore).toBe(75);
      expect(aiSummary).toBe("This is the AI summary.");
    });

    it("should handle moodScore at boundary (1)", async () => {
      mockGenerateContent.mockResolvedValue(
        "Summary text.\nmoodScore: 1"
      );
      const { reflection } = await reflectionService.createReflection(
        userId,
        inputToday
      );
      expect(reflection.moodScore).toBe(1);
    });

    it("should handle moodScore at boundary (0 - invalid, should be null)", async () => {
      // Assuming 0 is outside the valid 1-100 range as per current logic
      mockGenerateContent.mockResolvedValue(
        "Summary text.\nmoodScore: 0"
      );
       const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { reflection } = await reflectionService.createReflection(
        userId,
        inputToday
      );
      expect(reflection.moodScore).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid moodScore extracted: 0"));
      consoleWarnSpy.mockRestore();
    });

    it("should handle moodScore at boundary (100)", async () => {
      mockGenerateContent.mockResolvedValue(
        "Summary text.\nmoodScore: 100"
      );
      const { reflection } = await reflectionService.createReflection(
        userId,
        inputToday
      );
      expect(reflection.moodScore).toBe(100);
    });

    it("should handle invalid moodScore (101 - too high)", async () => {
      mockGenerateContent.mockResolvedValue(
        "Summary text.\nmoodScore: 101"
      );
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { reflection } = await reflectionService.createReflection(
        userId,
        inputToday
      );
      expect(reflection.moodScore).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid moodScore extracted: 101"));
      consoleWarnSpy.mockRestore();
    });

    it("should handle invalid moodScore (-5 - too low)", async () => {
      mockGenerateContent.mockResolvedValue(
        "Summary text.\nmoodScore: -5"
      );
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { reflection } = await reflectionService.createReflection(
        userId,
        inputToday
      );
      expect(reflection.moodScore).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid moodScore extracted: -5"));
      consoleWarnSpy.mockRestore();
    });

    it("should handle invalid moodScore (abc - not a number)", async () => {
      mockGenerateContent.mockResolvedValue(
        "Summary text.\nmoodScore: abc"
      );
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { reflection } = await reflectionService.createReflection(
        userId,
        inputToday
      );
      expect(reflection.moodScore).toBeNull();
      // The regex \d+ won't match 'abc', so 'match' will be null.
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("moodScore not found in AI response."));
      consoleWarnSpy.mockRestore();
    });

    it("should handle moodScore not found in AI response", async () => {
      mockGenerateContent.mockResolvedValue("Summary text without mood score line.");
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { reflection, aiSummary } =
        await reflectionService.createReflection(userId, inputToday);

      expect(reflection.moodScore).toBeNull();
      expect(aiSummary).toBe("Summary text without mood score line.");
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("moodScore not found in AI response."));
      consoleWarnSpy.mockRestore();
    });

    it("should handle different casing and spacing for moodScore (Moodscore:  80)", async () => {
      mockGenerateContent.mockResolvedValue(
        "Summary text.\nMoodscore:  80" // Note: current regex is /moodScore:\s*(\d+)/i; - 'Moodscore' will match due to 'i'
      );
      const { reflection, aiSummary } =
        await reflectionService.createReflection(userId, inputToday);

      expect(reflection.moodScore).toBe(80);
      expect(aiSummary).toBe("Summary text.");
    });

    it("should correctly extract summary when moodScore is at the beginning", async () => {
        mockGenerateContent.mockResolvedValue(
          "moodScore: 90\nThis is the actual summary."
        );
        const { reflection, aiSummary } =
          await reflectionService.createReflection(userId, inputToday);

        expect(reflection.moodScore).toBe(90);
        expect(aiSummary).toBe("This is the actual summary.");
      });

      it("should correctly extract summary when moodScore is in the middle (though prompt asks for last line)", async () => {
        mockGenerateContent.mockResolvedValue(
          "Prefix summary.\nmoodScore: 60\nSuffix summary."
        );
        const { reflection, aiSummary } =
          await reflectionService.createReflection(userId, inputToday);

        expect(reflection.moodScore).toBe(60);
        // Regex replace will remove the moodScore line, then trim joins the parts.
        expect(aiSummary).toBe("Prefix summary.\nSuffix summary.");
      });

      it("should handle empty AI response after moodScore removal", async () => {
        mockGenerateContent.mockResolvedValue("moodScore: 50");
        const { reflection, aiSummary } =
          await reflectionService.createReflection(userId, inputToday);

        expect(reflection.moodScore).toBe(50);
        expect(aiSummary).toBe(""); // Empty string after removing moodScore line and trimming
      });
  });
});
