import { Link, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { Settings as SettingsIcon } from "lucide-react-native";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import UpdateBanner from "../components/UpdateBanner";
import { Colors } from "../constants/theme";
import { useUpdateChecker } from "../hooks/useUpdateChecker";

export default function RootLayout() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const { status, error, isAvailable, setStatus } = useUpdateChecker();

  const handleBannerClose = () => {
    setBannerVisible(false);
    setStatus(null); // Clear status when closed
  };

  const handleReload = async () => {
    await Updates.reloadAsync();
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
            title: "My Web Apps",
            headerLargeTitle: true,
            headerLargeTitleStyle: { color: Colors.text },
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
        onClose={handleBannerClose}
        onReload={handleReload}
      />
    </View>
  );
}
