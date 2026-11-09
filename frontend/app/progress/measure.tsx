import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { DateNav, Field, PrimaryButton, ScreenContainer, SecondaryButton, ThreeDIllustration, useUI } from "@/src/components/ui";
import { deleteMeasurement, getMeasurement, MEASURE_FIELDS, saveMeasurement } from "@/src/db/repo/body";
import { getUnits } from "@/src/db/repo/settings";
import { dayKey, fmtDay, lIn, lOut, num, round, wIn, wOut } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

const LABEL: Record<string, string> = { waist: "Waist", chest: "Chest", hips: "Hips", neck: "Neck", arms: "Arms", thighs: "Thighs", calves: "Calves" };
export default function Measure() {
  const p = useLocalSearchParams<{ id?: string }>();
  const id = p.id ? Number(p.id) : null;
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const { data: units } = useQ(getUnits);
  const [day, setDay] = useState(dayKey());
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!id || !units) return;
    getMeasurement(id).then((m) => {
      if (!m) return;
      setDay(m.day);
      const o: Record<string, string> = { notes: m.notes ?? "" };
      if (m.weight_kg != null) o.weight = String(round(wOut(m.weight_kg, units)!, 2));
      if (m.body_fat != null) o.body_fat = String(m.body_fat);
      for (const f of MEASURE_FIELDS) if (m[f] != null) o[f] = String(round(lOut(m[f], units)!, 1));
      setV(o);
    });
  }, [id, units]);
  if (!units) return null;
  const up = (k: string) => (t: string) => setV({ ...v, [k]: t });
  const errs: string[] = [];
  const w = num(v.weight), bf = num(v.body_fat);
  if (v.weight && (w == null || wIn(w, units) < 25 || wIn(w, units) > 350)) errs.push("Weight looks invalid");
  if (v.body_fat && (bf == null || bf < 2 || bf > 70)) errs.push("Body fat must be 2–70%");
  for (const f of MEASURE_FIELDS) if (v[f] && (num(v[f]) == null || num(v[f])! <= 0)) errs.push(`${LABEL[f]} invalid`);
  const any = ["weight", "body_fat", ...MEASURE_FIELDS].some((k) => v[k]?.trim());
  if (day > dayKey()) errs.push("Date cannot be in the future");
  const save = async () => {
    const m: any = { day, weight_kg: w != null ? wIn(w, units) : null, body_fat: bf, notes: v.notes?.trim() || null };
    for (const f of MEASURE_FIELDS) m[f] = num(v[f]) != null ? lIn(num(v[f])!, units) : null;
    await saveMeasurement(id, m);
    toast("Measurement saved");
    router.back();
  };
  return (
    <ScreenContainer back title={id ? "Edit Measurement" : "Log Measurement"} testID="measure-screen"
      footer={<PrimaryButton testID="measure-save" title="Save" disabled={!any || errs.length > 0} onPress={save} />}>
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="scale" size={140} style={{ height: 100 }} /></View>
      <DateNav testID="measure-date" day={day} onChange={setDay} label={fmtDay(day)} />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Field testID="measure-weight-input" style={{ flex: 1 }} label="Weight" value={v.weight ?? ""} onChangeText={up("weight")} keyboardType="decimal-pad" suffix={units.weight} />
        <Field testID="measure-bodyfat-input" style={{ flex: 1 }} label="Body fat" value={v.body_fat ?? ""} onChangeText={up("body_fat")} keyboardType="decimal-pad" suffix="%" />
      </View>
      <Text style={{ fontWeight: "800", color: colors.onSurface }}>Body measurements (optional)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {MEASURE_FIELDS.map((f) => (
          <Field key={f} testID={`measure-${f}-input`} style={{ width: "48%", flexGrow: 1 }} label={LABEL[f]} value={v[f] ?? ""} onChangeText={up(f)} keyboardType="decimal-pad" suffix={units.length} />
        ))}
      </View>
      <Field testID="measure-notes-input" label="Notes" value={v.notes ?? ""} onChangeText={up("notes")} />
      {errs.length > 0 && <Text style={{ color: colors.error }} testID="measure-errors">{errs.join(" · ")}</Text>}
      {id && <SecondaryButton testID="measure-delete" danger title="Delete entry" onPress={async () => { if (await confirm({ title: "Delete measurement?", destructive: true, confirmText: "Delete" })) { await deleteMeasurement(id); router.back(); } }} />}
    </ScreenContainer>
  );
}
