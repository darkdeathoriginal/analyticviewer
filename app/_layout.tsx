import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function checkUpdates() {
      try {
        if (__DEV__) {
          setStatus('Development Mode (EAS disabled)');
          return;
        }

        if (!Updates.isEnabled) {
          setStatus('EAS Updates not enabled');
          return;
        }

        setStatus('Checking for updates...');

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          setStatus('Downloading update...');
          await Updates.fetchUpdateAsync();
          setStatus('Update Ready');
        } else {
          setStatus(null);
        }
      } catch (err: any) {
        console.log('Update error:', err);
        setStatus('Update Error');
        setError(err?.message ?? 'Unknown error');
      }
    }

    checkUpdates();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'My Web Apps',
            headerLargeTitle: true,
            headerLargeTitleStyle: { color: Colors.text },
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

      {/* Update Banner */}
      {status && visible && (
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: 20,
            right: 20,
            backgroundColor: '#1f1f1f',
            padding: 14,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={() => setVisible(false)}
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              padding: 4,
            }}
          >
            <Text style={{ color: '#aaa', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>

          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            {status}
          </Text>

          <Text style={{ color: '#888', fontSize: 11, marginTop: 6 }}>
            Runtime: {Updates.runtimeVersion ?? 'null'} | Channel:{' '}
            {Updates.channel ?? 'null'}
          </Text>

          {error && (
            <Text style={{ color: '#ff6b6b', fontSize: 11, marginTop: 6 }}>
              {error}
            </Text>
          )}

          {status === 'Update Ready' && (
            <TouchableOpacity
              onPress={async () => await Updates.reloadAsync()}
              style={{
                marginTop: 12,
                backgroundColor: Colors.primary,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                Restart Now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
