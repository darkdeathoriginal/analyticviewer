import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler } from "react-native";
import { BUILD_INFO } from "../constants/buildInfo";
import { getSettings } from "../utils/settings";

const GITHUB_OWNER = "darkdeathoriginal";
const GITHUB_REPO = "analyticviewer";
const GITHUB_BRANCH = "main";

const OTA_RELEASE_TAG = "ota-latest";
const OTA_DIR = `${FileSystem.documentDirectory}ota/`;
const OTA_BUNDLE_PATH = `${OTA_DIR}index.android.bundle`;
const OTA_META_PATH = `${OTA_DIR}meta.json`;

interface GitCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

interface CompareResponse {
  status: "ahead" | "behind" | "identical" | "diverged";
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitCommit[];
}

interface OtaManifest {
  commitHash: string;
  commitShort: string;
  commitMessage: string;
  createdAt: string;
  bundleFile: string;
}

interface GitReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitRelease {
  tag_name: string;
  html_url: string;
  assets: GitReleaseAsset[];
}

export interface UpdateInfo {
  latestCommit: string;
  latestCommitShort: string;
  commitMessage: string;
  commitDate: string;
  newCommitCount: number;
  hasOtaBundle: boolean;
}

export function useUpdateChecker(autoCheckOnMount = true) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkUpdate = useCallback(async (manual = false) => {
    try {
      setIsChecking(true);
      setError(null);
      if (manual) setStatus("Checking for updates...");

      const currentSha = BUILD_INFO.commitHash;

      // Check if we already have an applied OTA that matches remote
      const appliedOta = await getAppliedOtaMeta();

      // Use the compare API to check how many commits remote is ahead
      let latestSha: string;
      let commitMessage: string;
      let commitDate: string;
      let newCommitCount = 0;

      const compareRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/compare/${currentSha}...${GITHUB_BRANCH}`,
        { headers: { Accept: "application/vnd.github.v3+json" } },
      );

      if (compareRes.ok) {
        const compareData: CompareResponse = await compareRes.json();
        if (
          compareData.status !== "ahead" &&
          compareData.status !== "diverged"
        ) {
          // Also check if an OTA is already applied and up to date
          if (appliedOta && appliedOta.commitHash === currentSha) {
            // We're on OTA that matches build - clean
          }
          handleUpToDate(manual);
          return;
        }
        const latest = compareData.commits[compareData.commits.length - 1];
        latestSha = latest.sha;
        commitMessage = latest.commit.message.split("\n")[0];
        commitDate = latest.commit.author.date;
        newCommitCount = compareData.ahead_by;
      } else {
        // Fallback to HEAD check
        const headRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`,
          { headers: { Accept: "application/vnd.github.v3+json" } },
        );
        if (!headRes.ok) {
          throw new Error(`GitHub API error: ${headRes.status}`);
        }
        const headData: GitCommit = await headRes.json();
        if (headData.sha === currentSha) {
          handleUpToDate(manual);
          return;
        }
        latestSha = headData.sha;
        commitMessage = headData.commit.message.split("\n")[0];
        commitDate = headData.commit.author.date;
      }

      setLastChecked(Date.now());

      // Check if the applied OTA already matches the latest remote commit
      if (appliedOta && appliedOta.commitHash === latestSha) {
        handleUpToDate(manual);
        return;
      }

      // Check if OTA bundle exists in the ota-latest release
      let hasOtaBundle = false;
      try {
        const releaseRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${OTA_RELEASE_TAG}`,
          { headers: { Accept: "application/vnd.github.v3+json" } },
        );
        if (releaseRes.ok) {
          const releaseData: GitRelease = await releaseRes.json();
          hasOtaBundle = releaseData.assets.some(
            (a) => a.name === "index.android.bundle",
          );
        }
      } catch {
        // No OTA release
      }

      setUpdateInfo({
        latestCommit: latestSha,
        latestCommitShort: latestSha.slice(0, 7),
        commitMessage,
        commitDate,
        newCommitCount,
        hasOtaBundle,
      });

      setStatus("Update Available");
      setIsAvailable(true);
    } catch (err: any) {
      const errorMsg = err?.message ?? "Unknown error";
      console.log("Update check error:", errorMsg);
      if (manual) setStatus(`Update check failed: ${errorMsg}`);
      setError(errorMsg);
      setTimeout(() => {
        setStatus(null);
        setError(null);
      }, 5000);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleUpToDate = (manual: boolean) => {
    if (manual) {
      setStatus("You're up to date!");
      setTimeout(() => setStatus(null), 3000);
    } else {
      setStatus(null);
    }
    setIsAvailable(false);
    setUpdateInfo(null);
  };

  const getAppliedOtaMeta = async (): Promise<OtaManifest | null> => {
    try {
      const metaInfo = await FileSystem.getInfoAsync(OTA_META_PATH);
      if (metaInfo.exists) {
        const content = await FileSystem.readAsStringAsync(OTA_META_PATH);
        return JSON.parse(content);
      }
    } catch {
      // No meta file
    }
    return null;
  };

  const downloadAndApplyUpdate = useCallback(async () => {
    if (!updateInfo) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setStatus("Downloading update...");

      // Fetch the OTA release to get download URLs
      const releaseRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${OTA_RELEASE_TAG}`,
        { headers: { Accept: "application/vnd.github.v3+json" } },
      );

      if (!releaseRes.ok) {
        throw new Error(
          "OTA release not found. Push to main to trigger a build.",
        );
      }

      const releaseData: GitRelease = await releaseRes.json();
      const bundleAsset = releaseData.assets.find(
        (a) => a.name === "index.android.bundle",
      );
      const manifestAsset = releaseData.assets.find(
        (a) => a.name === "ota-manifest.json",
      );

      if (!bundleAsset) {
        throw new Error("No bundle found in OTA release");
      }

      // Ensure OTA directory exists
      const dirInfo = await FileSystem.getInfoAsync(OTA_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(OTA_DIR, { intermediates: true });
      }

      // Download the bundle
      setStatus("Downloading bundle...");
      const downloadResult = await FileSystem.downloadAsync(
        bundleAsset.browser_download_url,
        OTA_BUNDLE_PATH,
      );

      if (downloadResult.status !== 200) {
        throw new Error(
          `Bundle download failed: HTTP ${downloadResult.status}`,
        );
      }

      // Download and save manifest as meta
      if (manifestAsset) {
        const manifestResult = await FileSystem.downloadAsync(
          manifestAsset.browser_download_url,
          OTA_META_PATH,
        );
        if (manifestResult.status !== 200) {
          console.log("Failed to download OTA manifest, saving basic meta");
          await saveBasicMeta();
        }
      } else {
        await saveBasicMeta();
      }

      setDownloadProgress(100);
      setIsDownloading(false);
      setStatus("Update installed! Restart to apply.");
      setIsAvailable(false);

      // Prompt user to restart the app
      Alert.alert(
        "Update Installed",
        "The update has been downloaded. Close and reopen the app to apply the changes.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Close App",
            onPress: () => BackHandler.exitApp(),
          },
        ],
      );
    } catch (err: any) {
      const errorMsg = err?.message ?? "Download failed";
      console.log("OTA download error:", errorMsg);
      setStatus(`Download failed: ${errorMsg}`);
      setError(errorMsg);
      setIsDownloading(false);
      setTimeout(() => {
        setStatus(updateInfo ? "Update Available" : null);
        setError(null);
      }, 5000);
    }
  }, [updateInfo]);

  const saveBasicMeta = async () => {
    if (!updateInfo) return;
    const meta: OtaManifest = {
      commitHash: updateInfo.latestCommit,
      commitShort: updateInfo.latestCommitShort,
      commitMessage: updateInfo.commitMessage,
      createdAt: new Date().toISOString(),
      bundleFile: "index.android.bundle",
    };
    await FileSystem.writeAsStringAsync(OTA_META_PATH, JSON.stringify(meta));
  };

  useEffect(() => {
    if (!autoCheckOnMount) return;
    async function init() {
      const settings = await getSettings();
      if (settings.autoUpdate) {
        checkUpdate(false);
      }
    }
    init();
  }, [checkUpdate, autoCheckOnMount]);

  return {
    status,
    error,
    isAvailable,
    lastChecked,
    isChecking,
    isDownloading,
    downloadProgress,
    updateInfo,
    checkUpdate,
    downloadAndApplyUpdate,
    setStatus,
    buildInfo: BUILD_INFO,
  };
}
