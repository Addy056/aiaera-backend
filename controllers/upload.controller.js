import fs from "fs";
import * as pdfParse from "pdf-parse";
import csv from "csv-parser";

import { supabase } from "../config/supabaseClient.js";

/*
========================================
UPLOAD TRAINING FILE
========================================
*/
export const uploadTrainingFile = async (
  req,
  res
) => {
  try {
    const file = req.file;

    const {
      chatbot_id,
    } = req.body;

    /*
    ========================================
    VALIDATION
    ========================================
    */
    if (
      !file ||
      !chatbot_id
    ) {
      return res.status(400).json({
        error:
          "Missing file or chatbot_id",
      });
    }

    /*
    ========================================
    EXTRACT TEXT
    ========================================
    */
    let extractedText = "";

    /*
    ========================================
    PDF FILE
    ========================================
    */
    if (
      file.mimetype ===
      "application/pdf"
    ) {
      const fileBuffer =
        fs.readFileSync(
          file.path
        );

      const data =
        await pdfParse.default(
          fileBuffer
        );

      extractedText =
        data.text || "";
    }

    /*
    ========================================
    CSV FILE
    ========================================
    */
    else if (
      file.mimetype ===
        "text/csv" ||
      file.originalname
        .toLowerCase()
        .endsWith(".csv")
    ) {
      const rows = [];

      await new Promise(
        (
          resolve,
          reject
        ) => {
          fs.createReadStream(
            file.path
          )
            .pipe(csv())
            .on(
              "data",
              (data) => {
                rows.push(
                  Object.values(
                    data
                  ).join(" ")
                );
              }
            )
            .on(
              "end",
              resolve
            )
            .on(
              "error",
              reject
            );
        }
      );

      extractedText =
        rows.join("\n");
    }

    /*
    ========================================
    TXT FILE
    ========================================
    */
    else if (
      file.mimetype ===
        "text/plain" ||
      file.originalname
        .toLowerCase()
        .endsWith(".txt")
    ) {
      extractedText =
        fs.readFileSync(
          file.path,
          "utf8"
        );
    }

    /*
    ========================================
    UNSUPPORTED FILE
    ========================================
    */
    else {
      if (
        fs.existsSync(
          file.path
        )
      ) {
        fs.unlinkSync(
          file.path
        );
      }

      return res.status(400).json({
        error:
          "Only PDF, CSV, and TXT files are supported",
      });
    }

    /*
    ========================================
    CLEAN TEXT
    ========================================
    */
    extractedText =
      extractedText
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50000);

    /*
    ========================================
    SAVE FILE METADATA
    ========================================
    */
    const {
      data: fileRecord,
      error: fileError,
    } = await supabase
      .from(
        "chatbot_files"
      )
      .insert([
        {
          chatbot_id,
          user_id:
            req.user.id,
          file_name:
            file.originalname,
          file_type:
            file.mimetype,
        },
      ])
      .select()
      .single();

    if (fileError) {
      throw fileError;
    }

    /*
    ========================================
    SAVE EXTRACTED CONTENT
    ========================================
    */
    const {
      error: contentError,
    } = await supabase
      .from(
        "chatbot_file_data"
      )
      .insert([
        {
          chatbot_id,
          user_id:
            req.user.id,
          file_id:
            fileRecord.id,
          content:
            extractedText,
        },
      ]);

    if (contentError) {
      throw contentError;
    }

    /*
    ========================================
    DELETE TEMP FILE
    ========================================
    */
    if (
      fs.existsSync(
        file.path
      )
    ) {
      fs.unlinkSync(
        file.path
      );
    }

    /*
    ========================================
    SUCCESS RESPONSE
    ========================================
    */
    return res.json({
      success: true,
      message:
        "Training file uploaded successfully",
      characters:
        extractedText.length,
    });

  } catch (err) {
    console.error(
      "UPLOAD ERROR:",
      err
    );

    /*
    ========================================
    DELETE TEMP FILE ON ERROR
    ========================================
    */
    if (
      req.file &&
      fs.existsSync(
        req.file.path
      )
    ) {
      fs.unlinkSync(
        req.file.path
      );
    }

    return res.status(500).json({
      error:
        err.message ||
        "Failed to upload file",
    });
  }
};