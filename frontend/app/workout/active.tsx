import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";

import { ExercisePicker } from "@/src/components/ExercisePicker";
import { RestTimer, startRest } from "@/src/components/RestTimer";
import { Card, Field, HeaderIcon, Icon, LoadingIndicator, PrimaryButton, ScreenContainer, SecondaryButton, useUI } from "@/src/components/ui";
import { WorkoutSetRow } from "@/src/components/WorkoutSetRow";
import { getUnits } from "@/src/db/repo/settings";
import {
  addSessionExercise, addSet, deleteSet, discardSession, elapsedSec, finishSession, getActiveSession, getSession, lastPerformance,
  moveSessionExercise, removeSessionExercise, setSessionPause, updateSessionExercise, type SExercise,
} from "@/src/db/repo/workout";
import { fmtDuration, fmtW, type Units } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function ActiveWorkout() {
  const p = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const { data } = useQ(async () => {
    const id = p.id ? Number(p.id) : (await getActiveSession())?.id;
    return { s: id ? await getSession(id) : null, units: await getUnits() };
  }, [p.id]);
  const [now, setNow] = useState(Date.now());
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { router.back(); return true; }); // session stays saved & resumable
    return () => sub.remove();
  }, [router]);

  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { s, units } = data;
  if (!s || s.status !== "active") {
    return (
      <ScreenContainer back title="Workout">
        <Text style={{ color: colors.muted }}>This workout is no longer active.</Text>
        {s && <PrimaryButton testID="active-view-summary" title="View summary" onPress={() => router.replace(`/workout/session/${s.id}`)} />}
      </ScreenContainer>
    );
  }
  const paused = !!s.paused_at;
  const doneSets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
  const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0);

  const finish = async () => {
    if (!doneSets && !(await confirm({ title: "No sets completed", message: "Finish anyway? It will be saved with zero volume.", confirmText: "Finish" }))) return;
    if (doneSets && !(await confirm({ title: "Finish workout?", message: `${doneSets} of ${totalSets} sets completed.`, confirmText: "Finish" }))) return;
    setBusy(true);
    await finishSession(s.id);
    router.replace(`/workout/session/${s.id}?celebrate=1`);
  };
  const discard = async () => {
    if (await confirm({ title: "Discard workout?", message: "All sets from this session will be deleted.", destructive: true, confirmText: "Discard" })) {
      await discardSession(s.id);
      router.back();
    }
  };

  return (
    <ScreenContainer back title={s.name} subtitle={`${doneSets}/${totalSets} sets done · auto-saved`} testID="active-workout-screen"
      right={<HeaderIcon testID="active-discard" icon="delete-outline" onPress={discard} />}
      footer={<PrimaryButton testID="active-finish" icon="flag-checkered" title="Finish Workout" loading={busy} onPress={finish} />}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Icon name="clock-outline" color={colors.brand} size={26} />
        <Text style={{ flex: 1, fontSize: 30, fontWeight: "900", color: colors.onSurface }} testID="active-elapsed">{fmtDuration(elapsedSec(s, now))}</Text>
        <SecondaryButton small testID={paused ? "active-resume" : "active-pause"} icon={paused ? "play" : "pause"} title={paused ? "Resume" : "Pause"} onPress={() => setSessionPause(s.id, !paused)} />
      </Card>
      <RestTimer />
      {s.exercises.map((e, i) => (
        <ExerciseBlock key={e.id} e={e} i={i} sessionId={s.id} units={units} last={i === s.exercises.length - 1} onConfirm={confirm} />
      ))}
      <SecondaryButton testID="active-add-exercise" icon="plus" title="Add Exercise" onPress={() => setPicker(true)} />
      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={(ex) => { addSessionExercise(s.id, ex); toast(`${ex.name} added`); }} />
    </ScreenContainer>
  );
}

