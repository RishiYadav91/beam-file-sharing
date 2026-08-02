import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  UploadCloud,
  File as FileIcon,
  Folder,
  Package,
  X,
  Check,
  Copy,
  Sun,
  Moon,
  RadioTower,
  Loader2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { uploadFiles } from "./services/uploadService";
import TransferQrCode from "./components/QrCode";
import { useTransferStatus, TRANSFER_STATUS } from "./hooks/useTransferStatus";
import NearbyDevices from "./components/NearbyDevices";

/* ---------------------------------------------------------
   Fonts — Space Grotesk (display), Inter (body), JetBrains
   Mono (data / filenames / progress readouts).
--------------------------------------------------------- */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @keyframes scanline {
      0% { transform: translateY(-100%); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(2000%); opacity: 0; }
    }
    .scanline {
      animation: scanline 1.8s linear infinite;
    }
    @keyframes riseIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .rise-in {
      animation: riseIn 0.4s ease-out both;
    }
  `}</style>
);

const fontDisplay = { fontFamily: "'Space Grotesk', sans-serif" };
const fontBody = { fontFamily: "'Inter', sans-serif" };
const fontMono = { fontFamily: "'JetBrains Mono', monospace" };

/* ---------------------------------------------------------
   Theme tokens — dark is the default identity; light is a
   clean neutral fallback, not a cream/terracotta re-skin.
--------------------------------------------------------- */
const themes = {
  dark: {
    page: "bg-zinc-950",
    panel: "bg-zinc-900",
    panelAlt: "bg-zinc-800/60",
    border: "border-zinc-800",
    borderStrong: "border-zinc-700",
    text: "text-zinc-100",
    textMuted: "text-zinc-500",
    textSubtle: "text-zinc-400",
    accent: "text-amber-400",
    accentBg: "bg-amber-400",
    accentBgSoft: "bg-amber-400/10",
    accentBorder: "border-amber-400/40",
    ring: "ring-amber-400/30",
    signal: "text-cyan-400",
    signalBg: "bg-cyan-400",
    dropIdle: "border-zinc-700",
    dropHover: "border-amber-400 bg-amber-400/5",
  },
  light: {
    page: "bg-zinc-50",
    panel: "bg-white",
    panelAlt: "bg-zinc-100",
    border: "border-zinc-200",
    borderStrong: "border-zinc-300",
    text: "text-zinc-900",
    textMuted: "text-zinc-500",
    textSubtle: "text-zinc-600",
    accent: "text-amber-600",
    accentBg: "bg-amber-500",
    accentBgSoft: "bg-amber-500/10",
    accentBorder: "border-amber-500/40",
    ring: "ring-amber-500/30",
    signal: "text-cyan-600",
    signalBg: "bg-cyan-500",
    dropIdle: "border-zinc-300",
    dropHover: "border-amber-500 bg-amber-500/5",
  },
};

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Derives a friendlier label + icon for the current selection than a
 * bare file count:
 *  - a folder upload shows the folder's name (from webkitRelativePath)
 *  - a plain multi-file selection shows a generic "Transfer" label
 *  - a single file shows its own filename, as before
 */
function getTransferLabel(files) {
  if (!files || files.length === 0) return { icon: FileIcon, label: "" };

  if (files.length === 1) {
    return { icon: FileIcon, label: files[0].name };
  }

  const rootFolder = files[0].webkitRelativePath?.split("/")[0];
  if (rootFolder) {
    return { icon: Folder, label: rootFolder };
  }

  return { icon: Package, label: "Transfer" };
}

/* ---------------------------------------------------------
   Header
--------------------------------------------------------- */
function Header({ theme, dark, onToggleDark }) {
  return (
    <header className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-md ${theme.accentBgSoft} border ${theme.accentBorder} flex items-center justify-center`}
        >
          <RadioTower className={`w-4 h-4 ${theme.accent}`} strokeWidth={2} />
        </div>
        <span
          className={`text-lg tracking-tight ${theme.text}`}
          style={{ ...fontDisplay, fontWeight: 600 }}
        >
          beam
        </span>
      </div>
      <button
        onClick={onToggleDark}
        aria-label="Toggle dark mode"
        className={`w-9 h-9 rounded-md border ${theme.border} ${theme.panelAlt} flex items-center justify-center hover:${theme.borderStrong} transition-colors`}
      >
        {dark ? (
          <Sun className={`w-4 h-4 ${theme.textSubtle}`} />
        ) : (
          <Moon className={`w-4 h-4 ${theme.textSubtle}`} />
        )}
      </button>
    </header>
  );
}

