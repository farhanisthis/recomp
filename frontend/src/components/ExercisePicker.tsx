import { useState } from "react";
import { Field, Sheet, SettingsRow } from "./ui";
import { listExercises, type Exercise } from "../db/repo/workout";
import { useQ } from "../lib/useQ";

export function ExercisePicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const [q, setQ] = useState("");
  const { data } = useQ(() => listExercises(q), [q]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Add exercise" testID="exercise-picker">
      <Field testID="exercise-picker-search" placeholder="Search exercises" value={q} onChangeText={setQ} />
      {(data ?? []).map((e) => (
        <SettingsRow key={e.id} testID={`exercise-picker-item-${e.id}`} icon="dumbbell" title={e.name} subtitle={`${e.muscle} · ${e.equipment ?? ""}`} onPress={() => { onPick(e); onClose(); }} />
      ))}
    </Sheet>
  );
}
