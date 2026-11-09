import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ExercisePicker } from "@/src/components/ExercisePicker";
import { Card, Field, Icon, PrimaryButton, ScreenContainer, SecondaryButton, ThreeDIllustration, useUI } from "@/src/components/ui";
import { getUnits } from "@/src/db/repo/settings";
import { getPlan, savePlan, type PlanExercise } from "@/src/db/repo/workout";
import { num, round, WEEKDAYS, wIn, wOut } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

type Row = PlanExercise & { setsT: string; weightT: string; restT: string };
export default function PlanEdit() {
  const p = useLocalSearchParams<{ id?: string }>();
  const id = p.id ? Number(p.id) : null;
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useUI();
  const { data: units } = useQ(getUnits);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [picker, setPicker] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { confirm } = useUI();

  useEffect(() => {
    if (!id || !units) return;
    getPlan(id).then((pl) => {
      if (!pl) return;
      setName(pl.name); setDesc(pl.description ?? "");
      setDays((pl.schedule_days ?? "").split(",").filter(Boolean).map(Number));
      setRows(pl.exercises.map((e) => ({ ...e, setsT: String(e.sets), weightT: e.target_weight != null ? String(round(wOut(e.target_weight, units)!, 1)) : "", restT: String(e.rest_sec) })));
    });
  }, [id, units]);

  const upd = (k: number, patch: Partial<Row>) => { setDirty(true); setRows(rows.map((r, j) => (j === k ? { ...r, ...patch } : r))); };
  const move = (k: number, d: number) => {
    const j = k + d; if (j < 0 || j >= rows.length) return;
    const c = [...rows]; [c[k], c[j]] = [c[j], c[k]]; setRows(c); setDirty(true);
  };
  const valid = name.trim() && rows.length > 0 && rows.every((r) => (num(r.setsT) ?? 0) >= 1 && (num(r.setsT) ?? 0) <= 20 && (num(r.restT) ?? -1) >= 0 && (r.weightT === "" || (num(r.weightT) ?? -1) >= 0));
  const save = async () => {
    const pid = await savePlan(id, { name: name.trim(), description: desc || null, notes: null, schedule_days: days.length ? days.sort().join(",") : null },
      rows.map((r) => ({ ...r, sets: Math.round(num(r.setsT)!), target_weight: r.weightT === "" ? null : wIn(num(r.weightT)!, units!), rest_sec: Math.round(num(r.restT)!) })));
    toast("Plan saved");
    setDirty(false);
    router.replace(`/workout/plan/${pid}`);
  };
  const back = async () => { if (!dirty || (await confirm({ title: "Discard changes?", destructive: true, confirmText: "Discard" }))) router.back(); };

  return (
    <ScreenContainer back onBack={back} title={id ? "Edit Workout" : "Create Workout"} testID="plan-edit-screen"
      footer={<PrimaryButton testID="plan-save" title={id ? "Save Workout" : "Create Workout"} disabled={!valid} onPress={save} />}>
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="dumbbell_plus" size={140} style={{ height: 90 }} /></View>
      <Field testID="plan-name-input" label="Workout name" value={name} onChangeText={(v) => { setName(v); setDirty(true); }} placeholder="e.g. Push Day" />
      <Field testID="plan-desc-input" label="Description (optional)" value={desc} onChangeText={(v) => { setDesc(v); setDirty(true); }} placeholder="Chest, shoulders, triceps" />
      <Text style={{ fontWeight: "700", color: colors.onSurface }}>Schedule (optional)</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {WEEKDAYS.map((d, i) => (
          <Pressable key={d} testID={`plan-day-${i}`} onPress={() => { setDirty(true); setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i]); }}
            style={{ flex: 1, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: days.includes(i) ? colors.brandPrimary : colors.surfaceSecondary }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: days.includes(i) ? colors.onBrandPrimary : colors.onSurfaceTertiary }}>{d}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontWeight: "800", fontSize: 17, color: colors.onSurface }}>Exercises ({rows.length})</Text>
      {rows.map((r, k) => (
        <Card key={`${r.exercise_id}-${k}`} style={{ gap: space.sm }} testID={`plan-row-${k}`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 15, color: colors.onSurface }}>{k + 1}. {r.name}</Text>
            <Pressable testID={`plan-row-up-${k}`} onPress={() => move(k, -1)} hitSlop={6}><Icon name="arrow-up" color={colors.muted} /></Pressable>
            <Pressable testID={`plan-row-down-${k}`} onPress={() => move(k, 1)} hitSlop={6}><Icon name="arrow-down" color={colors.muted} /></Pressable>
            <Pressable testID={`plan-row-remove-${k}`} onPress={() => { setDirty(true); setRows(rows.filter((_, j) => j !== k)); }} hitSlop={6}><Icon name="close" color={colors.error} /></Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Field testID={`plan-sets-${k}`} style={{ flex: 1 }} label="Sets" value={r.setsT} onChangeText={(v) => upd(k, { setsT: v })} keyboardType="number-pad" />
            <Field testID={`plan-reps-${k}`} style={{ flex: 1.2 }} label="Reps" value={r.target_reps} onChangeText={(v) => upd(k, { target_reps: v })} placeholder="8-12" />
            <Field testID={`plan-weight-${k}`} style={{ flex: 1.2 }} label={`Weight`} value={r.weightT} onChangeText={(v) => upd(k, { weightT: v })} keyboardType="decimal-pad" suffix={units?.weight} />
            <Field testID={`plan-rest-${k}`} style={{ flex: 1 }} label="Rest s" value={r.restT} onChangeText={(v) => upd(k, { restT: v })} keyboardType="number-pad" />
          </View>
          <Field testID={`plan-notes-${k}`} placeholder="Notes (optional)" value={r.notes ?? ""} onChangeText={(v) => upd(k, { notes: v })} />
        </Card>
      ))}
      <SecondaryButton testID="plan-add-exercise" icon="plus" title="Add Exercise" onPress={() => setPicker(true)} />
      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={(e) => { setDirty(true); setRows((rs) => [...rs, { exercise_id: e.id, name: e.name, sets: 3, target_reps: "8-12", target_weight: null, rest_sec: 90, notes: null, setsT: "3", weightT: "", restT: "90" }]); }} />
    </ScreenContainer>
  );
}
