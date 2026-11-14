import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import { ThemeProvider, useTheme } from '@/design/theme';
import { useHydrated } from '@/lib/hooks';
import { ensureAnonymousSession } from '@/services/supabase';
import { KeyboardRoot } from '@/lib/keyboard';

const queryClient = new QueryClient();

function Shell() {
  const { c, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'default' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plan/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        <Stack.Screen name="brief/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="save/[id]" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="name" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cart/index" />
        <Stack.Screen name="cart/checkout" />
        <Stack.Screen name="cart/placed/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="orders" />
        <Stack.Screen name="follow/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="unveil/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="products/[id]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
  });
  const hydrated = useHydrated();
  // If a font can't load (e.g. blocked), open the app with system fonts rather than a blank screen.

  useEffect(() => {
    ensureAnonymousSession().catch(() => {
      // Offline or not configured: the app keeps working on-device; we retry on next launch.
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardRoot>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {(fontsLoaded || fontError) && hydrated ? <Shell /> : <View style={{ flex: 1, backgroundColor: '#FBF7F4' }} />}
          </ThemeProvider>
        </QueryClientProvider>
        </KeyboardRoot>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
