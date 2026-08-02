import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { useDiscovery } from "../hooks/useDiscovery";

const fontBody = { fontFamily: "'Inter', sans-serif" };
const fontMono = { fontFamily: "'JetBrains Mono', monospace" };

/** "3s ago" / "2m ago" — recomputed locally every second, no network calls. */
function formatLastSeen(lastSeen) {
  const seconds = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));
  if (seconds < 1) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

/**
 * components/NearbyDevices.jsx
 * ------------------------------
 * Shows other Beam instances discovered on the LAN via UDP broadcast
 * (see server/src/services/discovery.service.js). Purely additive —
 * a new self-contained panel below the existing upload card, using
 * the same theme tokens as the rest of the app.
 */
export default function NearbyDevices({ theme }) {
  const devices = useDiscovery();
  // Local 1s ticker just to keep "Xs ago" fresh — a UI-only timer,
  // not a network request (the requirement ruled out HTTP polling).
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`rounded-2xl border ${theme.border} ${theme.panel} p-5 sm:p-6 mt-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Wifi className={`w-4 h-4 ${theme.textSubtle}`} strokeWidth={1.75} />
        <span className={`text-sm ${theme.text}`} style={{ ...fontBody, fontWeight: 600 }}>
          Nearby Devices
        </span>
        <span className={`text-xs ${theme.textMuted} ml-auto`} style={fontMono}>
          {devices.length}
        </span>
      </div>

      {devices.length === 0 ? (
        <p className={`text-xs ${theme.textMuted}`} style={fontBody}>
          No other Beam devices found on this network yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => (
            <li
              key={device.deviceId}
              className={`flex items-center justify-between gap-3 rounded-lg border ${theme.border} ${theme.panelAlt} px-3 py-2`}
            >
              <span className={`text-sm truncate ${theme.text}`} style={fontBody}>
                🟢 {device.deviceName}
              </span>
              <span className={`text-xs shrink-0 ${theme.textMuted}`} style={fontMono}>
                {device.ip} · {formatLastSeen(device.lastSeen)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
