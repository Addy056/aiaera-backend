/*
========================================
TEXT CHUNKER
Splits large text into smaller,
overlapping chunks for AI retrieval.
========================================
*/

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 150;

/*
========================================
CLEAN TEXT
========================================
*/
function cleanText(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/*
========================================
SPLIT INTO PARAGRAPHS
========================================
*/
function getParagraphs(text = "") {
  return cleanText(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/*
========================================
CREATE CHUNKS
========================================
*/
export function chunkText(
  text,
  options = {}
) {
  const chunkSize =
    options.chunkSize ||
    DEFAULT_CHUNK_SIZE;

  const overlap =
    options.overlap ||
    DEFAULT_OVERLAP;

  if (!text) {
    return [];
  }

  const paragraphs =
    getParagraphs(text);

  const chunks = [];

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const next =
      currentChunk
        ? currentChunk + "\n\n" + paragraph
        : paragraph;

    if (next.length <= chunkSize) {
      currentChunk = next;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    if (paragraph.length <= chunkSize) {
      currentChunk = paragraph;
      continue;
    }

    let start = 0;

    while (start < paragraph.length) {
      const end =
        Math.min(
          start + chunkSize,
          paragraph.length
        );

      chunks.push(
        paragraph
          .slice(start, end)
          .trim()
      );

      start =
        end - overlap;

      if (start < 0) {
        start = 0;
      }

      if (start >= paragraph.length) {
        break;
      }
    }

    currentChunk = "";
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(Boolean);
}

/*
========================================
GET CHUNK PREVIEW
========================================
*/
export function previewChunk(
  text,
  length = 120
) {
  return cleanText(text).slice(0, length);
}