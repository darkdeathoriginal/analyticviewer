import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Colors } from '../constants/theme';

export default function RootLayout() {
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
