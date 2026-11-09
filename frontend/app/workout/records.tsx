import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { EmptyState, LoadingIndicator, ScreenContainer, SettingsRow, StatSummary, ThreeDIllustration } from "@/src/components/ui";
import { getUnits } from "@/src/db/repo/settings";
import { bestSessionVolume, personalRecords } from "@/src/db/repo/workout";
import { fmtDay, fmtW } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function Records() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data } = useQ(async () => ({ prs: await personalRecords(), vol: await bestSessionVolume(), units: await getUnits() }));
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { prs, vol, units } = data;
  return (
    <ScreenContainer back title="Personal Records" testID="records-screen">
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="medal" size={130} /><Text style={{ fontSize: 22, fontWeight: "900", color: colors.onSurface }}>Your Best Lifts</Text></View>
      {vol?.v ? <StatSummary testID="records-volume" items={[{ label: "Best session volume", value: fmtW(vol.v, units, 0) }, { label: vol.name, value: fmtDay(vol.day) }]} /> : null}
      {prs.length === 0 ? <EmptyState illus="trophy" title="No records yet" text="Records are derived from completed workouts." /> : (
        <View style={{ gap: space.sm }}>
          {prs.map((r) => (
            <SettingsRow key={r.exercise_id} testID={`record-${r.exercise_id}`} icon="trophy-outline" color={colors.carbs} title={r.name}
              subtitle={r.tracking === "weight_reps" ? `Est. 1RM ${fmtW(r.best_e1rm, units)} (estimate) · max reps ${r.max_reps ?? "—"}` : r.tracking === "reps" ? `Max reps in a set` : r.tracking === "time" ? "Longest set" : "Longest distance"}
              value={r.tracking === "weight_reps" ? fmtW(r.max_w, units) : r.tracking === "reps" ? `${r.max_reps ?? 0}` : r.tracking === "time" ? `${r.max_time ?? 0} s` : `${r.max_dist ?? 0} m`}
              onPress={() => router.push(`/workout/exercise/${r.exercise_id}`)} />
          ))}
          <Text style={{ color: colors.muted, fontSize: 12 }}>Heaviest weight is an actual logged set. Est. 1RM uses the Epley formula and is an estimate.</Text>
        </View>
      )}
    </ScreenContainer>
  );
}
