export function normalizeCopiedJson(raw: string) {
  const text = raw.trim().replace(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i, "$1");
  let normalized = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      normalized += char;
      if (char === "\\" && i + 1 < text.length) normalized += text[++i];
      else if (char === '"') inString = false;
    } else if (text.startsWith("&#x20;", i)) {
      normalized += " ";
      i += "&#x20;".length - 1;
    } else if (char === "\\" && (text[i + 1] === "\n" || text.slice(i + 1, i + 3) === "\r\n")) {
      // Hapus escape salinan hanya di luar string agar materi tetap utuh.
      continue;
    } else {
      normalized += char;
      if (char === '"') inString = true;
    }
  }
  return normalized;
}
