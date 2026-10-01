// src/lib/explanationParser.ts
// Memisahkan pembahasan menjadi bagian Inti dan Trik Cepat

export interface ParsedExplanation {
  core: string;      // Inti penjelasan
  trickTip: string | null; // Trik cepat / kata kunci eliminasi (null jika tidak ada)
}

const TRICK_PATTERNS = [
  /(?:^|\n)(?:trik cepat|tips?|kunci|kata kunci|catatan|ingat|perhatikan|hint)[:\s]+/i,
];

/** Parse teks pembahasan ke bagian core dan trickTip */
export function parseExplanation(text: string): ParsedExplanation {
  if (!text?.trim()) return { core: '', trickTip: null };

  for (const pattern of TRICK_PATTERNS) {
    const match = text.search(pattern);
    if (match > 0) {
      const idx = text.search(pattern);
      return {
        core: text.slice(0, idx).trim(),
        trickTip: text.slice(idx).trim(),
      };
    }
  }

  return { core: text.trim(), trickTip: null };
}
