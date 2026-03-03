import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { Globe, LayoutDashboard, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import AddAppModal from "../components/AddAppModal";
import { Colors, Layout } from "../constants/theme";
import { resolveFavicon } from "../utils/favicon";
import {
  deleteApp,
  getApps,
  saveApp,
  SavedApp,
  updateApp,
} from "../utils/storage";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AppItem = React.memo(
  ({
    item,
    onPress,
    onDelete,
  }: {
    item: SavedApp;
    onPress: (app: SavedApp) => void;
    onDelete: (id: string) => void;
  }) => {
    const [imageError, setImageError] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => onPress(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.cardContainer}
        >
          <View style={styles.card}>
            <View style={styles.cardContentContainer}>
              <View style={styles.cardIcon}>
                {imageError ? (
                  <Globe color={Colors.primary} size={24} />
                ) : item.favicon?.startsWith("data:image/svg+xml") ? (
                  (() => {
                    // Decode the SVG from the data URI (handles both encoded and raw)
                    const raw = item.favicon!;
                    const commaIdx = raw.indexOf(",");
                    let svgContent = "";
                    if (commaIdx !== -1) {
                      const slice = raw.slice(commaIdx + 1);
                      try {
                        svgContent = decodeURIComponent(slice);
                      } catch {
                        svgContent = slice; // already raw / not encoded
                      }
                    }
                    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0;background:transparent}html,body{width:100%;height:100%;display:flex;align-items:center;justify-content:center}svg{width:100%;height:100%}</style></head><body>${svgContent}</body></html>`;
                    return (
                      <WebView
                        source={{ html }}
                        style={[
                          styles.favicon,
                          { backgroundColor: "transparent" },
                        ]}
                        scrollEnabled={false}
                        pointerEvents="none"
                        androidLayerType="hardware"
                        backgroundColor="transparent"
                        onError={() => setImageError(true)}
                      />
                    );
                  })()
                ) : (
                  <Image
                    source={{
                      uri:
                        item.favicon ??
                        `https://www.google.com/s2/favicons?sz=64&domain=${new URL(item.url).hostname}`,
                    }}
                    style={styles.favicon}
                    onError={() => setImageError(true)}
                  />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.appName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.appUrl} numberOfLines={1}>
                  {item.url}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(item.id)}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Trash2 color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

export default function HomeScreen() {
  const [apps, setApps] = useState<SavedApp[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadApps = useCallback(async () => {
    try {
      const storedApps = await getApps();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setApps(storedApps);
    } catch (error) {
      console.error(error);
    }
  }, []);

  /** Re-fetch favicons for all apps in the background, persisting any updates. */
  const refreshFaviconsInBackground = useCallback(async () => {
    try {
      const storedApps = await getApps();
      await Promise.all(
        storedApps.map(async (app) => {
          try {
            const newFavicon = await resolveFavicon(app.url);
            if (newFavicon && newFavicon !== app.favicon) {
              await updateApp(app.id, { favicon: newFavicon });
              // Reflect the update in local state immediately
              setApps((prev) =>
                prev.map((a) =>
                  a.id === app.id ? { ...a, favicon: newFavicon } : a,
                ),
              );
            }
          } catch {
            // Silently ignore per-app errors
          }
        }),
      );
    } catch (error) {
      console.error("Background favicon refresh failed", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApps();
      refreshFaviconsInBackground(); // fire-and-forget
    }, [loadApps, refreshFaviconsInBackground]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApps();
    setRefreshing(false);
    refreshFaviconsInBackground(); // fire-and-forget after pull-to-refresh
  };

  const handleAddApp = async (name: string, url: string) => {
    try {
      const favicon = await resolveFavicon(url);
      await saveApp({ name, url, favicon });
      await loadApps();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteApp = async (id: string) => {
    try {
      await deleteApp(id);
      await loadApps();
    } catch (error) {
      console.error(error);
    }
  };

  const openApp = useCallback(
    (app: SavedApp) => {
      router.push({
        pathname: "/viewer",
        params: { url: app.url, title: app.name, id: app.id },
      });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedApp }) => (
      <AppItem item={item} onPress={openApp} onDelete={handleDeleteApp} />
    ),
    [openApp, handleDeleteApp],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={apps}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.text}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <LayoutDashboard color={Colors.primary} size={48} />
            </View>
            <Text style={styles.emptyText}>Your Dashboard is Empty</Text>
            <Text style={styles.emptySubtext}>
              Add your favorite web apps to get started.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, "#60a5fa"]}
          style={styles.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Plus color="#fff" size={32} />
        </LinearGradient>
      </TouchableOpacity>

      <AddAppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddApp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Layout.spacing.m,
    paddingBottom: 120, // Space for FAB
  },
  cardContainer: {
    marginBottom: Layout.spacing.m,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.15)", // Subtle primary tint
    justifyContent: "center",
    alignItems: "center",
    marginRight: Layout.spacing.m,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  favicon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    paddingRight: Layout.spacing.s,
  },
  appName: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  appUrl: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
  },
  fabContainer: {
    position: "absolute",
    bottom: 32,
    right: 24,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 120,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