function ExerciseBlock({ e, i, sessionId, units, last, onConfirm }: { e: SExercise; i: number; sessionId: number; units: Units; last: boolean; onConfirm: (o: any) => Promise<boolean> }) {
  const { colors } = useTheme();
  const [notesOpen, setNotesOpen] = useState(!!e.notes);
  const [notes, setNotes] = useState(e.notes ?? "");
  const { data: prev } = useQ(() => (e.exercise_id ? lastPerformance(e.exercise_id, sessionId) : Promise.resolve(null)), [e.exercise_id]);
  return (
    <Card style={{ gap: space.sm, opacity: e.skipped ? 0.55 : 1 }} testID={`active-exercise-${i}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>{e.name}{e.skipped ? " (skipped)" : ""}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }} testID={`active-exercise-prev-${i}`}>
            {prev ? `Last (${prev.day}): ${prev.sets.filter((x) => x.kind === "working").map((x) => (e.tracking === "weight_reps" ? `${fmtW(x.weight, units, 1)}×${x.reps ?? 0}` : e.tracking === "reps" ? `${x.reps ?? 0}` : `${x.duration_sec ?? x.distance_m ?? 0}`)).join(", ") || "—"}` : e.target_reps ? `Target ${e.target_reps} reps` : "No previous data"}
          </Text>
        </View>
        <Pressable testID={`active-ex-up-${i}`} hitSlop={6} disabled={i === 0} onPress={() => moveSessionExercise(sessionId, e.id, -1)}><Icon name="arrow-up" size={20} color={i === 0 ? colors.border : colors.muted} /></Pressable>
        <Pressable testID={`active-ex-down-${i}`} hitSlop={6} disabled={last} onPress={() => moveSessionExercise(sessionId, e.id, 1)}><Icon name="arrow-down" size={20} color={last ? colors.border : colors.muted} /></Pressable>
      </View>
      {!e.skipped && e.sets.map((st, k) => (
        <WorkoutSetRow key={st.id} set={st} index={e.sets.slice(0, k).filter((x) => x.kind === "working").length} tracking={e.tracking} units={units} testID={`set-${i}-${k}`}
          onDelete={() => deleteSet(st.id)} onDone={(d) => { if (d && e.rest_sec > 0) startRest(e.rest_sec); }} />
      ))}
      {notesOpen && (
        <Field testID={`active-ex-notes-${i}`} placeholder="Exercise notes" value={notes} onChangeText={setNotes} onEndEditing={() => updateSessionExercise(e.id, { notes })} onBlur={() => updateSessionExercise(e.id, { notes })} />
      )}
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {!e.skipped && <Mini testID={`active-add-set-${i}`} icon="plus" label="Set" onPress={() => addSet(e.id)} />}
        {!e.skipped && <Mini testID={`active-add-warmup-${i}`} icon="fire" label="Warm-up" onPress={() => addSet(e.id, "warmup")} />}
        <Mini testID={`active-notes-${i}`} icon="note-text-outline" label="Notes" onPress={() => setNotesOpen(!notesOpen)} />
        <Mini testID={`active-skip-${i}`} icon={e.skipped ? "undo" : "skip-forward"} label={e.skipped ? "Unskip" : "Skip"} onPress={() => updateSessionExercise(e.id, { skipped: e.skipped ? 0 : 1 })} />
        <Mini testID={`active-remove-${i}`} icon="delete-outline" label="Remove" onPress={async () => { if (await onConfirm({ title: `Remove ${e.name}?`, destructive: true, confirmText: "Remove" })) removeSessionExercise(e.id); }} />
      </View>
    </Card>
  );
}

function Mini({ icon, label, onPress, testID }: { icon: any; label: string; onPress: () => void; testID: string }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingHorizontal: 10, borderRadius: 18, backgroundColor: colors.brandTertiary }}>
      <Icon name={icon} size={16} color={colors.onBrandTertiary} />
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onBrandTertiary }}>{label}</Text>
    </Pressable>
  );
}
