const path = require("path");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const JSZip = require("jszip");

function normalizeWhitespace(text) {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}

function xmlToPlainText(xml) {
  return normalizeWhitespace(
    xml
      .replace(/<a:br\s*\/>/g, "\n")
      .replace(/<\/a:p>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

async function extractTextFromPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text);
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return normalizeWhitespace(result.value);
}

async function extractTextFromPptx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries = Object.keys(zip.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const slideTexts = [];

  for (const entry of slideEntries) {
    const xml = await zip.files[entry].async("string");
    const text = xmlToPlainText(xml);

    if (text) {
      slideTexts.push(text);
    }
  }

  return normalizeWhitespace(slideTexts.join("\n\n"));
}

function extractTextFromTextFile(filePath) {
  return normalizeWhitespace(fs.readFileSync(filePath, "utf8"));
}

async function importSourceFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  const title = fileName.replace(path.extname(fileName), "");
  let content = "";
  let type = "txt";

  if (ext === ".pdf") {
    type = "pdf";
    content = await extractTextFromPdf(filePath);
  } else if (ext === ".pptx") {
    type = "pptx";
    content = await extractTextFromPptx(filePath);
  } else if (ext === ".docx") {
    type = "docx";
    content = await extractTextFromDocx(filePath);
  } else if (ext === ".txt" || ext === ".md") {
    type = "txt";
    content = extractTextFromTextFile(filePath);
  } else {
    throw new Error(`Unsupported file type: ${fileName}`);
  }

  if (!content) {
    throw new Error(`No readable text was found in ${fileName}`);
  }

  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    type,
    content,
    fileName,
    importedAt: new Date().toISOString()
  };
}

module.exports = {
  importSourceFromFile
};
