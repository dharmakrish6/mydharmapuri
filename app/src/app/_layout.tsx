import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { PlacesProvider } from '@/lib/places';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const { c, isDark } = useTheme();
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PlacesProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: c.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="submit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </PlacesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
