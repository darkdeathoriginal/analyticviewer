import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";
import { UpdateInfo } from "../hooks/useUpdateChecker";

interface UpdateBannerProps {
  status: string | null;
  error: string | null;
  updateInfo: UpdateInfo | null;
  onDownload: () => void;
  onClose: () => void;
  visible: boolean;
}

export default function UpdateBanner({
  status,
  error,
  updateInfo,
  onDownload,
  onClose,
  visible,
}: UpdateBannerProps) {
  if (!status || !visible) return null;

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.statusText}>{status}</Text>

      {updateInfo && (
        <>
          <Text style={styles.commitText} numberOfLines={1}>
            {updateInfo.latestCommitShort}: {updateInfo.commitMessage}
          </Text>
          <Text style={styles.metaText}>
            {updateInfo.releaseName
              ? `Release: ${updateInfo.releaseName}`
              : `New commits available`}
          </Text>
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {status === "Update Available" && (
        <TouchableOpacity onPress={onDownload} style={styles.reloadButton}>
          <Text style={styles.reloadButtonText}>Download Update</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 10,
    padding: 4,
    zIndex: 1,
  },
  closeButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  statusText: {
    color: Colors.text,
    fontWeight: "bold",
    marginBottom: 4,
  },
  commitText: {
    color: Colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 11,
    marginTop: 6,
  },
  reloadButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  reloadButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