/* ---------------------------------------------------------
   DropZone
--------------------------------------------------------- */
function DropZone({ theme, onFiles }) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setHover(false);
      // Drag-and-drop is scoped to files (not recursive folder
      // traversal, which needs the separate webkitGetAsEntry API) —
      // folder uploads go through the dedicated picker below.
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      className={`relative overflow-hidden cursor-pointer rounded-xl border-2 border-dashed ${hover ? theme.dropHover : theme.dropIdle
        } transition-colors duration-150 flex flex-col items-center justify-center text-center px-6 py-14 sm:py-16`}
    >
      {hover && (
        <div
          className={`scanline absolute left-0 right-0 h-px ${theme.accentBg} opacity-70`}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && onFiles(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && onFiles(e.target.files)}
      />
      <div
        className={`w-12 h-12 rounded-full ${theme.panelAlt} border ${theme.border} flex items-center justify-center mb-4`}
      >
        <UploadCloud className={`w-5 h-5 ${theme.textSubtle}`} strokeWidth={1.75} />
      </div>
      <p className={`text-sm ${theme.text}`} style={fontBody}>
        <span className={`${theme.accent} font-medium`}>Drop files</span> here or click to
        browse
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          folderInputRef.current?.click();
        }}
        className={`text-xs ${theme.accent} mt-2 underline underline-offset-2 hover:opacity-80 transition-opacity`}
        style={fontBody}
      >
        or select a folder
      </button>
      <p className={`text-xs ${theme.textMuted} mt-1.5`} style={fontMono}>
        max 2 GB · any file type
      </p>
    </div>
  );
}

