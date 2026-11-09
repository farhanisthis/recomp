import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Card, HeaderIcon, LoadingIndicator, ProgressBar, ScreenContainer, SettingsRow, StatSummary, ThreeDIllustration } from "@/src/components/ui";
import { latestBodyFat, latestWeight } from "@/src/db/repo/body";
import { getMeta, getProfile, getTargets, getUnits } from "@/src/db/repo/settings";
import { fmtMinutes, fmtW, GOALS, lOut, round } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { makeStyles, space, useTheme } from "@/src/theme";

export default function ProfileTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data } = useQ(async () => ({
    p: await getProfile(), t: await getTargets(), w: await latestWeight(), bf: await latestBodyFat(), units: await getUnits(), ai: (await getMeta("ai_provider")) ?? "manual",
  }));
  if (!data?.p) return <ScreenContainer tab><LoadingIndicator /></ScreenContainer>;
  const { p, t, w, bf, units } = data;
  const goal = GOALS.find((g) => g.key === p.goal);
  return (
    <ScreenContainer tab large title="Profile" subtitle="Your goals & settings" testID="profile-screen"
      right={<HeaderIcon testID="profile-settings-button" icon="cog-outline" onPress={() => router.push("/settings")} />}>
      <Card style={s.hero} onPress={() => router.push("/profile/edit")} testID="profile-hero">
        <ThreeDIllustration name="avatar" size={96} />
        <View style={{ flex: 1 }}>
          <Text style={s.name} testID="profile-name">{p.name}</Text>
          <Text style={s.cap}>{p.age} yrs · {round(lOut(p.height_cm, units)!, 1)} {units.length}</Text>
          <Text style={[s.cap, { color: colors.brand, fontWeight: "700", marginTop: 4 }]}>Edit profile</Text>
        </View>
      </Card>
      <StatSummary testID="profile-stats" items={[
        { label: "Weight", value: w ? fmtW(w.weight_kg, units) : "—" },
        { label: "Body fat", value: bf ? `${bf.body_fat}%` : "—" },
        { label: "Height", value: `${round(lOut(p.height_cm, units)!, 0)} ${units.length}` },
      ]} />
      <SettingsRow testID="profile-goal-row" illus="target" title={goal?.title ?? "Goal"} subtitle={goal?.sub} onPress={() => router.push("/profile/edit")} />
      <Card style={{ gap: space.md }} onPress={() => router.push("/profile/edit")} testID="profile-targets-card">
        <Text style={s.h2}>Daily Targets</Text>
        {[
          { l: "Calories", v: `${t.calories} kcal`, c: colors.carbs },
          { l: "Protein", v: `${t.protein} g`, c: colors.protein },
          { l: "Water", v: `${t.water_ml.toLocaleString()} ml`, c: colors.water },
          { l: "Steps", v: t.steps.toLocaleString(), c: colors.steps },
          { l: "Sleep", v: fmtMinutes(t.sleep_min), c: colors.sleep },
        ].map((r) => (
          <View key={r.l} style={{ gap: 6 }}>
            <View style={s.rowBetween}><Text style={s.label}>{r.l}</Text><Text style={s.label}>{r.v}</Text></View>
            <ProgressBar value={1} max={1} color={r.c} height={4} />
          </View>
        ))}
        <Text style={s.cap}>{t.is_custom ? "Custom targets" : "Estimated targets (Mifflin–St Jeor)"}</Text>
      </Card>
      <View style={{ gap: space.sm }}>
        <SettingsRow testID="profile-ai-row" icon="robot-outline" title="AI Configuration" subtitle={data.ai === "gemini" ? "Gemini (your API key)" : "Manual / offline parser"} onPress={() => router.push("/settings/ai")} />
        <SettingsRow testID="profile-data-row" icon="database-outline" title="Backup & Data" subtitle="Export, restore, CSV, reset" onPress={() => router.push("/settings/data")} />
        <SettingsRow testID="profile-achievements-row" icon="trophy-outline" title="Achievements" onPress={() => router.push("/progress/achievements")} />
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { flexDirection: "row", alignItems: "center", gap: space.lg },
  name: { fontSize: 24, fontWeight: "900", color: c.onSurface },
  cap: { fontSize: 13, color: c.muted },
  h2: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  label: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
}));
