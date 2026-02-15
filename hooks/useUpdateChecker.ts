import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import { getSettings } from "../utils/settings";

export function useUpdateChecker() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkUpdate = useCallback(async (manual = false) => {
    if (__DEV__) {
      if (manual) {
        setStatus("Development Mode (EAS disabled)");
        setTimeout(() => setStatus(null), 3000);
      }
      return;
    }

    if (!Updates.isEnabled) {
      if (manual) {
        setStatus("EAS Updates not enabled");
        setTimeout(() => setStatus(null), 3000);
      }
      return;
    }

    try {
      setIsChecking(true);
      if (manual) setStatus("Checking for updates...");

      const update = await Updates.checkForUpdateAsync();
      setLastChecked(Date.now());

      if (update.isAvailable) {
        setStatus("Downloading update...");
        await Updates.fetchUpdateAsync();
        setStatus("Update Ready");
        setIsAvailable(true);
      } else {
        if (manual) {
          setStatus("No updates available");
          setTimeout(() => setStatus(null), 3000);
        } else {
          setStatus(null);
        }
        setIsAvailable(false);
      }
    } catch (err: any) {
      console.log("Update error:", err);
      if (manual) setStatus("Update Error");
      setError(err?.message ?? "Unknown error");
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const settings = await getSettings();
      if (settings.autoUpdate) {
        checkUpdate(false);
      }
    }
    init();
  }, [checkUpdate]);

  return {
    status,
    error,
    isAvailable,
    lastChecked,
    isChecking,
    checkUpdate,
    setStatus, // Exported to allow manual clearing or setting custom messages if needed
  };
}