/* ---------------------------------------------------------
   FilePreview — summary of the current selection
--------------------------------------------------------- */
function FilePreview({ theme, files, onRemove, disabled }) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const { icon: Icon, label } = getTransferLabel(files);

  return (
    <div
      className={`rise-in flex items-center gap-3 rounded-lg border ${theme.border} ${theme.panelAlt} px-4 py-3`}
    >
      <div
        className={`w-9 h-9 shrink-0 rounded-md ${theme.panel} border ${theme.border} flex items-center justify-center`}
      >
        <Icon className={`w-4 h-4 ${theme.textSubtle}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${theme.text}`} style={fontBody}>
          {label}
        </p>
        <p className={`text-xs ${theme.textMuted}`} style={fontMono}>
          {files.length} {files.length === 1 ? "file" : "files"} · {formatBytes(totalSize)}
        </p>
      </div>
      {!disabled && (
        <button
          onClick={onRemove}
          aria-label="Remove selection"
          className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${theme.textMuted} hover:${theme.text} hover:${theme.panel} transition-colors`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   ProgressBar
--------------------------------------------------------- */
function ProgressBar({ theme, progress }) {
  return (
    <div className="rise-in">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${theme.textSubtle}`} style={fontBody}>
          Transmitting…
        </span>
        <span className={`text-xs ${theme.accent}`} style={fontMono}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className={`h-1.5 w-full rounded-full ${theme.panelAlt} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${theme.accentBg} transition-[width] duration-150 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   UploadButton
--------------------------------------------------------- */
function UploadButton({ theme, onClick, status }) {
  const uploading = status === "uploading";
  return (
    <button
      onClick={onClick}
      disabled={uploading}
      className={`w-full rounded-lg ${theme.accentBg} text-zinc-950 text-sm py-3 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60`}
      style={{ ...fontBody, fontWeight: 600 }}
    >
      {uploading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending
        </>
      ) : (
        <>
          <RadioTower className="w-4 h-4" />
          Send
        </>
      )}
    </button>
  );
}

/* ---------------------------------------------------------
   ResultPanel — QR + signal-ring signature
--------------------------------------------------------- */
function ResultPanel({ theme, files, uploadData, onReset, dark }) {
  const [copied, setCopied] = useState(false);
  const link = uploadData?.downloadUrl || "";
  const { status, progress, connected } = useTransferStatus(uploadData?.transferId);
  const statusLabel =
    status === TRANSFER_STATUS.DOWNLOADING && typeof progress === "number"
      ? `${TRANSFER_STATUS.DOWNLOADING} ${progress}%`
      : status;
  const formattedExpiry = uploadData?.expiresAt
    ? new Date(uploadData.expiresAt).toLocaleString()
    : null;
  const totalFiles = uploadData?.totalFiles ?? files?.length ?? 0;
  const totalSize = uploadData?.totalSize ?? files?.reduce((sum, f) => sum + f.size, 0) ?? 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rise-in flex flex-col items-center text-center">
      <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center mb-6">
        <span
          className={`absolute inset-0 rounded-2xl border ${theme.accentBorder} animate-ping opacity-40`}
          style={{ animationDuration: "2.2s" }}
        />
        <span
          className={`absolute inset-3 rounded-2xl border ${theme.accentBorder} animate-ping opacity-30`}
          style={{ animationDuration: "2.2s", animationDelay: "0.4s" }}
        />
        <div
          className={`relative w-full h-full rounded-2xl ${theme.panel} border ${theme.border} p-4`}
        >
          <TransferQrCode value={link} dark={dark} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-1" aria-live="polite">
        <span
          className={`w-1.5 h-1.5 rounded-full ${theme.signalBg} ${
            status !== TRANSFER_STATUS.COMPLETE ? "animate-pulse" : ""
          }`}
        />
        <span className={`text-xs ${theme.textSubtle}`} style={fontMono}>
          {statusLabel}
        </span>
      </div>
      <p className={`text-[11px] ${theme.textMuted} mb-4`} style={fontMono}>
        {connected ? "🟢 Connected" : "🔴 Disconnected"}
      </p>

      <p className={`text-sm ${theme.text} mb-1`} style={fontBody}>
        Scan to receive
      </p>
      {(() => {
        const { icon: Icon, label } = getTransferLabel(files);
        return label ? (
          <p
            className={`flex items-center justify-center gap-1.5 text-sm ${theme.text} mb-1 truncate max-w-full`}
            style={fontBody}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${theme.textSubtle}`} />
            <span className="truncate">{label}</span>
          </p>
        ) : null;
      })()}
      <p className={`text-xs ${theme.textMuted} mb-1 truncate max-w-full`} style={fontMono}>
        {totalFiles} {totalFiles === 1 ? "file" : "files"} · {formatBytes(totalSize)}
      </p>
      {formattedExpiry && (
        <p className={`text-xs ${theme.textMuted} mb-5`} style={fontMono}>
          Expires: {formattedExpiry}
        </p>
      )}

      <div
        className={`w-full flex items-center gap-2 rounded-lg border ${theme.border} ${theme.panelAlt} px-3 py-2.5 mb-3`}
      >
        <span className={`flex-1 text-xs truncate text-left ${theme.textSubtle}`} style={fontMono}>
          {link}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Copy link"
          className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${theme.textMuted} hover:${theme.text} transition-colors`}
        >
          {copied ? (
            <Check className={`w-3.5 h-3.5 ${theme.signal}`} />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <button
        onClick={onReset}
        className={`text-xs flex items-center gap-1.5 ${theme.textMuted} hover:${theme.text} transition-colors`}
        style={fontBody}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Send another file
      </button>
    </div>
  );
}

/* ---------------------------------------------------------
   Footer
--------------------------------------------------------- */
function Footer({ theme }) {
  return (
    <p className={`text-center text-xs ${theme.textMuted} mt-10`} style={fontMono}>
      transfers stay on your network · nothing is stored
    </p>
  );
}

/* ---------------------------------------------------------
   App
--------------------------------------------------------- */
export default function App() {
  const [dark, setDark] = useState(true);
  const theme = dark ? themes.dark : themes.light;

  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [uploadData, setUploadData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const abortControllerRef = useRef(null);

  const handleFiles = (fileList) => {
    setFiles(Array.from(fileList));
    setStatus("idle");
    setProgress(0);
    setErrorMsg(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setStatus("uploading");
    setProgress(0);
    setErrorMsg(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await uploadFiles(
        files,
        (percent) => {
          setProgress(percent);
        },
        controller.signal
      );

      setUploadData(data);
      setStatus("done");
    } catch (err) {
      if (!err.isCancelled) {
        setErrorMsg(err.message || "Upload failed. Please try again.");
        setStatus("error");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setFiles([]);
    setStatus("idle");
    setProgress(0);
    setUploadData(null);
    setErrorMsg(null);
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={`min-h-screen w-full ${theme.page} transition-colors duration-200`}>
      <FontLoader />
      <div className="max-w-md mx-auto px-5 py-12 sm:py-16">
        <Header theme={theme} dark={dark} onToggleDark={() => setDark((d) => !d)} />

        <div
          className={`rounded-2xl border ${theme.border} ${theme.panel} p-5 sm:p-7 shadow-sm`}
        >
          {status === "done" ? (
            <ResultPanel theme={theme} files={files} uploadData={uploadData} onReset={handleReset} dark={dark} />
          ) : (
            <div className="flex flex-col gap-4">
              {files.length === 0 ? (
                <DropZone theme={theme} onFiles={handleFiles} />
              ) : (
                <FilePreview
                  theme={theme}
                  files={files}
                  disabled={status === "uploading"}
                  onRemove={handleReset}
                />
              )}

              {errorMsg && (
                <div
                  className={`rise-in rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center justify-between gap-2`}
                  style={fontBody}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    onClick={() => setErrorMsg(null)}
                    aria-label="Dismiss error"
                    className="shrink-0 text-red-400 hover:text-red-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {status === "uploading" && <ProgressBar theme={theme} progress={progress} />}

              {files.length > 0 && (
                <UploadButton theme={theme} status={status} onClick={handleUpload} />
              )}
            </div>
          )}
        </div>

        <NearbyDevices theme={theme} />

        <Footer theme={theme} />
      </div>
    </div>
  );
}