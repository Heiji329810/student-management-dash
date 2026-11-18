import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  filePreviewSchema,
  MAX_UPLOAD_BYTES,
  type FilePreview,
} from "@student-dash/shared/uploads";
import { HttpError } from "./errors.js";
let activeParsers = 0;
const types: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain",
};
export async function prepareFile(
  name: string,
  base64: string,
): Promise<{ mime: string; size: number; preview: FilePreview }> {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = types[extension];
  if (!mime)
    throw new HttpError(
      422,
      "Use XLSX, CSV, PDF, DOCX, PNG, JPG, WebP, or TXT files.",
    );
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES)
    throw new HttpError(422, "Files must be between 1 byte and 10 MB.");
  if (bytes.toString("base64") !== base64)
    throw new HttpError(422, "Invalid file encoding.");
  const valid =
    extension === "pdf"
      ? bytes.subarray(0, 5).toString() === "%PDF-"
      : extension === "png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : ["jpg", "jpeg"].includes(extension)
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : extension === "webp"
            ? bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP"
            : ["xlsx", "docx"].includes(extension)
              ? bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))
              : true;
  if (!valid)
    throw new HttpError(422, "The file contents do not match its extension.");
  let preview: FilePreview;
  if (extension === "pdf") preview = { kind: "pdf" };
  else if (mime.startsWith("image/")) preview = { kind: "image" };
  else if (extension === "txt") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new HttpError(422, "Text files must use UTF-8 encoding.");
    }
    if (text.includes("\0")) throw new HttpError(422, "Invalid text file.");
    preview = {
      kind: "text",
      text: text.slice(0, 100_000),
      truncated: text.length > 100_000,
    };
  } else {
    if (activeParsers >= 2)
      throw new HttpError(
        429,
        "Other documents are being processed. Please try again shortly.",
      );
    activeParsers++;
    try {
      preview = await new Promise<FilePreview>((resolve, reject) => {
        const child = fork(
          fileURLToPath(new URL("./filePreviewWorker.mjs", import.meta.url)),
          [],
          {
            execArgv: ["--max-old-space-size=128"],
            env: { PATH: process.env.PATH ?? "", NODE_ENV: "production" },
            stdio: ["ignore", "ignore", "ignore", "ipc"],
          },
        );
        let settled = false;
        const finish = (error?: Error, value?: FilePreview) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          child.kill("SIGKILL");
          error ? reject(error) : resolve(value!);
        };
        const failure = () =>
          new HttpError(
            422,
            "This document is invalid or too complex to preview. Try a smaller file or export it as PDF.",
          );
        const timer = setTimeout(() => finish(failure()), 10_000);
        child.once("error", () => finish(failure()));
        child.once("exit", () => finish(failure()));
        child.once("message", (message: unknown) => {
          const m = message as { ok?: boolean; preview?: unknown };
          const parsed = filePreviewSchema.safeParse(m.preview);
          m.ok && parsed.success
            ? finish(undefined, parsed.data)
            : finish(failure());
        });
        child.send({ extension, base64 });
      });
    } finally {
      activeParsers--;
    }
  }
  return { mime, size: bytes.length, preview };
}
