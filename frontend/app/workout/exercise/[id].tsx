import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";

import { ProgressChart } from "@/src/components/charts";
import { Card, EmptyState, LoadingIndicator, ScreenContainer, SecondaryButton, StatSummary, ThreeDIllustration, useUI } from "@/src/components/ui";
import { getUnits } from "@/src/db/repo/settings";
import { deleteExercise, getExercise, strengthSeries } from "@/src/db/repo/workout";
import { fmtW, wOut } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm } = useUI();
  const { data } = useQ(async () => ({ e: await getExercise(Number(id)), series: await strengthSeries(Number(id)), units: await getUnits() }), [id]);
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { e, series, units } = data;
  if (!e) return <ScreenContainer back title="Not found"><Text>Exercise was deleted.</Text></ScreenContainer>;
  const best = series.length ? Math.max(...series.map((x) => x.max_w)) : null;
  const bestE = series.length ? Math.max(...series.map((x) => x.best)) : null;
  return (
    <ScreenContainer back title={e.name} testID="exercise-detail-screen">
      <View style={{ alignItems: "center" }}><ThreeDIllustration name={e.muscle === "Chest" ? "bench_press" : e.equipment === "Bodyweight" ? "pushup" : "dumbbells"} size={170} style={{ height: 130 }} /></View>
      <Card style={{ gap: space.sm }}>
        <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>How to perform</Text>
        <Text style={{ color: colors.onSurface, lineHeight: 21 }}>{e.instructions || "No instructions added."}</Text>
        <Text style={{ color: colors.muted }}>Muscle: {e.muscle} · Equipment: {e.equipment ?? "—"} · Tracks: {e.tracking.replace("_", " + ")}</Text>
      </Card>
      <Text style={{ fontWeight: "800", fontSize: 17, color: colors.onSurface }}>Strength progress</Text>
      {series.length ? (
        <>
          <StatSummary testID="exercise-stats" items={[{ label: "Heaviest set", value: fmtW(best, units) }, { label: "Best est. 1RM", value: fmtW(bestE, units) }, { label: "Sessions", value: String(series.length) }]} />
          <Card><ProgressChart testID="exercise-strength-chart" a={series.map((x) => ({ day: x.day, v: wOut(x.best, units)! }))} aLabel="Est. 1RM (estimate)" aUnit={units.weight} /></Card>
        </>
      ) : <EmptyState illus="medal" title="No completed sets yet" text="Finish a workout with this exercise to see progress." />}
      {!!e.is_custom && (
        <SecondaryButton testID="exercise-delete" danger title="Delete custom exercise" onPress={async () => {
          if (await confirm({ title: "Delete exercise?", message: "It will be removed from plans. Past workouts keep their records.", destructive: true })) { await deleteExercise(e.id); router.back(); }
        }} />
      )}
    </ScreenContainer>
  );
}
