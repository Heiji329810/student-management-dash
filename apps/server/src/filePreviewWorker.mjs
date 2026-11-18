// Untrusted document parsers run in a disposable, memory/time-limited child process.
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { parse } from "csv-parse/sync";
process.once("message", async ({ extension, base64 }) => {
  try {
    const buffer = Buffer.from(base64, "base64");
    let preview;
    if (extension === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      preview = {
        kind: "text",
        text: result.value.slice(0, 100_000),
        truncated: result.value.length > 100_000,
      };
    } else if (extension === "csv") {
      const rows = parse(
        new TextDecoder("utf-8", { fatal: true }).decode(buffer),
        {
          bom: true,
          skip_empty_lines: true,
          relax_column_count: true,
          max_record_size: 100_000,
          to: 101,
        },
      );
      preview = {
        kind: "spreadsheet",
        sheets: [
          {
            name: "CSV",
            rows: rows
              .slice(0, 100)
              .map((row) =>
                row.slice(0, 30).map((value) => String(value).slice(0, 500)),
              ),
            truncated: rows.length > 100 || rows.some((row) => row.length > 30),
          },
        ],
        truncated: false,
      };
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      preview = {
        kind: "spreadsheet",
        sheets: workbook.worksheets.slice(0, 10).map((sheet) => ({
          name: sheet.name,
          rows: Array.from({ length: Math.min(sheet.rowCount, 100) }, (_, r) =>
            Array.from({ length: Math.min(sheet.columnCount, 30) }, (_, c) =>
              sheet
                .getRow(r + 1)
                .getCell(c + 1)
                .text.slice(0, 500),
            ),
          ),
          truncated: sheet.rowCount > 100 || sheet.columnCount > 30,
        })),
        truncated: workbook.worksheets.length > 10,
      };
    }
    if (JSON.stringify(preview).length > 2_000_000)
      throw Error("Preview too large");
    process.send({ ok: true, preview }, () => process.exit(0));
  } catch {
    process.send({ ok: false }, () => process.exit(0));
  }
});
