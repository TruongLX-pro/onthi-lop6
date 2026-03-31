const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function main() {
  const [, , inputPdf, ...pageArgs] = process.argv;
  if (!inputPdf) {
    console.error('Usage: node scripts/extract_pdf_text.js <inputPdf> [page1] [page2] ...');
    process.exit(1);
  }

  const pages = pageArgs.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
  const parser = new PDFParse({ data: fs.readFileSync(inputPdf) });

  try {
    const options = pages.length > 0 ? { partial: pages } : undefined;
    const result = await parser.getText(options);
    console.log(result.text);
  } finally {
    await parser.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
