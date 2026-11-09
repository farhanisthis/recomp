import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Field, PrimaryButton, ScreenContainer, Segmented, ThreeDIllustration, useUI } from "@/src/components/ui";
import { createFood } from "@/src/db/repo/nutrition";
import { num } from "@/src/lib/calc";
import { space, useTheme } from "@/src/theme";

/** Custom food: values are entered for a reference amount and normalised to per-100. */
export default function CustomFood() {
  const p = useLocalSearchParams<{ name?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useUI();
  const [f, setF] = useState({ name: p.name ?? "", brand: "", ref: "100", basis: "g" as "g" | "ml", kcal: "", protein: "", carbs: "", fat: "", fiber: "", serving: "" });
  const up = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const ref = num(f.ref);
  const vals = { kcal: num(f.kcal), protein: num(f.protein) ?? 0, carbs: num(f.carbs) ?? 0, fat: num(f.fat) ?? 0 };
  const errs: string[] = [];
  if (!f.name.trim()) errs.push("Name is required");
  if (!ref || ref <= 0) errs.push("Reference amount must be > 0");
  if (vals.kcal == null || vals.kcal < 0) errs.push("Calories are required");
  if ([vals.protein, vals.carbs, vals.fat].some((x) => x < 0)) errs.push("Macros cannot be negative");
  if (ref && vals.protein + vals.carbs + vals.fat > ref * 1.01) errs.push("Macros exceed the reference weight");
  const save = async () => {
    const k = 100 / ref!;
    const sg = num(f.serving);
    const id = await createFood(
      { name: f.name.trim(), brand: f.brand.trim() || null, basis: f.basis, kcal: vals.kcal! * k, protein: vals.protein * k, carbs: vals.carbs * k, fat: vals.fat * k, fiber: num(f.fiber) != null ? num(f.fiber)! * k : null },
      sg && sg > 0 ? { label: `1 serving (${sg} ${f.basis})`, unit: "serving", grams: sg } : undefined,
    );
    toast("Custom food saved");
    router.replace(`/food/${id}`);
  };
  return (
    <ScreenContainer back title="Create Custom Food" testID="custom-food-screen"
      footer={<PrimaryButton testID="custom-food-save" title="Save Food" disabled={errs.length > 0} onPress={save} />}>
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="fruit_bowl" size={120} style={{ height: 90 }} /></View>
      <Field testID="custom-name-input" label="Food name" value={f.name} onChangeText={up("name")} placeholder="e.g. Homemade oats" />
      <Field testID="custom-brand-input" label="Brand (optional)" value={f.brand} onChangeText={up("brand")} />
      <Segmented testID="custom-basis" value={f.basis} onChange={(v) => setF({ ...f, basis: v })} options={[{ key: "g", label: "Solid (g)" }, { key: "ml", label: "Liquid (ml)" }]} />
      <Field testID="custom-ref-input" label="Values below are for" value={f.ref} onChangeText={up("ref")} keyboardType="decimal-pad" suffix={f.basis} />
      <Field testID="custom-kcal-input" label="Calories" value={f.kcal} onChangeText={up("kcal")} keyboardType="decimal-pad" suffix="kcal" />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Field testID="custom-protein-input" style={{ flex: 1 }} label="Protein" value={f.protein} onChangeText={up("protein")} keyboardType="decimal-pad" suffix="g" />
        <Field testID="custom-carbs-input" style={{ flex: 1 }} label="Carbs" value={f.carbs} onChangeText={up("carbs")} keyboardType="decimal-pad" suffix="g" />
        <Field testID="custom-fat-input" style={{ flex: 1 }} label="Fat" value={f.fat} onChangeText={up("fat")} keyboardType="decimal-pad" suffix="g" />
      </View>
      <Field testID="custom-fiber-input" label="Fiber (optional)" value={f.fiber} onChangeText={up("fiber")} keyboardType="decimal-pad" suffix="g" />
      <Field testID="custom-serving-input" label="Serving size (optional)" value={f.serving} onChangeText={up("serving")} keyboardType="decimal-pad" suffix={f.basis} placeholder="e.g. 40" />
      {f.name !== "" && errs.length > 0 && <Text style={{ color: colors.error }} testID="custom-food-errors">{errs.join(" · ")}</Text>}
    </ScreenContainer>
  );
}
