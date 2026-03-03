import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Globe, Grid, RefreshCw, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { WebViewMessageEvent } from "react-native-webview/lib/WebViewTypes";
import { Colors } from "../constants/theme";
import { parseFaviconFromHtml } from "../utils/favicon";
import { getApps, SavedApp, updateApp } from "../utils/storage";

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

  const startId = initialId || "temp-" + Date.now();

  const [activeTabs, setActiveTabs] = useState<TabState[]>([
    {
      id: startId,
      url: initialUrl,
      name: initialTitle || "App",
    },
  ]);

  const [currentTabId, setCurrentTabId] = useState(startId);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    [startId]: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [savedApps, setSavedApps] = useState<SavedApp[]>([]);
  const [favicons, setFavicons] = useState<Record<string, string>>({});

  const webViewRefs = useRef<Record<string, WebView | null>>({});
  const router = useRouter();

  useEffect(() => {
    getApps().then(setSavedApps).catch(console.error);
  }, []);

  // Handle messages from WebView (HTML content for favicon parsing)
  const onMessage = useCallback(
    (event: WebViewMessageEvent, tabId: string, tabUrl: string) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === "favicon" && data.html) {
          const favicon = parseFaviconFromHtml(data.html, tabUrl);
          if (favicon) {
            setFavicons((prev) => ({ ...prev, [tabId]: favicon }));

            // Persist to storage if this is a saved app
            if (!tabId.startsWith("temp-")) {
              updateApp(tabId, { favicon }).catch(console.error);
            }
          }
        }
      } catch {
        // Ignore parsing errors
      }
    },
    [],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRefs.current[currentTabId]?.reload();
  }, [currentTabId]);

  const switchApp = (app: SavedApp) => {
    setSwitcherVisible(false);
    const existingTab = activeTabs.find((t) => t.id === app.id);
    if (existingTab) {
      setCurrentTabId(app.id);
    } else {
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

  // JavaScript to inject into WebView to extract HTML
  const injectedJavaScript = `
    (function() {
      // Send HTML back to React Native for favicon parsing
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'favicon',
        html: document.documentElement.outerHTML
      }));
      true;
    })();
  `;

  const renderWebView = (tab: TabState, isActive: boolean) => (
    <View
      key={tab.id}
      style={[styles.webViewContainer, !isActive && { display: "none" }]}
    >
      <WebView
        ref={(ref) => {
          webViewRefs.current[tab.id] = ref;
        }}
        source={{ uri: tab.url, headers: { "Cache-Control": "no-cache" } }}
        style={styles.webView}
        injectedJavaScript={injectedJavaScript}
        onMessage={(event) => onMessage(event, tab.id, tab.url)}
        onLoadEnd={() => {
          updateLoadingState(tab.id, false);
          if (isActive) setRefreshing(false);
        }}
        originWhitelist={["*"]}
        mixedContentMode="always"
        pullToRefreshEnabled={Platform.OS === "ios"}
        overScrollMode={Platform.OS === "android" ? "never" : undefined}
        onFileDownload={({ nativeEvent }) => {
          if (nativeEvent.downloadUrl) {
            Linking.openURL(nativeEvent.downloadUrl);
          }
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      />
    </View>
  );

  // Render favicon in switcher
  const renderAppIcon = (item: SavedApp) => {
    const favicon = favicons[item.id] || item.favicon;

    if (favicon?.startsWith("emoji:")) {
      return <Text style={styles.faviconEmoji}>{favicon.slice(6)}</Text>;
    }

    if (favicon) {
      return (
        <Image
          source={{ uri: favicon }}
          style={styles.faviconImage}
          defaultSource={undefined}
        />
      );
    }

    return <Globe color={Colors.text} size={24} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={true} />

      {activeTabs.map((tab) => renderWebView(tab, tab.id === currentTabId))}

      {loadingStates[currentTabId] && !refreshing && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {!switcherVisible && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.fab, styles.fabRefresh]}
            onPress={onRefresh}
            activeOpacity={0.8}
            disabled={refreshing}
          >
            <RefreshCw color={refreshing ? "#888" : "#fff"} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setSwitcherVisible(true)}
            activeOpacity={0.8}
          >
            <Grid color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={switcherVisible}
        onRequestClose={() => setSwitcherVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSwitcherVisible(false)}>
          <View style={styles.modalOverlay}>
            {Platform.OS === "ios" && (
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
                    <View style={styles.appIcon}>{renderAppIcon(item)}</View>
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
  fabRefresh: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 10,
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
    overflow: "hidden",
  },
  faviconEmoji: {
    fontSize: 32,
    textAlign: "center",
    lineHeight: 60,
  },
  faviconImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
