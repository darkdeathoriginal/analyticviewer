import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";
import { BUILD_INFO } from "../constants/buildInfo";
import { getSettings } from "../utils/settings";

const GITHUB_OWNER = "darkdeathoriginal";
const GITHUB_REPO = "analyticviewer";
const GITHUB_BRANCH = "main";

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

interface GitRelease {
  tag_name: string;
  html_url: string;
  assets: {
    name: string;
    browser_download_url: string;
  }[];
}

export interface UpdateInfo {
  latestCommit: string;
  latestCommitShort: string;
  commitMessage: string;
  commitDate: string;
  newCommitCount: number;
  downloadUrl: string | null;
  releaseName: string | null;
}

export function useUpdateChecker(autoCheckOnMount = true) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkUpdate = useCallback(async (manual = false) => {
    try {
      setIsChecking(true);
      setError(null);
      if (manual) setStatus("Checking for updates...");

      const currentSha = BUILD_INFO.commitHash;

      // Use the compare API to check how many commits remote is ahead
      const compareRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/compare/${currentSha}...${GITHUB_BRANCH}`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
        },
      );

      if (!compareRes.ok) {
        // If compare fails (e.g. commit not found on remote), fall back to HEAD check
        const headRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`,
          {
            headers: { Accept: "application/vnd.github.v3+json" },
          },
        );

        if (!headRes.ok) {
          throw new Error(`GitHub API error: ${headRes.status}`);
        }

        const headData: GitCommit = await headRes.json();
        setLastChecked(Date.now());

        if (headData.sha !== currentSha) {
          const info = await fetchReleaseInfo();
          setUpdateInfo({
            latestCommit: headData.sha,
            latestCommitShort: headData.sha.slice(0, 7),
            commitMessage: headData.commit.message.split("\n")[0],
            commitDate: headData.commit.author.date,
            newCommitCount: 0, // Unknown when compare API fails
            ...info,
          });
          setStatus("Update Available");
          setIsAvailable(true);
        } else {
          handleUpToDate(manual);
        }
        return;
      }

      const compareData: CompareResponse = await compareRes.json();
      setLastChecked(Date.now());

      if (compareData.status === "ahead" || compareData.status === "diverged") {
        const latestCommit =
          compareData.commits[compareData.commits.length - 1];
        const info = await fetchReleaseInfo();

        setUpdateInfo({
          latestCommit: latestCommit.sha,
          latestCommitShort: latestCommit.sha.slice(0, 7),
          commitMessage: latestCommit.commit.message.split("\n")[0],
          commitDate: latestCommit.commit.author.date,
          newCommitCount: compareData.ahead_by,
          ...info,
        });

        setStatus("Update Available");
        setIsAvailable(true);
      } else {
        handleUpToDate(manual);
      }
    } catch (err: any) {
      console.log("Update check error:", err);
      if (manual) setStatus("Update check failed");
      setError(err?.message ?? "Unknown error");
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

  const fetchReleaseInfo = async (): Promise<{
    downloadUrl: string | null;
    releaseName: string | null;
  }> => {
    let downloadUrl: string | null = null;
    let releaseName: string | null = null;

    try {
      const releaseRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
        },
      );

      if (releaseRes.ok) {
        const releaseData: GitRelease = await releaseRes.json();
        releaseName = releaseData.tag_name;

        const apkAsset = releaseData.assets.find(
          (a) => a.name.endsWith(".apk") || a.name.endsWith(".aab"),
        );

        if (apkAsset) {
          downloadUrl = apkAsset.browser_download_url;
        } else {
          downloadUrl = releaseData.html_url;
        }
      }
    } catch {
      // No release found
    }

    if (!downloadUrl) {
      downloadUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
    }

    return { downloadUrl, releaseName };
  };

  const downloadUpdate = useCallback(async () => {
    if (!updateInfo?.downloadUrl) return;
    try {
      await Linking.openURL(updateInfo.downloadUrl);
    } catch {
      setError("Failed to open download link");
    }
  }, [updateInfo]);

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
    updateInfo,
    checkUpdate,
    downloadUpdate,
    setStatus,
    buildInfo: BUILD_INFO,
  };
}
