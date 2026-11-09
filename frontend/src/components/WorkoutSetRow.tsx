import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { updateSet, type SSet, type Tracking } from "../db/repo/workout";
import { num, round, type Units, wIn, wOut } from "../lib/calc";
import { makeStyles, radius, space, useTheme } from "../theme";
import { Icon } from "./ui";

/** One editable set row. Values persist on every keystroke (no re-render), done toggle refreshes. */
export function WorkoutSetRow({ set, index, tracking, units, onDelete, onDone, testID }: {
  set: SSet; index: number; tracking: Tracking; units: Units; onDelete: () => void; onDone?: (done: boolean) => void; testID: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [w, setW] = useState(set.weight != null ? String(round(wOut(set.weight, units)!, 2)) : "");
  const [r, setR] = useState(set.reps != null ? String(set.reps) : "");
  const [t, setT] = useState(set.duration_sec != null ? String(set.duration_sec) : set.distance_m != null ? String(set.distance_m) : "");
  const warm = set.kind === "warmup";
  const showW = tracking === "weight_reps";
  const showR = tracking === "weight_reps" || tracking === "reps";
  const extra = tracking === "time" ? "sec" : tracking === "distance" ? "m" : null;
  return (
    <View style={[s.row, set.done ? s.done : null]} testID={testID}>
      <Pressable testID={`${testID}-kind`} onPress={() => updateSet(set.id, { kind: warm ? "working" : "warmup" })} style={[s.idx, warm && { backgroundColor: colors.carbs }]}>
        <Text style={[s.idxT, warm && { color: colors.onWarning }]}>{warm ? "W" : index + 1}</Text>
      </Pressable>
      {showW && (
        <View style={s.cell}>
          <TextInput testID={`${testID}-weight`} style={s.input} value={w} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted}
            onChangeText={(v) => { setW(v); const n = num(v); if (v === "" || (n != null && n >= 0)) updateSet(set.id, { weight: v === "" ? null : wIn(n!, units) }, false); }} />
          <Text style={s.unit}>{units.weight}</Text>
        </View>
      )}
      {showR && (
        <View style={s.cell}>
          <TextInput testID={`${testID}-reps`} style={s.input} value={r} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted}
            onChangeText={(v) => { setR(v); const n = num(v); if (v === "" || (n != null && n >= 0)) updateSet(set.id, { reps: v === "" ? null : Math.round(n!) }, false); }} />
          <Text style={s.unit}>reps</Text>
        </View>
      )}
      {extra && (
        <View style={s.cell}>
          <TextInput testID={`${testID}-value`} style={s.input} value={t} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted}
            onChangeText={(v) => { setT(v); const n = num(v); if (v === "" || (n != null && n >= 0)) updateSet(set.id, tracking === "time" ? { duration_sec: n } : { distance_m: n }, false); }} />
          <Text style={s.unit}>{extra}</Text>
        </View>
      )}
      <Pressable testID={`${testID}-done`} hitSlop={6} onPress={() => { updateSet(set.id, { done: set.done ? 0 : 1 }); onDone?.(!set.done); }}>
        <Icon name={set.done ? "check-circle" : "checkbox-blank-circle-outline"} size={30} color={set.done ? colors.brand : colors.borderStrong} />
      </Pressable>
      <Pressable testID={`${testID}-delete`} hitSlop={6} onPress={onDelete}><Icon name="close" size={18} color={colors.muted} /></Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.md },
  done: { backgroundColor: c.brandTertiary },
  idx: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  idxT: { fontWeight: "800", color: c.onSurfaceTertiary },
  cell: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: radius.sm, paddingHorizontal: space.sm, height: 42 },
  input: { flex: 1, fontSize: 16, fontWeight: "700", color: c.onSurface, minWidth: 30 },
  unit: { fontSize: 12, color: c.muted },
}));
