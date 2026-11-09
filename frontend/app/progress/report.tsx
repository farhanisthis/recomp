import { useState } from "react";
import { Text, View } from "react-native";

import { Card, LoadingIndicator, ScreenContainer, Segmented, SettingsRow, ThreeDIllustration } from "@/src/components/ui";
import { periodReport } from "@/src/db/repo/body";
import { getTargets, getUnits } from "@/src/db/repo/settings";
import { fmtDuration, fmtShort, fmtW } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function Report() {
  const { colors } = useTheme();
  const [p, setP] = useState<"7" | "30">("7");
  const { data } = useQ(async () => ({ r: await periodReport(Number(p)), prev: await periodReport(Number(p), shiftBack(Number(p))), t: await getTargets(), u: await getUnits() }), [p]);
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { r, prev, t, u } = data;
  const volDelta = prev.volume > 0 ? ((r.volume - prev.volume) / prev.volume) * 100 : null;
  return (
    <ScreenContainer back title={p === "7" ? "Weekly Insights" : "Monthly Recap"} subtitle={`${fmtShort(r.from)} – ${fmtShort(r.end)}`} testID="report-screen">
      <Segmented testID="report-period" value={p} onChange={setP} options={[{ key: "7", label: "Last 7 days" }, { key: "30", label: "Last 30 days" }]} />
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="chart" size={150} style={{ height: 100 }} /></View>
      <Card style={{ gap: 4 }} testID="report-consistency">
        <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Logging consistency</Text>
        <Text style={{ color: colors.muted }}>Food logged on {r.loggedDays} of {r.days} days. Days without entries are treated as missing, not zero.</Text>
      </Card>
      <View style={{ gap: space.sm }}>
        <SettingsRow testID="report-kcal" icon="fire" color={colors.carbs} title={r.avgKcal != null ? `${Math.round(r.avgKcal)} kcal average` : "No food logged"} subtitle={r.avgKcal != null ? `On logged days · target ${t.calories}` : undefined} />
        <SettingsRow testID="report-protein" icon="arm-flex" color={colors.protein} title={r.avgProtein != null ? `${Math.round(r.avgProtein)} g protein average` : "No protein data"} subtitle={r.avgProtein != null ? `On logged days · target ${t.protein} g` : undefined} />
        <SettingsRow testID="report-workouts" icon="dumbbell" color={colors.brand} title={`${r.workouts} workout${r.workouts === 1 ? "" : "s"} completed`} subtitle={r.workouts ? `${fmtDuration(r.trainingSec)} total · ${r.prs} PR${r.prs === 1 ? "" : "s"}` : undefined} />
        <SettingsRow testID="report-volume" icon="chart-bar" color={colors.brand} title={`${fmtW(r.volume, u, 0)} training volume`} subtitle={volDelta != null ? `${volDelta >= 0 ? "+" : ""}${Math.round(volDelta)}% vs previous period` : "No previous period to compare"} />
        <SettingsRow testID="report-weight" icon="scale-bathroom" color={colors.success} title={r.weightChange != null ? `${r.weightChange > 0 ? "+" : ""}${fmtW(r.weightChange, u)} weight change` : "Not enough weigh-ins"} subtitle={`${r.weighIns} weigh-in${r.weighIns === 1 ? "" : "s"} in this period`} />
        <SettingsRow testID="report-water" icon="water" color={colors.water} title={r.avgWater != null ? `${Math.round(r.avgWater)} ml water average` : "No water logged"} subtitle={r.avgWater != null ? `On ${r.waterDays} logged days · goal ${t.water_ml} ml` : undefined} />
      </View>
    </ScreenContainer>
  );
}
function shiftBack(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
