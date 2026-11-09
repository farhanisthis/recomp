import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Card, Field, LoadingIndicator, PrimaryButton, ScreenContainer, SecondaryButton, StatSummary, ThreeDIllustration, FadeInView, useUI } from "@/src/components/ui";
import { WorkoutSetRow } from "@/src/components/WorkoutSetRow";
import { getUnits } from "@/src/db/repo/settings";
import { addSet, deleteSet, discardSession, getSession, recomputeSession, updateSessionNotes } from "@/src/db/repo/workout";
import { fmtDayLong, fmtDuration, fmtW, setVolume } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

/** Workout summary / historical details with correction mode. */
export default function SessionDetail() {
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const [edit, setEdit] = useState(false);
  const { data } = useQ(async () => ({ s: await getSession(Number(id)), units: await getUnits() }), [id]);
  const [notes, setNotes] = useState<string | null>(null);
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { s, units } = data;
  if (!s) return <ScreenContainer back title="Workout"><Text>Not found.</Text></ScreenContainer>;
  const sets = s.exercises.reduce((a, e) => a + (e.skipped ? 0 : e.sets.filter((x) => x.done).length), 0);
  const exs = s.exercises.filter((e) => !e.skipped && e.sets.some((x) => x.done)).length;
  return (
    <ScreenContainer back title={celebrate ? "Workout Complete!" : "Workout Summary"} testID="session-detail-screen"
      footer={edit ? (
        <PrimaryButton testID="session-save-edits" title="Save corrections" onPress={async () => { await recomputeSession(s.id); if (notes != null) await updateSessionNotes(s.id, notes); setEdit(false); toast("Workout updated"); }} />
      ) : celebrate ? <PrimaryButton testID="session-keep-going" title="Keep Going" onPress={() => router.replace("/(tabs)/workout")} /> : undefined}>
      <FadeInView style={{ alignItems: "center", gap: 4 }}>
        <ThreeDIllustration name={celebrate ? "trophy" : "summary"} size={170} style={{ height: 140 }} />
        {celebrate && <Text style={{ fontSize: 26, fontWeight: "900", color: colors.onSurface }}>Great job!</Text>}
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.onSurface }} testID="session-name">{s.name}</Text>
        <Text style={{ color: colors.muted }}>{fmtDayLong(s.day)} · {fmtDuration(s.duration_sec ?? 0)}</Text>
      </FadeInView>
      <StatSummary testID="session-stats" items={[
        { label: "Duration", value: fmtDuration(s.duration_sec ?? 0), icon: "clock-outline", color: colors.brand },
        { label: "Exercises", value: String(exs), icon: "dumbbell", color: colors.brand },
        { label: "Sets", value: String(sets), icon: "layers-outline", color: colors.brand },
      ]} />
      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }} testID="session-volume">
        <View><Text style={{ color: colors.muted }}>Total volume (working sets)</Text><Text style={{ fontSize: 24, fontWeight: "900", color: colors.onSurface }}>{fmtW(s.volume ?? 0, units, 0)}</Text></View>
        {s.pr_count > 0 && <View style={{ alignItems: "center" }}><ThreeDIllustration name="medal" size={44} /><Text style={{ fontWeight: "800", color: colors.success }} testID="session-prs">{s.pr_count} PR{s.pr_count > 1 ? "s" : ""}</Text></View>}
      </Card>
      {s.exercises.map((e, i) => (
        <Card key={e.id} style={{ gap: 6 }} testID={`session-ex-${i}`}>
          <Text style={{ fontWeight: "800", fontSize: 15, color: colors.onSurface }}>{e.name}{e.skipped ? " (skipped)" : ""}</Text>
          {edit ? (
            <>
              {e.sets.map((st, k) => <WorkoutSetRow key={st.id} set={st} index={k} tracking={e.tracking} units={units} testID={`session-set-${i}-${k}`} onDelete={() => deleteSet(st.id)} />)}
              <SecondaryButton small testID={`session-add-set-${i}`} icon="plus" title="Add set" onPress={() => addSet(e.id)} />
            </>
          ) : e.sets.filter((x) => x.done).map((x, k) => (
            <Text key={x.id} style={{ color: colors.onSurfaceTertiary }}>
              {x.kind === "warmup" ? "Warm-up" : `Set ${k + 1}`}: {e.tracking === "weight_reps" ? `${fmtW(x.weight, units)} × ${x.reps ?? 0}` : e.tracking === "reps" ? `${x.reps ?? 0} reps` : e.tracking === "time" ? `${x.duration_sec ?? 0} s` : `${x.distance_m ?? 0} m`}
              {setVolume(x) ? `  ·  ${Math.round(setVolume(x))} vol` : ""}
            </Text>
          ))}
          {!!e.notes && <Text style={{ color: colors.muted, fontStyle: "italic" }}>{e.notes}</Text>}
        </Card>
      ))}
      {edit ? <Field testID="session-notes-input" label="Session notes" value={notes ?? s.notes ?? ""} onChangeText={setNotes} multiline /> : !!s.notes && <Text style={{ color: colors.muted }}>Notes: {s.notes}</Text>}
      {!edit && (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <SecondaryButton testID="session-edit" small icon="pencil-outline" title="Correct workout" style={{ flex: 1 }} onPress={() => setEdit(true)} />
          <SecondaryButton testID="session-delete" small danger icon="delete-outline" title="Delete" style={{ flex: 1 }} onPress={async () => {
            if (await confirm({ title: "Delete this workout?", message: "This removes it from history and records.", destructive: true, confirmText: "Delete" })) { await discardSession(s.id); router.back(); }
          }} />
        </View>
      )}
    </ScreenContainer>
  );
}
