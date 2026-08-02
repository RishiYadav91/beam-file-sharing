import { useEffect, useState } from "react";
import { subscribeToDeviceUpdates } from "../services/discoveryService";

/**
 * hooks/useDiscovery.js
 * -----------------------
 * Subscribes to the live nearby-device list for as long as the
 * calling component is mounted. Unlike useTransferStatus, this isn't
 * tied to any particular transfer — it's meant to be mounted early
 * (e.g. on the idle upload screen), which is exactly why the shared
 * socket in socketService.js needed reference counting: this hook and
 * useTransferStatus can both be using the same connection at once.
 * @returns {Array<Object>} Current list of nearby devices.
 */
export function useDiscovery() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToDeviceUpdates(setDevices);
    return () => {
      unsubscribe();
      setDevices([]);
    };
  }, []);

  return devices;
}
