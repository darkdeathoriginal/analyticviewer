import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, Layout } from "../constants/theme";
import { useUpdateChecker } from "../hooks/useUpdateChecker";
import { getSettings, saveSettings } from "../utils/settings";

export default function SettingsScreen() {
  const [autoUpdate, setAutoUpdate] = useState(true);
  const {
    checkUpdate,
    isChecking,
    lastChecked,
    status,
    error,
    updateInfo,
    downloadUpdate,
    buildInfo,
  } = useUpdateChecker();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setAutoUpdate(settings.autoUpdate);
  };

  const toggleAutoUpdate = async (value: boolean) => {
    setAutoUpdate(value);
    await saveSettings({ autoUpdate: value });
  };

  const handleManualCheck = async () => {
    await checkUpdate(true);
  };

  useEffect(() => {
    if (status && status !== "Checking for updates...") {
      if (status === "Update Available" && updateInfo) {
        Alert.alert(
          "Update Available",
          `New version: ${updateInfo.latestCommitShort}\n${updateInfo.commitMessage}${updateInfo.releaseName ? `\nRelease: ${updateInfo.releaseName}` : ""}`,
          [
            { text: "Later", style: "cancel" },
            { text: "Download", onPress: downloadUpdate },
          ],
        );
      } else if (status !== "Update Available") {
        Alert.alert("Update Status", status);
      }
    }
  }, [status]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Updates</Text>

        <View style={styles.row}>
          <View style={styles.rowTextContainer}>
            <Text style={styles.rowTitle}>Auto-Check on Startup</Text>
            <Text style={styles.rowSubtitle}>
              Automatically check for updates when the app starts.
            </Text>
          </View>
          <Switch
            value={autoUpdate}
            onValueChange={toggleAutoUpdate}
            trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
            thumbColor={"#fff"}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleManualCheck}
          disabled={isChecking}
        >
          <LinearGradient
            colors={[Colors.surfaceLight, Colors.surface]}
            style={styles.buttonGradient}
          >
            {isChecking ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.buttonText}>Check for Updates Now</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {lastChecked && (
          <Text style={styles.lastChecked}>
            Last checked: {new Date(lastChecked).toLocaleTimeString()}
          </Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Build Commit</Text>
          <Text style={styles.infoValue}>{buildInfo.commitShort}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Branch</Text>
          <Text style={styles.infoValue}>{buildInfo.branch}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Build Date</Text>
          <Text style={styles.infoValue}>
            {buildInfo.buildTime
              ? new Date(buildInfo.buildTime).toLocaleDateString()
              : "Unknown"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Commit</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {buildInfo.commitMessage || "Unknown"}
          </Text>
        </View>
        {updateInfo && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Latest Remote</Text>
            <Text style={styles.infoValue}>{updateInfo.latestCommitShort}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Layout.spacing.m,
  },
  section: {
    marginBottom: Layout.spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.l,
    padding: Layout.spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: Layout.spacing.m,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Layout.spacing.m,
  },
  rowTextContainer: {
    flex: 1,
    marginRight: Layout.spacing.m,
  },
  rowTitle: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  button: {
    marginTop: Layout.spacing.s,
    borderRadius: Layout.borderRadius.m,
    overflow: "hidden",
  },
  buttonGradient: {
    padding: Layout.spacing.m,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: Colors.text,
    fontWeight: "600",
  },
  lastChecked: {
    marginTop: Layout.spacing.m,
    textAlign: "center",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Layout.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
});
