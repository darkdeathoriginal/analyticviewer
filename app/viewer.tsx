import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Globe, Grid, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Colors } from "../constants/theme";
import { getApps, SavedApp } from "../utils/storage";

const { width } = Dimensions.get("window");

interface TabState {
  id: string;
  url: string;
  name: string;
}

export default function ViewerScreen() {
  const {
    url: initialUrl,
    title: initialTitle,
    id: initialId,
  } = useLocalSearchParams<{ url: string; title: string; id: string }>();

  // Track all visited apps (tabs)
  // If we don't have an ID (legacy), use URL as ID or gen one, but we updated index to pass ID.
  // Fallback for direct URL opening or deep links could be needed.
  const startId = initialId || "temp-" + Date.now();

  const [activeTabs, setActiveTabs] = useState<TabState[]>([
    {
      id: startId,
      url: initialUrl,
      name: initialTitle || "App",
    },
  ]);

  const [currentTabId, setCurrentTabId] = useState(startId);

  // Per-tab loading state
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    [startId]: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  // For Android scroll handling - we need one ref per tab ideally, or just current
  // Since we only pull-to-refresh the CURRENT one, we track its scroll
  const [enablePullToRefresh, setEnablePullToRefresh] = useState(true);

  // Switcher State
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [savedApps, setSavedApps] = useState<SavedApp[]>([]);

  // Refs for all webviews
  const webViewRefs = useRef<Record<string, WebView | null>>({});
  const router = useRouter();

  useEffect(() => {
    // Load apps for switcher
    getApps().then(setSavedApps).catch(console.error);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRefs.current[currentTabId]?.reload();
  }, [currentTabId]);

  const handleWebViewScroll = (event: any) => {
    // Only strictly enable pull-to-refresh when we are at the very top
    const yOffset = Number(event.nativeEvent.contentOffset.y);
    setEnablePullToRefresh(yOffset <= 0);
  };

  const switchApp = (app: SavedApp) => {
    setSwitcherVisible(false);

    // Check if tab exists
    const existingTab = activeTabs.find((t) => t.id === app.id);
    if (existingTab) {
      setCurrentTabId(app.id);
    } else {
      // Add new tab
      setActiveTabs((prev) => [
        ...prev,
        { id: app.id, url: app.url, name: app.name },
      ]);
      setLoadingStates((prev) => ({ ...prev, [app.id]: true }));
      setCurrentTabId(app.id);
    }
  };

  const updateLoadingState = (id: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [id]: isLoading }));
  };

  const renderWebView = (tab: TabState, isActive: boolean) => (
    <View
      key={tab.id}
      style={[
        styles.webViewContainer,
        // Use explicit height to ensure it fills screen inside ScrollView
        { height: Dimensions.get("window").height },
        // Use display none to hide but keep alive (better than height 0 for layout)
        !isActive && { display: "none" },
      ]}
    >
      <WebView
        ref={(ref) => {
          webViewRefs.current[tab.id] = ref;
        }}
        source={{ uri: tab.url, headers: { "Cache-Control": "no-cache" } }}
        style={styles.webView}
        onLoadStart={() => {}}
        onLoadEnd={() => {
          updateLoadingState(tab.id, false);
          if (isActive) setRefreshing(false);
        }}
        // iOS specific
        pullToRefreshEnabled={Platform.OS === "ios"}
        // Android specific
        onFileDownload={({ nativeEvent }) => {
          if (nativeEvent.downloadUrl) {
            Linking.openURL(nativeEvent.downloadUrl);
          }
        }}
        // Android scroll sync (only relevant if active to avoid event spam)
        onScroll={
          Platform.OS === "android" && isActive
            ? handleWebViewScroll
            : undefined
        }
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={true} />

      {Platform.OS === "android" ? (
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          // We only enable the outer scrollview if the CURRENT tab allows it
          scrollEnabled={enablePullToRefresh}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              enabled={enablePullToRefresh}
              colors={[Colors.primary]}
              progressBackgroundColor={Colors.surface}
            />
          }
        >
          {activeTabs.map((tab) => renderWebView(tab, tab.id === currentTabId))}
        </ScrollView>
      ) : (
        // iOS Direct Render
        // We render all tabs, but styles hide the inactive ones
        activeTabs.map((tab) => renderWebView(tab, tab.id === currentTabId))
      )}

      {/* Loading overlay for current tab */}
      {loadingStates[currentTabId] && !refreshing && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* Floating Switcher Button */}
      {!switcherVisible && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setSwitcherVisible(true)}
            activeOpacity={0.8}
          >
            <Grid color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      )}

      {/* Switcher Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={switcherVisible}
        onRequestClose={() => setSwitcherVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSwitcherVisible(false)}>
          <View style={styles.modalOverlay}>
            {Platform.OS === "ios" && (
              // @ts-ignore
              <BlurView
                intensity={30}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )}
            {Platform.OS === "android" && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "rgba(0,0,0,0.8)" },
                ]}
              />
            )}

            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Quick Switch</Text>
                <TouchableOpacity onPress={() => setSwitcherVisible(false)}>
                  <X color="#fff" size={24} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={savedApps}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={styles.gridRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.appItem,
                      currentTabId === item.id && styles.activeAppItem,
                    ]}
                    onPress={() => switchApp(item)}
                  >
                    <View style={styles.appIcon}>
                      <Globe color={Colors.text} size={24} />
                    </View>
                    <Text style={styles.appName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {activeTabs.find((t) => t.id === item.id) && (
                      <View style={styles.activeDot} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />

              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.back()}
              >
                <Text style={styles.homeButtonText}>Exit to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollViewContent: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  webView: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  fabContainer: {
    position: "absolute",
    bottom: 40,
    right: 20,
    alignItems: "flex-end",
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: "flex-start",
    gap: 15,
  },
  appItem: {
    width: (width - 40 - 30) / 3,
    alignItems: "center",
    marginBottom: 20,
    marginRight: 7,
  },
  activeAppItem: {
    opacity: 1,
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  activeDot: {
    position: "absolute",
    top: -4,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  appName: {
    color: "#ccc",
    fontSize: 12,
    textAlign: "center",
  },
  homeButton: {
    backgroundColor: "#333",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  homeButtonText: {
    color: Colors.danger,
    fontWeight: "bold",
  },
});
