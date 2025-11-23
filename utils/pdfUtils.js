// backend/utils/pdfUtils.js
import pdfParse from "pdf-parse-fixed";
import { PDFDocument } from "pdf-lib";

/* ------------------------------------------------------
   1) Extract TEXT from PDF
------------------------------------------------------- */
export async function extractTextFromPDFBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (err) {
    console.error("[PDFUtils] Text extraction error:", err);
    return "";
  }
}

/* ------------------------------------------------------
   2) Extract IMAGES from PDF
   pdf-lib does not give raw XObjects, but it lets
   you load embedded images using "page.getImages()"
------------------------------------------------------- */

async function extractImagesFromPDFBuffer(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);

    const images = [];
    let index = 0;

    // Iterate pages
    for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
      const embeddedImages = page.node.Resources()?.XObject;

      if (!embeddedImages) continue;

      for (const key of Object.keys(embeddedImages)) {
        const obj = embeddedImages[key];

        // Only extract if it's an image
        if (obj?.dict?.get("Subtype")?.name !== "Image") continue;

        index++;

        const imgData = obj.contents;

        // Determine file type
        let ext = "jpg";
        if (obj.dict.get("ColorSpace")?.name === "DeviceRGB") ext = "jpg";
        if (obj.dict.get("Filter")?.name === "FlateDecode") ext = "png";

        images.push({
          name: `page-${pageIndex + 1}-image-${index}.${ext}`,
          data: Buffer.from(imgData),
          type: ext === "jpg" ? "image/jpeg" : "image/png",
        });
      }
    }

    return images;
  } catch (err) {
    console.error("[PDFUtils] Image extraction error:", err);
    return [];
  }
}

/* ------------------------------------------------------
   3) Parse FULL PDF (text + images)
------------------------------------------------------- */
export async function parsePDFBuffer(buffer) {
  try {
    const text = await extractTextFromPDFBuffer(buffer);
    const images = await extractImagesFromPDFBuffer(buffer);

    return {
      text: text || "",
      images: images || [],
    };
  } catch (err) {
    console.error("[PDFUtils] parsePDFBuffer fatal error:", err);
    return { text: "", images: [] };
  }
}
