import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Sora_400Regular, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  ThemeProvider,
  AuthProvider,
  UserProvider,
  VideosProvider,
  ToastProvider,
  MonetizationProvider,
  MediaPlaybackProvider,
} from '@/contexts';
import { colors } from '@/theme';
import { StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Sora-Regular': Sora_400Regular,
    'Sora-SemiBold': Sora_600SemiBold,
    'Sora-Bold': Sora_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <UserProvider>
              <VideosProvider>
                <MonetizationProvider>
                  <MediaPlaybackProvider>
                    <ToastProvider>
                    <>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(main)" />
                        <Stack.Screen name="splash" />
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="settings" />
                        <Stack.Screen name="settings-preference" />
                        <Stack.Screen name="upload" />
                        <Stack.Screen name="dashboard" />
                        <Stack.Screen name="studio" />
                        <Stack.Screen name="analytics/[id]" />
                        <Stack.Screen name="premium" />
                        <Stack.Screen name="donations" />
                        <Stack.Screen name="wallet" />
                        <Stack.Screen name="admin" />
                        <Stack.Screen name="content-manager" />
                        <Stack.Screen name="help" />
                        <Stack.Screen name="faq" />
                        <Stack.Screen name="report-bug" />
                        <Stack.Screen name="contact-support" />
                        <Stack.Screen name="legal" />
                        <Stack.Screen name="watch/[id]" />
                        <Stack.Screen name="reel-comments" />
                        <Stack.Screen name="+not-found" />
                      </Stack>
                      <StatusBar style="light" />
                    </>
                    </ToastProvider>
                  </MediaPlaybackProvider>
                </MonetizationProvider>
              </VideosProvider>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
