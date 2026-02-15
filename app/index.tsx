import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Globe, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AddAppModal from '../components/AddAppModal';
import { Colors, Layout } from '../constants/theme';
import { deleteApp, getApps, saveApp, SavedApp } from '../utils/storage';

const AppItem = React.memo(({ item, onPress, onDelete }: { item: SavedApp, onPress: (app: SavedApp) => void, onDelete: (id: string) => void }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={styles.cardContainer}
    >
      <LinearGradient
        colors={[Colors.surface, Colors.surfaceLight]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardIcon}>
          {imageError ? (
            <Globe color={Colors.primary} size={24} />
          ) : (
            <Image 
              source={{ uri: `https://www.google.com/s2/favicons?sz=64&domain_url=${item.url}` }}
              style={styles.favicon}
              onError={() => setImageError(true)}
            />
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.appUrl} numberOfLines={1}>{item.url}</Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 color={Colors.danger} size={18} />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  const [apps, setApps] = useState<SavedApp[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadApps = useCallback(async () => {
    try {
      const storedApps = await getApps();
      setApps(storedApps);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApps();
    }, [loadApps])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApps();
    setRefreshing(false);
  };

  const handleAddApp = async (name: string, url: string) => {
    try {
      await saveApp({ name, url });
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

  const openApp = useCallback((app: SavedApp) => {
    router.push({
      pathname: '/viewer',
      params: { url: app.url, title: app.name, id: app.id },
    });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: SavedApp }) => (
    <AppItem item={item} onPress={openApp} onDelete={handleDeleteApp} />
  ), [openApp, handleDeleteApp]);

  return (
    <View style={styles.container}>
      <FlatList
        data={apps}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No apps saved yet.</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first web app.</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, '#60a5fa']}
          style={styles.fabGradient}
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
    paddingBottom: 100, // Space for FAB
  },
  cardContainer: {
    marginBottom: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  cardContent: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  appUrl: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'left',
  },
  deleteButton: {
    padding: 8,
    opacity: 0.8,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  favicon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
});
