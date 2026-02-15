import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        if (__DEV__) return;

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Update Available',
            'A new version of the app is available. Restart to apply updates?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Restart', onPress: async () => await Updates.reloadAsync() },
            ]
          );
        }
      } catch (error) {
        // You can also add an alert() to reveal why the update failed.
        // Alert.alert(`Error fetching latest Expo update: ${error}`);
        console.log(`Error fetching latest Expo update: ${error}`);
      }
    }

    onFetchUpdateAsync();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'My Apps',
            headerLargeTitle: true,
            headerLargeTitleStyle: {
              color: Colors.text,
            },
          }} 
        />
        <Stack.Screen 
          name="viewer" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal', 
          }} 
        />
      </Stack>
    </View>
  );
}
