import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
GlobalWorkerOptions.workerSrc = workerUrl;
export default function UploadPdfPreview({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    const task = getDocument({
      url,
      withCredentials: true,
      enableXfa: false,
      useWasm: false,
      maxImageSize: 16_000_000,
    });
    let active = true;
    task.promise
      .then((value) => {
        if (active) {
          setDocument(value);
          setPage(1);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "This PDF could not be previewed. You can download it instead.",
          );
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let active = true;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    document
      .getPage(page)
      .then((pdfPage) => {
        if (!active || !canvas.current) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({
          scale: Math.min(1.5, 1200 / original.width, 1600 / original.height),
        });
        canvas.current.width = viewport.width;
        canvas.current.height = viewport.height;
        render = pdfPage.render({ canvas: canvas.current, viewport });
        return render.promise;
      })
      .catch((cause) => {
        if (active && cause?.name !== "RenderingCancelledException")
          setError(
            "Unable to render this PDF page. Download the file to view it.",
          );
      });
    return () => {
      active = false;
      render?.cancel();
    };
  }, [document, page]);
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!document && !error && <p role="status">Loading PDF…</p>}
      {document && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous page
          </Button>
          <span className="text-sm">
            Page {page} of {document.numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= document.numPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next page
          </Button>
        </div>
      )}
      <canvas
        ref={canvas}
        aria-label={`PDF page ${page}`}
        className="max-w-full h-auto bg-white"
      />
    </div>
  );
}
