import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, Switch, Text, View } from "react-native";

import { Card, Field, ScreenContainer, Segmented, SecondaryButton, SettingsRow, ThreeDIllustration, useUI } from "@/src/components/ui";
import { db, dbEngine } from "@/src/db/client";
import { getMeta, setMeta } from "@/src/db/repo/settings";
import { SCHEMA_VERSION } from "@/src/db/schema";
import { GEMINI_KEY } from "@/src/lib/ai";
import { isHHMM } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { storage } from "@/src/utils/storage";
import { applyThemePref, space, ThemePref, useTheme } from "@/src/theme";

const REMINDERS = [
  { key: "water", title: "Hydration", body: "Time for a glass of water 💧", def: "11:00" },
  { key: "meal", title: "Meal logging", body: "Log your meals in RECOMP", def: "20:30" },
  { key: "weight", title: "Weigh-in", body: "Log your morning weight", def: "07:30" },
  { key: "workout", title: "Workout", body: "Training time — open your plan", def: "18:00" },
  { key: "backup", title: "Backup (weekly, Sunday)", body: "Export a RECOMP backup to keep your data safe", def: "10:00" },
];

export default function Settings() {
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useUI();
  const { data } = useQ(async () => ({ theme: ((await getMeta("theme")) ?? "light") as ThemePref, w: (await getMeta("unit_weight")) ?? "kg", l: (await getMeta("unit_length")) ?? "cm" }));
  const [rem, setRem] = useState<Record<string, { on: boolean; time: string }>>({});
  const [permBlocked, setPermBlocked] = useState(false);
  useEffect(() => {
    (async () => {
      const o: Record<string, { on: boolean; time: string }> = {};
      for (const r of REMINDERS) { const v = await getMeta(`reminder_${r.key}`); o[r.key] = v ? JSON.parse(v) : { on: false, time: r.def }; }
      setRem(o);
    })();
  }, []);

  const schedule = async (key: string, cfg: { on: boolean; time: string }) => {
    const id = `recomp-${key}`;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    if (!cfg.on) return true;
    let p = await Notifications.getPermissionsAsync();
    if (!p.granted) {
      if (!p.canAskAgain) { setPermBlocked(true); return false; }
      p = await Notifications.requestPermissionsAsync();
      if (!p.granted) { setPermBlocked(!p.canAskAgain); toast("Notifications not allowed"); return false; }
    }
    setPermBlocked(false);
    const [hour, minute] = cfg.time.split(":").map(Number);
    const r = REMINDERS.find((x) => x.key === key)!;
    await Notifications.scheduleNotificationAsync({
      identifier: id, content: { title: "RECOMP", body: r.body },
      trigger: key === "backup" ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour, minute } : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    return true;
  };
  const toggle = async (key: string, on: boolean) => {
    if (Platform.OS === "web") return toast("Reminders work in the Android app");
    const cfg = { ...rem[key], on };
    if (!isHHMM(cfg.time)) return toast("Use HH:MM time");
    const ok = await schedule(key, cfg);
    const final = { ...cfg, on: on && ok };
    setRem({ ...rem, [key]: final });
    await setMeta(`reminder_${key}`, JSON.stringify(final), false);
  };

  const diag = async () => {
    const counts: Record<string, number> = {};
    for (const t of ["food_entries", "food_items", "workout_sessions", "body_measurements", "progress_photos"]) counts[t] = (await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`))?.n ?? 0;
    const st = await getMeta("gemini_status");
    return {
      app: Constants.expoConfig?.version ?? "1.0.0", schema: SCHEMA_VERSION, engine: dbEngine, platform: `${Platform.OS} ${Platform.Version}`,
      provider: (await getMeta("ai_provider")) ?? "manual", gemini_key: (await storage.secureGet(GEMINI_KEY, null)) ? "saved" : "none",
      gemini_status: st ? JSON.parse(st).msg : "untested", local_runtime: "not included in this build", installed_model: "none",
      last_backup: (await getMeta("last_backup")) ?? "never", row_counts: counts,
    };
  };
  const { data: d } = useQ(diag);
  if (!data) return null;
  return (
    <ScreenContainer back title="Settings" testID="settings-screen">
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="gear" size={100} /></View>
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Appearance</Text>
      <Segmented testID="settings-theme" value={data.theme} onChange={async (v) => { await setMeta("theme", v); applyThemePref(v); }} options={[{ key: "light", label: "Light" }, { key: "dark", label: "Dark" }, { key: "system", label: "System" }]} />
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Units</Text>
      <Segmented testID="settings-unit-weight" value={data.w} onChange={(v) => setMeta("unit_weight", v)} options={[{ key: "kg", label: "Kilograms" }, { key: "lb", label: "Pounds" }]} />
      <Segmented testID="settings-unit-length" value={data.l} onChange={(v) => setMeta("unit_length", v)} options={[{ key: "cm", label: "Centimeters" }, { key: "in", label: "Inches" }]} />
      <Text style={{ color: colors.muted, fontSize: 12 }}>Values are stored in metric; units only change display and input. Water is always in ml.</Text>
      <View style={{ gap: space.sm }}>
        <SettingsRow testID="settings-profile" icon="account-outline" title="Personal info & goals" onPress={() => router.push("/profile/edit")} />
        <SettingsRow testID="settings-ai" icon="robot-outline" title="AI Configuration" subtitle="Provider, Gemini key, local model status" onPress={() => router.push("/settings/ai")} />
        <SettingsRow testID="settings-data" icon="database-outline" title="Backup & Data" subtitle="Export, restore, CSV, clear, reset" onPress={() => router.push("/settings/data")} />
      </View>
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Reminders</Text>
      {permBlocked && <SecondaryButton testID="settings-open-notif-settings" title="Notifications blocked — Open Settings" onPress={() => Linking.openSettings()} />}
      {REMINDERS.map((r) => rem[r.key] && (
        <Card key={r.key} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm }}>
          <Text style={{ flex: 1, fontWeight: "700", color: colors.onSurface }}>{r.title}</Text>
          <Field testID={`reminder-time-${r.key}`} style={{ width: 90 }} value={rem[r.key].time} onChangeText={(t) => setRem({ ...rem, [r.key]: { ...rem[r.key], time: t } })} />
          <Switch testID={`reminder-toggle-${r.key}`} value={rem[r.key].on} onValueChange={(v) => toggle(r.key, v)} trackColor={{ true: colors.brand, false: colors.borderStrong }} />
        </Card>
      ))}
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Diagnostics</Text>
      <Card style={{ gap: 4 }} testID="settings-diagnostics">
        {d && Object.entries(d).map(([k, v]) => (
          <Text key={k} style={{ color: colors.onSurfaceTertiary, fontSize: 12.5 }}>{k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}</Text>
        ))}
      </Card>
      <SecondaryButton testID="settings-copy-diagnostics" icon="content-copy" title="Copy diagnostic report" onPress={async () => { await Clipboard.setStringAsync(JSON.stringify(await diag(), null, 2)); toast("Copied (no keys or personal data)"); }} />
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>RECOMP v{Constants.expoConfig?.version ?? "1.0.0"} · Food data: USDA FoodData Central, IFCT 2017 (ICMR-NIN) and labelled home-style estimates.</Text>
    </ScreenContainer>
  );
}
