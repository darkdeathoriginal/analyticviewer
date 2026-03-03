import { Link, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Settings as SettingsIcon } from "lucide-react-native";
import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import UpdateBanner from "../components/UpdateBanner";
import { Colors } from "../constants/theme";
import { useUpdateChecker } from "../hooks/useUpdateChecker";

export default function RootLayout() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const {
    status,
    error,
    isAvailable,
    updateInfo,
    isDownloading,
    downloadAndApplyUpdate,
    setStatus,
  } = useUpdateChecker();

  const handleBannerClose = () => {
    setBannerVisible(false);
    setStatus(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerLargeTitle: false,
            headerTitle: () => (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Image
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  source={require("../assets/icon.png")}
                  style={{ width: 32, height: 32, borderRadius: 8 }}
                />
                <Text
                  style={{
                    color: Colors.text,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  My Web Apps
                </Text>
              </View>
            ),
            headerRight: () => (
              <Link href={"/settings" as any} asChild>
                <TouchableOpacity>
                  <SettingsIcon color={Colors.primary} size={24} />
                </TouchableOpacity>
              </Link>
            ),
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            headerLargeTitle: true,
            headerLargeTitleStyle: { color: Colors.text },
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="viewer"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
          }}
        />
      </Stack>

      <UpdateBanner
        visible={bannerVisible && !!status}
        status={status}
        error={error}
        updateInfo={updateInfo}
        isDownloading={isDownloading}
        onClose={handleBannerClose}
        onDownload={downloadAndApplyUpdate}
      />
    </View>
  );
}
