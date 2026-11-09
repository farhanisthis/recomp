import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { UIProvider } from "@/src/components/ui";
import { openDb } from "@/src/db/client";
import { getMeta } from "@/src/db/repo/settings";
import { migrate } from "@/src/db/schema";
import { queryClient } from "@/src/query-client";
import { applyThemePref, ThemePref, useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const { colors, scheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await openDb();
        await migrate();
        applyThemePref(((await getMeta("theme")) as ThemePref) ?? "light");
        setReady(true);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <StatusBar style={scheme === "dark" ? "light" : "dark"} />
            {!ready ? (
              <View style={[styles.center, { backgroundColor: colors.surface }]} testID="app-loading">
                {err ? <Text style={{ color: colors.error, padding: 24 }}>Database failed to open: {err}</Text> : <ActivityIndicator color={colors.brand} />}
              </View>
            ) : (
              <UIProvider>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface }, animation: "slide_from_right" }} />
              </UIProvider>
            )}
          </KeyboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
