import { useEffect, useState } from "react";
import { acquireSocket, joinTransfer, releaseSocket, peekSocket } from "../services/socketService";

/**
 * hooks/useTransferStatus.js
 * ---------------------------
 * Subscribes to the transfer-status Socket.IO events for a given
 * fileId and exposes them as a display-ready status string, a live
 * download progress percentage, and the raw socket connection state.
 * Keeps all socket wiring out of App.jsx/ResultPanel — components
 * just call this hook and render whatever comes back.
 *
 * transfer:receiver_connected    -> "Receiver connected"
 * transfer:download_started      -> "Downloading..."
 * transfer:download_progress     -> updates `progress` (0-100)
 * transfer:download_completed    -> "Transfer complete"
 * transfer:receiver_disconnected -> back to "Waiting for receiver..."
 *                                    (the receiver left, so we're waiting again)
 */

export const TRANSFER_STATUS = {
  WAITING: "Waiting for receiver...",
  CONNECTED: "Receiver connected",
  DOWNLOADING: "Downloading...",
  COMPLETE: "Transfer complete",
};

const EVENTS = {
  RECEIVER_CONNECTED: "transfer:receiver_connected",
  DOWNLOAD_STARTED: "transfer:download_started",
  DOWNLOAD_PROGRESS: "transfer:download_progress",
  DOWNLOAD_COMPLETED: "transfer:download_completed",
  RECEIVER_DISCONNECTED: "transfer:receiver_disconnected",
};

export function useTransferStatus(fileId) {
  const [prevFileId, setPrevFileId] = useState(fileId);
  const [status, setStatus] = useState(TRANSFER_STATUS.WAITING);
  const [progress, setProgress] = useState(null);
  // Lazy initializer only *reads* an already-existing socket (never
  // creates one), so this can't trigger a connection before upload.
  const [connected, setConnected] = useState(() => peekSocket()?.connected ?? false);

  // Reset per-transfer state whenever this hook starts tracking a
  // different fileId. Done during render — React's documented pattern
  // for "adjusting state when a prop changes" — rather than as a
  // synchronous setState at the top of the effect below.
  if (fileId !== prevFileId) {
    setPrevFileId(fileId);
    setStatus(TRANSFER_STATUS.WAITING);
    setProgress(null);
  }

  useEffect(() => {
    if (!fileId) return undefined;

    const socket = acquireSocket();
    joinTransfer(fileId);

    const handleReceiverConnected = () => setStatus(TRANSFER_STATUS.CONNECTED);
    const handleDownloadStarted = () => {
      setStatus(TRANSFER_STATUS.DOWNLOADING);
      setProgress(0);
    };
    const handleDownloadProgress = (payload) => setProgress(payload?.percent ?? null);
    const handleDownloadCompleted = () => {
      setStatus(TRANSFER_STATUS.COMPLETE);
      setProgress(100);
    };
    const handleReceiverDisconnected = () => {
      setStatus(TRANSFER_STATUS.WAITING);
      setProgress(null);
    };
    const handleSocketConnect = () => setConnected(true);
    const handleSocketDisconnect = () => setConnected(false);

    // The socket instance is a shared singleton, so defensively strip
    // this exact set of handlers before attaching them — guards
    // against duplicate listeners from StrictMode's double-invoked
    // effects or a fileId change re-running this effect.
    socket.off(EVENTS.RECEIVER_CONNECTED, handleReceiverConnected);
    socket.off(EVENTS.DOWNLOAD_STARTED, handleDownloadStarted);
    socket.off(EVENTS.DOWNLOAD_PROGRESS, handleDownloadProgress);
    socket.off(EVENTS.DOWNLOAD_COMPLETED, handleDownloadCompleted);
    socket.off(EVENTS.RECEIVER_DISCONNECTED, handleReceiverDisconnected);
    socket.off("connect", handleSocketConnect);
    socket.off("disconnect", handleSocketDisconnect);

    socket.on(EVENTS.RECEIVER_CONNECTED, handleReceiverConnected);
    socket.on(EVENTS.DOWNLOAD_STARTED, handleDownloadStarted);
    socket.on(EVENTS.DOWNLOAD_PROGRESS, handleDownloadProgress);
    socket.on(EVENTS.DOWNLOAD_COMPLETED, handleDownloadCompleted);
    socket.on(EVENTS.RECEIVER_DISCONNECTED, handleReceiverDisconnected);
    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);

    return () => {
      socket.off(EVENTS.RECEIVER_CONNECTED, handleReceiverConnected);
      socket.off(EVENTS.DOWNLOAD_STARTED, handleDownloadStarted);
      socket.off(EVENTS.DOWNLOAD_PROGRESS, handleDownloadProgress);
      socket.off(EVENTS.DOWNLOAD_COMPLETED, handleDownloadCompleted);
      socket.off(EVENTS.RECEIVER_DISCONNECTED, handleReceiverDisconnected);
      socket.off("connect", handleSocketConnect);
      socket.off("disconnect", handleSocketDisconnect);
      releaseSocket();
    };
  }, [fileId]);

  return { status, progress, connected };
}
