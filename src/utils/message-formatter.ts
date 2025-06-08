/**
 * Message formatting utilities for Telegram
 */

/**
 * Escape special Markdown characters for Telegram
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\*/g, "\\*") // Escape asterisks
    .replace(/_/g, "\\_") // Escape underscores
    .replace(/\[/g, "\\[") // Escape square brackets
    .replace(/\]/g, "\\]") // Escape square brackets
    .replace(/\(/g, "\\(") // Escape parentheses
    .replace(/\)/g, "\\)") // Escape parentheses
    .replace(/~/g, "\\~") // Escape tildes
    .replace(/`/g, "\\`") // Escape backticks
    .replace(/>/g, "\\>") // Escape greater than
    .replace(/#/g, "\\#") // Escape hash
    .replace(/\+/g, "\\+") // Escape plus
    .replace(/-/g, "\\-") // Escape minus
    .replace(/=/g, "\\=") // Escape equals
    .replace(/\|/g, "\\|") // Escape pipe
    .replace(/\{/g, "\\{") // Escape curly braces
    .replace(/\}/g, "\\}") // Escape curly braces
    .replace(/\./g, "\\.") // Escape dots
    .replace(/!/g, "\\!"); // Escape exclamation marks
}

/**
 * Format reflection success message safely
 */
export function formatReflectionSuccess(aiSummary: string): string {
  return `✅ *Refleksi berhasil disimpan!*\n\n${escapeMarkdown(aiSummary)}`;
}

/**
 * Format message with safe HTML instead of Markdown
 */
export function formatWithHTML(message: string): {
  text: string;
  parse_mode: "HTML";
} {
  const htmlMessage = message
    .replace(/\*([^*]+)\*/g, "<b>$1</b>") // Bold
    .replace(/_([^_]+)_/g, "<i>$1</i>") // Italic
    .replace(/`([^`]+)`/g, "<code>$1</code>"); // Code

  return {
    text: htmlMessage,
    parse_mode: "HTML",
  };
}

/**
 * Split long message into chunks for Telegram's 4096 character limit
 */
export function splitLongMessage(
  text: string,
  maxLength: number = 4000
): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = "";

  const sentences = text.split(". ");

  for (const sentence of sentences) {
    if ((currentChunk + sentence + ". ").length <= maxLength) {
      currentChunk += sentence + ". ";
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence + ". ";
      } else {
        // Handle very long single sentences
        const words = sentence.split(" ");
        let wordChunk = "";

        for (const word of words) {
          if ((wordChunk + word + " ").length <= maxLength) {
            wordChunk += word + " ";
          } else {
            if (wordChunk) {
              chunks.push(wordChunk.trim());
              wordChunk = word + " ";
            } else {
              // Handle extremely long words (should be rare)
              chunks.push(word);
            }
          }
        }

        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
