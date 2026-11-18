import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Upload,
  Download,
  FileText,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import {
  filePreviewSchema,
  uploadDetailSchema,
  uploadListSchema,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  type UploadDetail,
  type UploadSummary,
  type FilePreview,
} from "@student-dash/shared/uploads";
import { useApp } from "@/context/useApp";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const PdfPreview = lazy(() => import("./UploadPdfPreview"));
async function responseData(response: Response) {
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error?.message ||
        (response.status === 429
          ? "Too many requests. Try again shortly."
          : "Unable to complete this request."),
    );
  return data;
}
function formatSize(size: number) {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil(size / 1024))} KB`;
}
export function StudentFiles({ applicationId }: { applicationId: string }) {
  const basePath = `/api/club-applications/${encodeURIComponent(applicationId)}/uploads`;
  const { currentUser } = useApp();
  const { language } = useLanguage();
  const zh = language !== "en";
  const [params, setParams] = useSearchParams();
  const selected = params.get("upload");
  const [items, setItems] = useState<UploadSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [detail, setDetail] = useState<UploadDetail | null>(null);
  const [versionId, setVersionId] = useState("");
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [sheet, setSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [now, setNow] = useState(Date.now);
  const input = useRef<HTMLInputElement>(null);
  const writing = useRef(false);
  const mounted = useRef(true);
  const detailSequence = useRef(0);
  const teacher = currentUser?.role === "founder";
  const readOnly =
    !!currentUser?.readOnly ||
    !!(currentUser?.expiresAt && now >= Date.parse(currentUser.expiresAt));
  const copy = (en: string, cn: string) => (zh ? cn : en);
  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);
  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const data = uploadListSchema.parse(
        await responseData(
          await fetch(`${basePath}?offset=${offset}`, {
            credentials: "same-origin",
            cache: "no-store",
          }),
        ),
      );
      if (mounted.current) {
        setItems((previous) =>
          offset
            ? [
                ...previous,
                ...data.items.filter(
                  (item) => !previous.some((p) => p.id === item.id),
                ),
              ]
            : data.items,
        );
        setNextOffset(data.nextOffset);
      }
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error ? cause.message : "Unable to load files.",
        );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [basePath]);
  const loadDetail = useCallback(async (id: string) => {
    const sequence = ++detailSequence.current;
    setDetailLoading(true);
    setPreview(null);
    try {
      const data = uploadDetailSchema.parse(
        await responseData(
          await fetch(`${basePath}/${encodeURIComponent(id)}`, {
            credentials: "same-origin",
            cache: "no-store",
          }),
        ),
      );
      if (mounted.current && sequence === detailSequence.current) {
        setDetail(data);
        setVersionId(data.versions[0]?.id ?? "");
      }
    } catch (cause) {
      if (mounted.current && sequence === detailSequence.current) {
        setDetail(null);
        setError(
          cause instanceof Error ? cause.message : "Unable to load file.",
        );
      }
    } finally {
      if (mounted.current && sequence === detailSequence.current)
        setDetailLoading(false);
    }
  }, [basePath]);
  useEffect(() => {
    void load();
  }, [load, currentUser?.id]);
  useEffect(() => {
    if (selected) void loadDetail(selected);
    else {
      ++detailSequence.current;
      setDetail(null);
      setPreview(null);
      setVersionId("");
    }
    setReplace(false);
    setComment("");
  }, [selected, loadDetail]);
  useEffect(() => {
    if (!selected || !versionId) return;
    const controller = new AbortController();
    setPreviewLoading(true);
    setPreview(null);
    setSheet(0);
    void fetch(
      `${basePath}/${encodeURIComponent(selected)}/versions/${encodeURIComponent(versionId)}/preview`,
      {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(responseData)
      .then((data) => {
        if (!controller.signal.aborted)
          setPreview(filePreviewSchema.parse(data));
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Unable to preview file.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    return () => controller.abort();
  }, [selected, versionId, basePath]);
  function select(id: string) {
    setError("");
    setMessage("");
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("upload", id);
        return next;
      },
      { replace: true },
    );
  }
  async function mutate(path: string, body: Record<string, unknown>) {
    return responseData(
      await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedUserId: currentUser?.id }),
      }),
    );
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || writing.current || readOnly) return;
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      setError(
        copy(
          "Choose a non-empty file up to 10 MB.",
          "請選擇不超過 10 MB 的非空白檔案。",
        ),
      );
      return;
    }
    writing.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Unable to read this file."));
        reader.readAsDataURL(file);
      });
      const isReplacement = replace && detail;
      const data = await mutate(
        isReplacement
          ? `${basePath}/${detail.upload.id}/versions`
          : basePath,
        {
          name: file.name,
          base64,
          ...(isReplacement
            ? { expectedVersion: detail.upload.currentVersion }
            : {}),
        },
      );
      if (!mounted.current) return;
      setFile(null);
      if (input.current) input.current.value = "";
      setReplace(false);
      setMessage(
        copy(
          "File shared with teachers. You can recall it for the next 10 minutes.",
          "檔案已分享給教師。您可在接下來 10 分鐘內撤回。",
        ),
      );
      await load();
      if (selected === data.id) await loadDetail(data.id);
      else select(data.id);
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function recall() {
    if (!detail || writing.current || readOnly) return;
    writing.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await mutate(`${basePath}/${detail.upload.id}/recall`, {
        expectedVersion: detail.upload.currentVersion,
      });
      await load();
      await loadDetail(detail.upload.id);
      setMessage(
        copy(
          "Upload recalled. Teachers can no longer access it here.",
          "檔案已撤回，教師無法再於此處存取。",
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to recall file.",
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  async function postComment(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || !versionId || writing.current || readOnly) return;
    writing.current = true;
    setBusy(true);
    setError("");
    const reviewedVersion = versionId;
    try {
      await mutate(`${basePath}/${detail.upload.id}/comments`, {
        versionId: reviewedVersion,
        body: comment,
      });
      setComment("");
      await loadDetail(detail.upload.id);
      setVersionId(reviewedVersion);
      setMessage(
        copy(
          "Feedback sent. The student will receive a notification.",
          "回饋已送出，學生將收到通知。",
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to send feedback.",
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const version = detail?.versions.find((v) => v.id === versionId);
  const contentUrl =
    selected && versionId
      ? `${basePath}/${encodeURIComponent(selected)}/versions/${encodeURIComponent(versionId)}/content`
      : "";
  const remaining = detail
    ? Math.max(
        0,
        Math.ceil((Date.parse(detail.upload.recallUntil) - now) / 1000),
      )
    : 0;
  const feedback =
    detail?.comments.filter((c) => c.versionId === versionId) ?? [];
  return (
    <section
      id="student-files"
      data-i18n-managed
      aria-labelledby="student-files-title"
      className="space-y-5 border-t pt-8 scroll-mt-32"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="student-files-title"
            className="text-2xl font-bold flex items-center gap-2"
          >
            <FileText className="h-6 w-6" />
            {teacher
              ? copy("Application file", "申請附件")
              : copy("Application file", "申請附件")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {teacher
              ? copy(
                  "Preview the file attached to this application, download files, and leave feedback on the version you reviewed.",
                  "預覽學生提交的檔案、下載，並針對您檢閱的版本留下回饋。",
                )
              : copy(
                  "Review your application file and teacher feedback. You can replace the file or recall it within 10 minutes.",
                  "與教師分享檔案。只有您和教師可以存取您的檔案。",
                )}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy || loading}
          onClick={() => {
            setError("");
            void load();
            if (selected) void loadDetail(selected);
          }}
        >
          {copy("Refresh files", "重新整理")}
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md bg-muted p-3 text-sm">
          {message}
        </p>
      )}
      {!teacher && replace && (
        <form onSubmit={upload} className="space-y-3 rounded-lg border p-4">
          <label htmlFor="student-file-input" className="block font-medium">
            {replace && detail
              ? copy(
                  `Replace: ${detail.upload.name}`,
                  `替換：${detail.upload.name}`,
                )
              : copy("Upload a file", "上傳檔案")}
          </label>
          <p id="student-file-help" className="text-sm text-muted-foreground">
            {copy(
              "Excel (.xlsx), CSV, PDF, Word (.docx), PNG, JPG, WebP, or TXT. Up to 10 MB per file; 100 MB total including older versions.",
              "支援 Excel (.xlsx)、CSV、PDF、Word (.docx)、PNG、JPG、WebP 或 TXT。每個檔案上限 10 MB，包含舊版本的總容量上限為 100 MB。",
            )}
          </p>
          {readOnly ? (
            <p className="text-sm">
              {copy(
                "Your account is read-only. You can still preview and download your existing files.",
                "您的帳號為唯讀模式，仍可預覽和下載現有檔案。",
              )}
            </p>
          ) : (
            <>
              <Input
                ref={input}
                id="student-file-input"
                type="file"
                accept={UPLOAD_ACCEPT}
                disabled={busy}
                aria-describedby="student-file-help"
                className="h-auto py-2"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError("");
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || !file}>
                  <Upload className="mr-2 h-4 w-4" />
                  {busy
                    ? copy("Saving…", "儲存中…")
                    : replace
                      ? copy("Upload replacement", "上傳替換版本")
                      : copy("Share with teachers", "分享給教師")}
                </Button>
                {replace && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setReplace(false)}
                  >
                    {copy("Cancel replacement", "取消替換")}
                  </Button>
                )}
              </div>
              {replace && (
                <p className="text-xs text-muted-foreground">
                  {copy(
                    "The previous version and its comments are kept. A replacement starts a fresh 10-minute recall window.",
                    "先前版本與留言會保留。替換檔案後將重新開始 10 分鐘撤回期限。",
                  )}
                </p>
              )}
            </>
          )}
        </form>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
        <div className="space-y-3">
          <h3 className="font-semibold">
            {teacher
              ? copy("Submissions", "提交檔案")
              : copy("Your submissions", "您提交的檔案")}
          </h3>
          {loading && (
            <p role="status" className="text-sm text-muted-foreground">
              {copy("Loading files…", "載入檔案中…")}
            </p>
          )}
          {!loading && items.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              {teacher
                ? copy(
                    "No student files have been shared yet.",
                    "尚未有學生分享檔案。",
                  )
                : copy(
                    "No file is attached to this application.",
                    "尚無檔案。請在上方選擇檔案以分享給教師。",
                  )}
            </p>
          )}
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => select(item.id)}
                  aria-pressed={selected === item.id}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === item.id ? "border-primary bg-muted" : "border-border"}`}
                >
                  <span className="block break-all font-medium">
                    {item.name}
                  </span>
                  {teacher && (
                    <span className="mt-1 block text-sm">
                      {item.ownerName} · {item.studentId}
                    </span>
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatSize(item.size)} · {copy("Version", "版本")}{" "}
                    {item.currentVersion} ·{" "}
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="mt-1 block text-xs">
                    {item.recalled
                      ? copy(
                          "Recalled · visible only to you",
                          "已撤回 · 僅您可見",
                        )
                      : copy("Shared with teachers", "已分享給教師")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {nextOffset !== null && (
            <Button
              variant="outline"
              disabled={loading || busy}
              onClick={() => void load(nextOffset)}
            >
              {copy("Load more", "載入更多")}
            </Button>
          )}
        </div>
        <div className="min-w-0 space-y-5">
          {detailLoading ? (
            <p role="status">{copy("Opening file…", "開啟檔案中…")}</p>
          ) : detail ? (
            <>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold break-all">
                  {detail.upload.name}
                </h3>
                <label
                  htmlFor="file-version"
                  className="block text-sm font-medium"
                >
                  {copy("Version to preview", "預覽版本")}
                </label>
                <select
                  id="file-version"
                  value={versionId}
                  disabled={busy}
                  onChange={(event) => {
                    setVersionId(event.target.value);
                    setComment("");
                    setError("");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {detail.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {copy("Version", "版本")} {v.version} — {v.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {version && (
                    <Button asChild variant="outline">
                      <a href={contentUrl} download={version.name}>
                        <Download className="mr-2 h-4 w-4" />
                        {copy("Download file", "下載檔案")}
                      </a>
                    </Button>
                  )}
                  {!teacher && !readOnly && (
                    <>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setReplace(true);
                          input.current?.focus();
                          input.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }}
                      >
                        {copy("Replace file", "替換檔案")}
                      </Button>
                      {!detail.upload.recalled && remaining > 0 && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => void recall()}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {copy("Recall upload", "撤回檔案")} (
                          {Math.floor(remaining / 60)}:
                          {String(remaining % 60).padStart(2, "0")})
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {!teacher && !detail.upload.recalled && (
                  <p className="text-xs text-muted-foreground">
                    {remaining > 0
                      ? copy(
                          "Recall removes teacher access here, but cannot remove copies already downloaded.",
                          "撤回會移除教師在此處的存取權限，但無法刪除已下載的副本。",
                        )
                      : copy(
                          "The recall window has ended. You may still upload a replacement.",
                          "撤回期限已結束，您仍可上傳替換版本。",
                        )}
                  </p>
                )}
              </div>
              <div
                className="min-w-0 rounded-lg border p-3 sm:p-4"
                aria-label={copy("File preview", "檔案預覽")}
              >
                {previewLoading ? (
                  <p role="status">{copy("Loading preview…", "載入預覽中…")}</p>
                ) : preview?.kind === "spreadsheet" ? (
                  <div className="space-y-3">
                    {preview.sheets.length > 1 && (
                      <>
                        <label htmlFor="preview-sheet" className="text-sm">
                          {copy("Worksheet", "工作表")}
                        </label>
                        <select
                          id="preview-sheet"
                          value={sheet}
                          onChange={(event) =>
                            setSheet(Number(event.target.value))
                          }
                          className="ml-2 max-w-full rounded border bg-background p-2"
                        >
                          {preview.sheets.map((s, i) => (
                            <option key={i} value={i}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {copy(
                        "Table preview: up to 100 rows and 30 columns per sheet. Formulas are not executed. Download for the complete workbook and formatting.",
                        "表格預覽：每個工作表最多顯示 100 列、30 欄，不執行公式。請下載以查看完整活頁簿與格式。",
                      )}
                    </p>
                    {preview.sheets[sheet]?.rows.length ? (
                      <div className="max-h-[480px] overflow-auto">
                        <table className="w-full border-collapse text-sm">
                          <tbody>
                            {preview.sheets[sheet].rows.map((row, i) => (
                              <tr key={i}>
                                <th
                                  scope="row"
                                  className="border bg-muted p-2 text-xs font-normal text-muted-foreground"
                                >
                                  {i + 1}
                                </th>
                                {row.map((cell, j) => (
                                  <td
                                    key={j}
                                    className="min-w-24 max-w-80 whitespace-pre-wrap break-words border p-2 align-top"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm">
                        {copy("This worksheet is empty.", "此工作表為空白。")}
                      </p>
                    )}
                    {(preview.truncated ||
                      preview.sheets[sheet]?.truncated) && (
                      <p className="text-xs text-muted-foreground">
                        {copy(
                          "This preview is shortened. Download to see the full file.",
                          "此預覽已截短，請下載以查看完整內容。",
                        )}
                      </p>
                    )}
                  </div>
                ) : preview?.kind === "text" ? (
                  <>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {copy(
                        "Text preview. Download to see original document formatting.",
                        "文字預覽。請下載以查看原始文件格式。",
                      )}
                    </p>
                    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm">
                      {preview.text ||
                        copy("No text content.", "沒有文字內容。")}
                    </pre>
                    {preview.truncated && (
                      <p className="mt-3 text-xs">
                        {copy(
                          "Preview shortened. Download for the full document.",
                          "預覽已截短，請下載完整文件。",
                        )}
                      </p>
                    )}
                  </>
                ) : preview?.kind === "image" ? (
                  <img
                    src={`${contentUrl}?inline=1`}
                    alt={version?.name ?? "Uploaded image"}
                    className="max-h-[600px] max-w-full object-contain"
                  />
                ) : preview?.kind === "pdf" ? (
                  <Suspense fallback={<p role="status">Loading PDF viewer…</p>}>
                    <PdfPreview key={contentUrl} url={contentUrl} />
                  </Suspense>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {copy(
                      "Select a file version to preview it.",
                      "選擇檔案版本以預覽。",
                    )}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {copy("Teacher feedback", "教師回饋")} ·{" "}
                  {copy("Version", "版本")} {version?.version}
                </h4>
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {copy(
                      "No feedback on this version yet.",
                      "此版本尚無回饋。",
                    )}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {feedback.map((c) => (
                      <li key={c.id} className="rounded-md bg-muted/50 p-3">
                        <p className="text-sm font-medium">
                          {c.teacherName}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                          {c.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {teacher && !readOnly && (
                  <form onSubmit={postComment} className="space-y-2">
                    <label
                      htmlFor="file-feedback"
                      className="text-sm font-medium"
                    >
                      {copy("Leave feedback for the student", "留下回饋給學生")}
                    </label>
                    <textarea
                      id="file-feedback"
                      rows={3}
                      maxLength={4000}
                      required
                      value={comment}
                      disabled={busy}
                      onChange={(event) => setComment(event.target.value)}
                      className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button type="submit" disabled={busy || !comment.trim()}>
                      {busy
                        ? copy("Sending…", "送出中…")
                        : copy("Send feedback", "送出回饋")}
                    </Button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              {copy(
                "Select a submission to preview it and read feedback.",
                "選擇提交的檔案以預覽和查看回饋。",
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
