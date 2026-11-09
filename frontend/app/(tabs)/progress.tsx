import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { ProgressChart } from "@/src/components/charts";
import { Card, Chips, EmptyState, FadeInView, LoadingIndicator, PrimaryButton, ScreenContainer, SettingsRow, StatSummary, ThreeDIllustration } from "@/src/components/ui";
import { listMeasurements } from "@/src/db/repo/body";
import { getUnits, getWeightGoal } from "@/src/db/repo/settings";
import { addDays, dayKey, fmtW, round, wOut } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { makeStyles, space, useTheme } from "@/src/theme";

type Range = "1w" | "1m" | "3m" | "1y" | "all";
const DAYS: Record<Range, number | null> = { "1w": 7, "1m": 30, "3m": 90, "1y": 365, all: null };

export default function ProgressTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [range, setRange] = useState<Range>("1m");
  const { data } = useQ(async () => {
    const n = DAYS[range];
    const list = await listMeasurements(n ? addDays(dayKey(), -(n - 1)) : undefined);
    const all = await listMeasurements();
    return { list, all, units: await getUnits(), goal: await getWeightGoal() };
  }, [range]);
  if (!data) return <ScreenContainer tab><LoadingIndicator /></ScreenContainer>;
  const { list, all, units } = data;
  const weights = list.filter((m) => m.weight_kg != null).map((m) => ({ day: m.day, v: wOut(m.weight_kg, units)! }));
  const fats = list.filter((m) => m.body_fat != null).map((m) => ({ day: m.day, v: m.body_fat! }));
  const w = [...weights].sort((a, b) => a.day.localeCompare(b.day));
  const f = [...fats].sort((a, b) => a.day.localeCompare(b.day));
  const allW = all.filter((m) => m.weight_kg != null);
  const latest = allW[0];
  const first = allW[allW.length - 1];
  const last7 = allW.filter((m) => m.day >= addDays(dayKey(), -6));
  const avg7 = last7.length >= 3 ? last7.reduce((a, m) => a + m.weight_kg!, 0) / last7.length : null;
  const latestFat = all.find((m) => m.body_fat != null);
  return (
    <ScreenContainer tab large title="Progress" subtitle="Track your transformation" testID="progress-screen">
      <FadeInView>
        <View style={{ alignItems: "center" }}><ThreeDIllustration name="scale_hero" size={170} style={{ height: 110 }} /></View>
      </FadeInView>
      <Chips testID="progress-range" value={range} onChange={setRange} options={[{ key: "1w", label: "1W" }, { key: "1m", label: "1M" }, { key: "3m", label: "3M" }, { key: "1y", label: "1Y" }, { key: "all", label: "All" }]} />
      <Card testID="progress-chart-card">
        {w.length || f.length ? (
          <>
            <ProgressChart testID="progress-chart" a={w} b={f} aLabel="Weight" bLabel="Body fat" aUnit={units.weight} bUnit="%" />
            {w.length + f.length < 3 && <Text style={s.cap}>Add more entries to see a trend.</Text>}
          </>
        ) : (
          <EmptyState illus="scale" title="No measurements in this range" text="Log your weight or body fat to see your trend." />
        )}
      </Card>
      <StatSummary testID="progress-summary" items={[
        { label: "Latest", value: latest ? fmtW(latest.weight_kg, units) : "—", icon: "scale-bathroom", color: colors.brand },
        { label: "Since start", value: latest && first && latest !== first ? `${latest.weight_kg! - first.weight_kg! > 0 ? "+" : ""}${round(wOut(latest.weight_kg! - first.weight_kg!, units)!, 1)} ${units.weight}` : "—", icon: "trending-down", color: colors.success },
        { label: "Body fat", value: latestFat ? `${latestFat.body_fat}%` : "—", icon: "percent", color: colors.carbs },
      ]} />
      {avg7 != null && <Text style={s.cap} testID="progress-avg7">7-day average weight: {fmtW(avg7, units)} ({last7.length} weigh-ins)</Text>}
      <PrimaryButton testID="progress-log-measurement-button" icon="plus" title="Log Measurement" onPress={() => router.push("/progress/measure")} />
      <View style={{ gap: space.sm }}>
        <SettingsRow testID="progress-history-link" illus="tape" title="Measurement History" subtitle="Edit or delete past entries" onPress={() => router.push("/progress/history")} />
        <SettingsRow testID="progress-photos-link" illus="camera" title="Progress Photos" subtitle="Front, side, back and comparisons" onPress={() => router.push("/progress/photos")} />
        <SettingsRow testID="progress-report-link" illus="chart" title="Weekly & Monthly Report" subtitle="Calculated from your real logs" onPress={() => router.push("/progress/report")} />
        <SettingsRow testID="progress-strength-link" illus="medal" title="Strength Progress" subtitle="Personal records per exercise" onPress={() => router.push("/workout/records")} />
        <SettingsRow testID="progress-achievements-link" illus="badge" title="Achievements" subtitle="Milestones unlocked by your actions" onPress={() => router.push("/progress/achievements")} />
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  cap: { fontSize: 12.5, color: c.muted, marginTop: space.sm },
}));
