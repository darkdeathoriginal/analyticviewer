/**
 * Re-export from react-native-github-ota.
 *
 * This file used to contain the full OTA logic.
 * It's now a thin wrapper that configures and re-exports from the extracted package.
 */
import {
  configureOta,
  useGithubOta,
  type UpdateInfo,
} from "react-native-github-ota";
import { BUILD_INFO } from "../constants/buildInfo";
import { getSettings } from "../utils/settings";

// Configure the package once on import
configureOta({
  owner: "darkdeathoriginal",
  repo: "analyticviewer",
  branch: "main",
  releaseTag: "ota-latest",
});

export type { UpdateInfo };

/**
 * App-specific wrapper around useGithubOta.
 * Passes in the embedded build info and auto-update settings check.
 */
export function useUpdateChecker(autoCheckOnMount = true) {
  return useGithubOta({
    autoCheckOnMount,
    buildInfo: BUILD_INFO,
    shouldAutoCheck: async () => {
      const settings = await getSettings();
      return settings.autoUpdate;
    },
  });
}
