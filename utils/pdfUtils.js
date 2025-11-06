// backend/utils/pdfUtils.js
import pdfParse from "pdf-parse-fixed";
import { PDFDocument } from "pdf-lib";

/**
 * Extract text from a PDF buffer
 * @param {Buffer} buffer
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromPDFBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (err) {
    console.error("[PDFUtils] extractTextFromPDFBuffer error:", err);
    return "";
  }
}

/**
 * Extract images from PDF buffer
 * @param {Buffer} buffer
 * @returns {Promise<Array<{name: string, data: Buffer, type: string}>>} Images array
 */
export async function extractImagesFromPDFBuffer(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const images = [];
    const pages = pdfDoc.getPages();

    let imgIndex = 0;

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];

      // Access XObjects (images) on the page
      const xObjects = page.node.Resources?.()?.XObject || {};

      for (const key of Object.keys(xObjects)) {
        const xObject = xObjects[key];
        const type = xObject.constructor.name;

        if (type === "PDFRawStream") {
          const imgBuffer = xObject.contents;
          if (imgBuffer) {
            imgIndex++;
            images.push({
              name: `page-${pageIndex + 1}-img-${imgIndex}.jpg`,
              data: imgBuffer,
              type: "image/jpeg",
            });
          }
        }
      }
    }

    return images;
  } catch (err) {
    console.error("[PDFUtils] extractImagesFromPDFBuffer error:", err);
    return [];
  }
}

/**
 * Extract both text and images from a PDF buffer
 * @param {Buffer} buffer
 * @returns {Promise<{text: string, images: Array}>}
 */
export async function parsePDFBuffer(buffer) {
  const text = await extractTextFromPDFBuffer(buffer);
  const images = await extractImagesFromPDFBuffer(buffer);
  return { text, images };
}
