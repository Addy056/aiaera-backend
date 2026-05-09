import axios from "axios";
import * as cheerio from "cheerio";

export const scrapeWebsite = async (
  url
) => {
  try {
    const { data } =
      await axios.get(url);

    const $ =
      cheerio.load(data);

    /*
    =========================
    REMOVE UNWANTED TAGS
    =========================
    */
    $("script").remove();
    $("style").remove();
    $("noscript").remove();

    /*
    =========================
    EXTRACT TEXT
    =========================
    */
    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, 50000);

  } catch (err) {
    console.error(
      "SCRAPER ERROR:",
      err
    );

    throw new Error(
      "Failed to scrape website"
    );
  }
};