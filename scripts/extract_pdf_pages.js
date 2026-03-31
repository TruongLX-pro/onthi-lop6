const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function main() {
  const [, , inputPdf, outputDir, ...pageArgs] = process.argv;
  if (!inputPdf || !outputDir || pageArgs.length === 0) {
    console.error('Usage: node scripts/extract_pdf_pages.js <inputPdf> <outputDir> <page1> [page2] ...');
    process.exit(1);
  }

  const pages = pageArgs.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
  if (pages.length === 0) {
    console.error('No valid page numbers.');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const parser = new PDFParse({ data: fs.readFileSync(inputPdf) });

  try {
    const result = await parser.getScreenshot({
      partial: pages,
      desiredWidth: 1400,
      imageDataUrl: false,
      imageBuffer: true
    });

    for (let index = 0; index < result.pages.length; index += 1) {
      const pageNumber = pages[index];
      const outputPath = path.join(outputDir, `page-${String(pageNumber).padStart(3, '0')}.png`);
      fs.writeFileSync(outputPath, result.pages[index].data);
      console.log(outputPath);
    }
  } finally {
    await parser.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
