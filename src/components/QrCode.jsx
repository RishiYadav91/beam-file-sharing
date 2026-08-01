import React, { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle } from "lucide-react";

/**
 * components/TransferQrCode.jsx
 * -------------------------------
 * Renders a real, scannable QR code for a single download URL.
 *
 * Isolated from ResultPanel/App.jsx on purpose: this is the only
 * file that knows about the qrcode.react library or QR-specific
 * color mapping. If the QR implementation ever changes (different
 * library, embedded logo, etc.), only this file needs to change.
 *
 * Props:
 *  - value {string}  the exact download URL to encode
 *                     (pass uploadData.downloadUrl — nothing else,
 *                     no JSON, no metadata)
 *  - dark  {boolean} current theme mode. Used only to pick QR
 *                     colors that match the surrounding panel:
 *                     zinc-100 on zinc-900 in dark mode,
 *                     zinc-900 on white in light mode — same pairing
 *                     the placeholder it replaces used.
 */

const QR_COLORS = {
  dark: { fg: "#f4f4f5", bg: "#18181b" }, // zinc-100 on zinc-900
  light: { fg: "#18181b", bg: "#ffffff" }, // zinc-900 on white
};

function TransferQrCode({ value, dark }) {
  // Guard against a missing/malformed downloadUrl so a bad response
  // never crashes the UI with a broken QR render.
  const isValidUrl = useMemo(() => {
    if (!value || typeof value !== "string") return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, [value]);

  if (!isValidUrl) {
    return (
      <div
        role="status"
        className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-3"
      >
        <AlertTriangle className="w-5 h-5 text-zinc-500" aria-hidden="true" />
        <p className="text-xs text-zinc-500">
          QR code unavailable — download link missing
        </p>
      </div>
    );
  }

  const { fg, bg } = dark ? QR_COLORS.dark : QR_COLORS.light;

  return (
    <QRCodeSVG
      value={value}
      size={208}
      bgColor={bg}
      fgColor={fg}
      level="M"
      marginSize={2}
      title="QR code linking to the uploaded file's download page"
      role="img"
      aria-label={`QR code that links to the download page for this file. If it doesn't scan, use the link below: ${value}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

// Memoized so this only re-renders when the encoded value or the
// theme mode actually changes — not on every ResultPanel re-render
// (e.g. the "copied" state toggling from the copy-link button).
export default React.memo(TransferQrCode);
