import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, Chips, Field, PrimaryButton, ScreenContainer, Segmented, useUI } from "@/src/components/ui";
import { getProfile, getTargets, getUnits, getWeightGoal, saveProfile, saveTargets, setWeightGoal } from "@/src/db/repo/settings";
import { ACTIVITIES, GOALS, lIn, lOut, num, round, suggestTargets, wIn, wOut, type Activity, type Goal, type Sex } from "@/src/lib/calc";
import { space, useTheme } from "@/src/theme";

export default function ProfileEdit() {
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useUI();
  const [f, setF] = useState<Record<string, string>>({});
  const [sex, setSex] = useState<Sex>("male");
  const [goal, setGoal] = useState<Goal>("recomp");
  const [act, setAct] = useState<Activity>("moderate");
  const [custom, setCustom] = useState(false);
  const [units, setUnits] = useState<{ weight: "kg" | "lb"; length: "cm" | "in" }>({ weight: "kg", length: "cm" });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      const [p, t, u, wg] = [await getProfile(), await getTargets(), await getUnits(), await getWeightGoal()];
      setUnits(u);
      if (p) {
        setSex(p.sex); setGoal(p.goal); setAct(p.activity);
        setF({
          name: p.name, age: String(p.age), height: String(round(lOut(p.height_cm, u)!, 1)), weight: String(round(wOut(p.weight_kg, u)!, 1)), days: String(p.training_days ?? 0),
          kcal: String(t.calories), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat), water: String(t.water_ml), steps: String(t.steps), sleep: String(round(t.sleep_min / 60, 1)),
          target: wg?.target_kg != null ? String(round(wOut(wg.target_kg, u)!, 1)) : "",
        });
      }
      setCustom(!!t.is_custom);
      setReady(true);
    })();
  }, []);
  if (!ready) return null;
  const up = (k: string) => (v: string) => setF({ ...f, [k]: v });
  const upT = (k: string) => (v: string) => { setCustom(true); setF({ ...f, [k]: v }); };
  const age = num(f.age), h = num(f.height) != null ? lIn(num(f.height)!, units) : null, w = num(f.weight) != null ? wIn(num(f.weight)!, units) : null;
  const sug = age && h && w ? suggestTargets({ sex, weight_kg: w, height_cm: h, age, activity: act, goal }) : null;
  const errs: string[] = [];
  if (!f.name?.trim()) errs.push("Name required");
  if (!age || age < 13 || age > 100) errs.push("Age 13–100");
  if (!h || h < 120 || h > 230) errs.push("Height out of range");
  if (!w || w < 30 || w > 300) errs.push("Weight out of range");
  for (const k of ["kcal", "protein", "carbs", "fat", "water", "steps", "sleep"]) if (num(f[k]) == null || num(f[k])! < 0) errs.push(`Invalid ${k}`);
  if (f.target && (num(f.target) == null || num(f.target)! <= 0)) errs.push("Invalid target weight");

  const applySug = () => { if (sug) { setF({ ...f, kcal: String(sug.calories), protein: String(sug.protein), carbs: String(sug.carbs), fat: String(sug.fat) }); setCustom(false); } };
  const save = async () => {
    // Changing the goal never silently overwrites custom targets; only non-custom targets follow the suggestion.
    const useSug = !custom && sug;
    await saveProfile({ name: f.name.trim(), sex, age: age!, height_cm: h!, weight_kg: w!, goal, activity: act, training_days: num(f.days) ?? 0 });
    await saveTargets({
      calories: useSug ? sug!.calories : num(f.kcal)!, protein: useSug ? sug!.protein : num(f.protein)!, carbs: useSug ? sug!.carbs : num(f.carbs)!, fat: useSug ? sug!.fat : num(f.fat)!,
      water_ml: num(f.water)!, steps: Math.round(num(f.steps)!), sleep_min: Math.round(num(f.sleep)! * 60), is_custom: custom ? 1 : 0,
    });
    const wg = await getWeightGoal();
    const tgt = f.target ? wIn(num(f.target)!, units) : null;
    if (!wg || wg.kind !== goal || (wg.target_kg ?? null) !== tgt) await setWeightGoal(goal, w!, tgt);
    toast("Profile saved");
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };
  return (
    <ScreenContainer back title="Goals & Profile" testID="profile-edit-screen" footer={<PrimaryButton testID="profile-save" title="Save" disabled={errs.length > 0} onPress={save} />}>
      <Field testID="profile-name-input" label="Name" value={f.name} onChangeText={up("name")} />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Field testID="profile-age-input" style={{ flex: 1 }} label="Age" value={f.age} onChangeText={up("age")} keyboardType="number-pad" />
        <View style={{ flex: 1.4, gap: 6 }}><Text style={{ fontWeight: "700", fontSize: 13, color: colors.onSurface }}>Sex</Text>
          <Segmented testID="profile-sex" value={sex} onChange={setSex} options={[{ key: "male", label: "Male" }, { key: "female", label: "Female" }]} /></View>
      </View>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Field testID="profile-height-input" style={{ flex: 1 }} label="Height" value={f.height} onChangeText={up("height")} keyboardType="decimal-pad" suffix={units.length} />
        <Field testID="profile-weight-input" style={{ flex: 1 }} label="Weight (for estimates)" value={f.weight} onChangeText={up("weight")} keyboardType="decimal-pad" suffix={units.weight} />
      </View>
      <Text style={{ fontWeight: "800", color: colors.onSurface }}>Fitness goal</Text>
      <Chips testID="profile-goal" value={goal} onChange={setGoal} options={GOALS.map((g) => ({ key: g.key, label: g.title }))} />
      <Chips testID="profile-activity" value={act} onChange={setAct} options={ACTIVITIES.map((a) => ({ key: a.key, label: a.title }))} />
      <Field testID="profile-days-input" label="Training days / week" value={f.days} onChangeText={up("days")} keyboardType="number-pad" />
      <Field testID="profile-target-weight-input" label={goal === "recomp" || goal === "maintain" ? "Target weight (optional — not needed for recomp)" : "Target weight (optional)"} value={f.target} onChangeText={up("target")} keyboardType="decimal-pad" suffix={units.weight} />
      <Card style={{ gap: space.sm }}>
        <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Daily targets {custom ? "(custom)" : "(auto)"}</Text>
        {sug && <Text style={{ color: colors.muted, fontSize: 12 }} testID="profile-suggested">Suggested estimate: {sug.calories} kcal · P {sug.protein} · C {sug.carbs} · F {sug.fat}</Text>}
        {custom && sug && <Pressable testID="profile-apply-suggested" onPress={applySug}><Text style={{ color: colors.brand, fontWeight: "700" }}>Apply suggested targets</Text></Pressable>}
        <Field testID="profile-kcal-input" label="Calories" value={f.kcal} onChangeText={upT("kcal")} keyboardType="number-pad" suffix="kcal" />
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Field testID="profile-protein-input" style={{ flex: 1 }} label="Protein" value={f.protein} onChangeText={upT("protein")} keyboardType="number-pad" suffix="g" />
          <Field testID="profile-carbs-input" style={{ flex: 1 }} label="Carbs" value={f.carbs} onChangeText={upT("carbs")} keyboardType="number-pad" suffix="g" />
          <Field testID="profile-fat-input" style={{ flex: 1 }} label="Fat" value={f.fat} onChangeText={upT("fat")} keyboardType="number-pad" suffix="g" />
        </View>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Field testID="profile-water-input" style={{ flex: 1 }} label="Water" value={f.water} onChangeText={up("water")} keyboardType="number-pad" suffix="ml" />
          <Field testID="profile-steps-input" style={{ flex: 1 }} label="Steps" value={f.steps} onChangeText={up("steps")} keyboardType="number-pad" />
          <Field testID="profile-sleep-input" style={{ flex: 1 }} label="Sleep" value={f.sleep} onChangeText={up("sleep")} keyboardType="decimal-pad" suffix="h" />
        </View>
      </Card>
      {errs.length > 0 && <Text style={{ color: colors.error }} testID="profile-errors">{errs.join(" · ")}</Text>}
    </ScreenContainer>
  );
}
