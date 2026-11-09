import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";

import { HeaderIcon, LoadingIndicator, PrimaryButton, ScreenContainer, SecondaryButton, SettingsRow, StatSummary, ThreeDIllustration, useUI } from "@/src/components/ui";
import { getUnits } from "@/src/db/repo/settings";
import { deletePlan, duplicatePlan, getPlan, startSession } from "@/src/db/repo/workout";
import { fmtW, WEEKDAYS } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const { data } = useQ(async () => ({ p: await getPlan(Number(id)), units: await getUnits() }), [id]);
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { p, units } = data;
  if (!p) return <ScreenContainer back title="Plan not found"><Text>This plan was deleted.</Text></ScreenContainer>;
  const sets = p.exercises.reduce((a, e) => a + e.sets, 0);
  const est = Math.round(p.exercises.reduce((a, e) => a + e.sets * (45 + e.rest_sec), 0) / 60);
  return (
    <ScreenContainer back title={p.name} subtitle={p.description ?? undefined} testID="plan-detail-screen"
      right={<HeaderIcon testID="plan-edit-button" icon="pencil-outline" onPress={() => router.push(`/workout/plan-edit?id=${p.id}`)} />}
      footer={<PrimaryButton testID="plan-start-button" icon="play" title="Start Workout" disabled={!p.exercises.length} onPress={async () => {
        const r = await startSession(p.id);
        if (r.existing) toast("You already have a workout in progress");
        router.push(`/workout/active?id=${r.id}`);
      }} />}>
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="bench" size={180} style={{ height: 110 }} /></View>
      <StatSummary testID="plan-stats" items={[{ label: "Exercises", value: String(p.exercises.length), icon: "dumbbell", color: colors.brand }, { label: "Total sets", value: String(sets), icon: "layers-outline", color: colors.brand }, { label: "Est. duration", value: `~${est} min`, icon: "clock-outline", color: colors.brand }]} />
      {!!p.schedule_days && <Text style={{ color: colors.muted }}>Scheduled: {p.schedule_days.split(",").map((d) => WEEKDAYS[+d]).join(", ")}</Text>}
      <Text style={{ fontWeight: "800", fontSize: 17, color: colors.onSurface }}>Exercises</Text>
      <View style={{ gap: space.sm }}>
        {p.exercises.map((e, i) => (
          <SettingsRow key={i} testID={`plan-exercise-${i}`} icon="dumbbell" title={e.name!} subtitle={`${e.sets} sets × ${e.target_reps || "—"} reps${e.target_weight ? " · " + fmtW(e.target_weight, units) : ""} · rest ${e.rest_sec}s`} onPress={() => router.push(`/workout/exercise/${e.exercise_id}`)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <SecondaryButton testID="plan-duplicate" small icon="content-copy" title="Duplicate" style={{ flex: 1 }} onPress={async () => { await duplicatePlan(p.id); toast("Plan duplicated"); router.back(); }} />
        <SecondaryButton testID="plan-delete" small danger icon="delete-outline" title="Delete" style={{ flex: 1 }} onPress={async () => {
          if (await confirm({ title: "Delete plan?", message: "Completed workouts from this plan stay in your history.", destructive: true, confirmText: "Delete" })) { await deletePlan(p.id); router.back(); }
        }} />
      </View>
    </ScreenContainer>
  );
}
