import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Chips, EmptyState, Field, PrimaryButton, ScreenContainer, Segmented, SettingsRow, Sheet, useUI } from "@/src/components/ui";
import { createExercise, listExercises, type Tracking } from "@/src/db/repo/workout";
import { useQ } from "@/src/lib/useQ";
import { space } from "@/src/theme";

const MUSCLES = ["All", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Full Body"];
export default function Exercises() {
  const router = useRouter();
  const { toast } = useUI();
  const [q, setQ] = useState("");
  const [m, setM] = useState("All");
  const { data } = useQ(() => listExercises(q, m), [q, m]);
  const [open, setOpen] = useState(false);
  const [n, setN] = useState({ name: "", muscle: "Chest", equipment: "", tracking: "weight_reps" as Tracking, instructions: "" });
  return (
    <ScreenContainer back title="Exercise Library" testID="exercises-screen"
      footer={<PrimaryButton testID="exercise-create-button" icon="plus" title="Create Exercise" onPress={() => setOpen(true)} />}>
      <Field testID="exercise-search-input" placeholder="Search exercises..." value={q} onChangeText={setQ} />
      <Chips testID="exercise-muscle" value={m} onChange={setM} options={MUSCLES.map((x) => ({ key: x, label: x }))} />
      <View style={{ gap: space.sm }}>
        {data?.length === 0 && <EmptyState illus="bench_press" title="No exercises found" />}
        {data?.map((e) => (
          <SettingsRow key={e.id} testID={`exercise-item-${e.id}`} icon={e.muscle === "Cardio" ? "run" : "dumbbell"} title={e.name} subtitle={`${e.muscle} · ${e.equipment ?? "—"}${e.is_custom ? " · Custom" : ""}`} onPress={() => router.push(`/workout/exercise/${e.id}`)} />
        ))}
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)} title="New exercise" testID="exercise-create-sheet">
        <Field testID="new-exercise-name" label="Name" value={n.name} onChangeText={(v) => setN({ ...n, name: v })} />
        <Chips testID="new-exercise-muscle" value={n.muscle} onChange={(v) => setN({ ...n, muscle: v })} options={MUSCLES.slice(1).map((x) => ({ key: x, label: x }))} />
        <Field testID="new-exercise-equipment" label="Equipment" value={n.equipment} onChangeText={(v) => setN({ ...n, equipment: v })} placeholder="Barbell, Dumbbell, Machine…" />
        <Segmented testID="new-exercise-tracking" value={n.tracking} onChange={(v) => setN({ ...n, tracking: v })}
          options={[{ key: "weight_reps", label: "Weight" }, { key: "reps", label: "Reps" }, { key: "time", label: "Time" }, { key: "distance", label: "Distance" }]} />
        <Field testID="new-exercise-instructions" label="Instructions (optional)" value={n.instructions} onChangeText={(v) => setN({ ...n, instructions: v })} multiline />
        <PrimaryButton testID="new-exercise-save" title="Save Exercise" disabled={!n.name.trim()} onPress={async () => {
          await createExercise({ name: n.name.trim(), muscle: n.muscle, equipment: n.equipment || null, tracking: n.tracking, instructions: n.instructions || null });
          setOpen(false); setN({ ...n, name: "", instructions: "" }); toast("Exercise created");
        }} />
      </Sheet>
    </ScreenContainer>
  );
}
