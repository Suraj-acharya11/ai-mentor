const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph } = require("docx");
const PptxGenJS = require("pptxgenjs");
const { importSourceFromFile } = require("../electron/source-import.cjs");

const tempDir = path.join(__dirname, "..", "tmp", "verification");

async function ensureDir() {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function createTxt() {
  const filePath = path.join(tempDir, "study-notes.txt");
  fs.writeFileSync(filePath, "Photosynthesis needs sunlight, water, and carbon dioxide. Plants produce glucose and oxygen.");
  return filePath;
}

async function createPdf() {
  const filePath = path.join(tempDir, "study-summary.pdf");

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(14).text("Mitochondria are the powerhouse of the cell. They help release energy from food.");
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return filePath;
}

async function createDocx() {
  const filePath = path.join(tempDir, "faculty-handout.docx");
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph("Newton's second law states that force equals mass times acceleration.")
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(document);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function createPptx() {
  const filePath = path.join(tempDir, "lecture-slides.pptx");
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText("Supply can rise when price rises, if other factors stay constant.", {
    x: 0.5,
    y: 0.8,
    w: 8,
    h: 1
  });
  await pptx.writeFile({ fileName: filePath });
  return filePath;
}

async function main() {
  await ensureDir();
  const files = await Promise.all([createTxt(), createPdf(), createDocx(), createPptx()]);
  const imported = [];

  for (const filePath of files) {
    const result = await importSourceFromFile(filePath);
    imported.push({
      file: path.basename(filePath),
      type: result.type,
      contentPreview: result.content.slice(0, 120)
    });
  }

  console.log(JSON.stringify(imported, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
