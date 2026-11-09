import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, Icon, PrimaryButton, Segmented, ThreeDIllustration, FadeInView, IconName } from "@/src/components/ui";
import { getMeta, saveProfile, saveTargets, setMeta, setWeightGoal } from "@/src/db/repo/settings";
import { addDays, dayKey, ACTIVITIES, GOALS, num, suggestTargets, type Activity, type Goal, type Sex } from "@/src/lib/calc";
import { saveMeasurement } from "@/src/db/repo/body";
import { makeStyles, space, radius, useTheme } from "@/src/theme";

type Draft = { name: string; age: string; sex: Sex; height: string; weight: string; goal: Goal; activity: Activity; days: string; kcal: string; protein: string; carbs: string; fat: string; custom: boolean };
const initial: Draft = { name: "", age: "", sex: "male", height: "", weight: "", goal: "recomp", activity: "moderate", days: "4", kcal: "", protein: "", carbs: "", fat: "", custom: false };
const GOAL_ICON: Record<Goal, IconName> = { fat_loss: "fire", muscle_gain: "arm-flex", recomp: "target", maintain: "leaf" };
const ACT_ICON: Record<Activity, IconName> = { sedentary: "sofa-outline", light: "walk", moderate: "run", very: "run-fast" };

export default function Onboarding() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await getMeta("onboarding_draft");
      const st = await getMeta("onboarding_step");
      if (raw) setD({ ...initial, ...JSON.parse(raw) });
      if (st) setStep(Number(st));
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (loaded) {
      setMeta("onboarding_draft", JSON.stringify(d), false);
      setMeta("onboarding_step", String(step), false);
    }
  }, [d, step, loaded]);

  const up = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const age = num(d.age), h = num(d.height), w = num(d.weight);

  const computeTargets = () => {
    const t = suggestTargets({ sex: d.sex, weight_kg: w!, height_cm: h!, age: age!, activity: d.activity, goal: d.goal });
    if (!d.custom) up({ kcal: String(t.calories), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) });
  };

  const next = async () => {
    setErr(null);
    if (step === 1) {
      if (!d.name.trim()) return setErr("Please enter your name");
      if (!age || age < 13 || age > 100) return setErr("Age must be between 13 and 100");
      if (!h || h < 120 || h > 230) return setErr("Height must be 120–230 cm");
      if (!w || w < 30 || w > 300) return setErr("Weight must be 30–300 kg");
    }
    if (step === 3) {
      const days = num(d.days);
      if (days == null || days < 0 || days > 7) return setErr("Training days must be 0–7");
      computeTargets();
    }
    if (step === 4) {
      const vals = [d.kcal, d.protein, d.carbs, d.fat].map(num);
      if (vals.some((v) => v == null || v < 0) || (vals[0] ?? 0) < 1000) return setErr("Enter valid targets (calories ≥ 1000)");
    }
    if (step === 5) return finish();
    setStep(step + 1);
  };

  const finish = async () => {
    await saveProfile({ name: d.name.trim(), sex: d.sex, age: age!, height_cm: h!, weight_kg: w!, goal: d.goal, activity: d.activity, training_days: num(d.days) ?? 0 });
    await saveTargets({ calories: num(d.kcal)!, protein: num(d.protein)!, carbs: num(d.carbs)!, fat: num(d.fat)!, water_ml: 3000, steps: 8000, sleep_min: 480, is_custom: d.custom ? 1 : 0 });
    await saveMeasurement(null, { day: dayKey(), weight_kg: w!, body_fat: null, waist: null, chest: null, hips: null, neck: null, arms: null, thighs: null, calves: null, notes: "Starting weight" });
    await setWeightGoal(d.goal, w!, null);
    await setMeta("onboarding_done", "1");
    await setMeta("onboarding_draft", null);
    router.replace("/(tabs)");
  };
  void addDays;

  const titles = ["", "Tell Us About You", "What's Your Goal?", "Your Activity Level", "Your Daily Targets", ""];
  return (
    <View style={[s.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }]} testID="onboarding-screen">
      {step > 0 && (
        <View style={s.top}>
          <Pressable testID="onboarding-back-button" onPress={() => setStep(step - 1)} hitSlop={10} style={{ width: 44, height: 44, justifyContent: "center" }}>
            <Icon name="chevron-left" size={28} />
          </Pressable>
          <Text style={s.title}>{titles[step]}</Text>
          <View style={{ width: 44 }} />
        </View>
      )}
      <View style={s.dots}>{[0, 1, 2, 3, 4, 5].map((i) => <View key={i} style={[s.dot, i === step && s.dotOn]} />)}</View>

      <FadeInView key={step} style={{ flex: 1, paddingHorizontal: space.lg, gap: space.md }}>
        {step === 0 && (
          <View style={s.center}>
            <Text style={s.brand}>RECOMP</Text>
            <Text style={s.tag}>Track · Train · Transform</Text>
            <ThreeDIllustration name="hero_gym" size={250} />
            <Text style={s.big}>Your Complete{"\n"}Fitness Companion</Text>
            <Text style={s.sub}>Nutrition, workouts and progress — all stored privately on your phone. No account needed.</Text>
          </View>
        )}
        {step === 1 && (
          <>
            <View style={{ alignItems: "center" }}><ThreeDIllustration name="avatar" size={120} /></View>
            <Field testID="onboarding-name-input" label="Name" value={d.name} onChangeText={(v) => up({ name: v })} placeholder="Your name" />
            <View style={{ flexDirection: "row", gap: space.md }}>
              <Field testID="onboarding-age-input" style={{ flex: 1 }} label="Age" value={d.age} onChangeText={(v) => up({ age: v })} keyboardType="number-pad" suffix="yrs" placeholder="24" />
              <View style={{ flex: 1.3, gap: 6 }}>
                <Text style={s.label}>Sex (for energy estimate)</Text>
                <Segmented testID="onboarding-sex" value={d.sex} onChange={(v) => up({ sex: v })} options={[{ key: "male", label: "Male" }, { key: "female", label: "Female" }]} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: space.md }}>
              <Field testID="onboarding-height-input" style={{ flex: 1 }} label="Height" value={d.height} onChangeText={(v) => up({ height: v })} keyboardType="decimal-pad" suffix="cm" placeholder="175" />
              <Field testID="onboarding-weight-input" style={{ flex: 1 }} label="Current weight" value={d.weight} onChangeText={(v) => up({ weight: v })} keyboardType="decimal-pad" suffix="kg" placeholder="74.8" />
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <View style={{ alignItems: "center" }}><ThreeDIllustration name="target" size={110} /></View>
            {GOALS.map((g) => (
              <Option key={g.key} testID={`goal-option-${g.key}`} icon={GOAL_ICON[g.key]} title={g.title} sub={g.sub} on={d.goal === g.key} onPress={() => up({ goal: g.key })} />
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <View style={{ alignItems: "center" }}><ThreeDIllustration name="shoes" size={110} /></View>
            {ACTIVITIES.map((a) => (
              <Option key={a.key} testID={`activity-option-${a.key}`} icon={ACT_ICON[a.key]} title={a.title} sub={a.sub} on={d.activity === a.key} onPress={() => up({ activity: a.key })} />
            ))}
            <Field testID="onboarding-days-input" label="Planned training days per week" value={d.days} onChangeText={(v) => up({ days: v })} keyboardType="number-pad" suffix="days" />
          </>
        )}
        {step === 4 && (
          <>
            <View style={{ alignItems: "center" }}>
              <ThreeDIllustration name="target" size={80} />
              <Text style={s.big} testID="onboarding-kcal-display">{d.kcal || "—"} kcal</Text>
              <Text style={s.sub}>Estimated with Mifflin–St Jeor × activity factor, adjusted for your goal. Edit anything.</Text>
            </View>
            <Field testID="onboarding-kcal-input" label="Calories" value={d.kcal} onChangeText={(v) => up({ kcal: v, custom: true })} keyboardType="number-pad" suffix="kcal" />
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Field testID="onboarding-protein-input" style={{ flex: 1 }} label="Protein" value={d.protein} onChangeText={(v) => up({ protein: v, custom: true })} keyboardType="number-pad" suffix="g" />
              <Field testID="onboarding-carbs-input" style={{ flex: 1 }} label="Carbs" value={d.carbs} onChangeText={(v) => up({ carbs: v, custom: true })} keyboardType="number-pad" suffix="g" />
              <Field testID="onboarding-fat-input" style={{ flex: 1 }} label="Fat" value={d.fat} onChangeText={(v) => up({ fat: v, custom: true })} keyboardType="number-pad" suffix="g" />
            </View>
            {d.custom && (
              <Pressable testID="onboarding-reset-targets" onPress={() => { const t = suggestTargets({ sex: d.sex, weight_kg: w!, height_cm: h!, age: age!, activity: d.activity, goal: d.goal }); up({ custom: false, kcal: String(t.calories), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) }); }}>
                <Text style={{ color: colors.brand, fontWeight: "700", textAlign: "center" }}>Use suggested targets</Text>
              </Pressable>
            )}
          </>
        )}
        {step === 5 && (
          <View style={s.center}>
            <ThreeDIllustration name="trophy" size={200} />
            <Text style={s.big}>You&apos;re All Set!</Text>
            <Text style={s.sub}>Your personalised plan is ready.</Text>
            <View style={{ alignSelf: "stretch", gap: space.sm, marginTop: space.md }}>
              <Summary icon="fire" color={colors.carbs} value={`${d.kcal} kcal`} label="Daily calories (estimate)" />
              <Summary icon="arm-flex" color={colors.protein} value={`${d.protein} g`} label="Protein" />
              <Summary icon="dumbbell" color={colors.brand} value={`${d.days} days/week`} label="Training target" />
            </View>
          </View>
        )}
      </FadeInView>
      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {!!err && <Text style={s.err} testID="onboarding-error">{err}</Text>}
        <PrimaryButton testID="onboarding-next-button" title={step === 0 ? "Get Started" : step === 5 ? "Start My Plan" : step === 4 ? "Confirm Targets" : "Next"} onPress={next} />
      </View>
    </View>
  );

  function Option({ icon, title, sub, on, onPress, testID }: { icon: IconName; title: string; sub: string; on: boolean; onPress: () => void; testID: string }) {
    return (
      <Pressable testID={testID} onPress={onPress} style={[s.opt, on && s.optOn]}>
        <View style={s.optIcon}><Icon name={icon} color={colors.brand} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.optTitle}>{title}</Text>
          <Text style={s.optSub}>{sub}</Text>
        </View>
        <Icon name={on ? "check-circle" : "circle-outline"} color={on ? colors.brand : colors.borderStrong} />
      </Pressable>
    );
  }
  function Summary({ icon, color, value, label }: { icon: IconName; color: string; value: string; label: string }) {
    return (
      <View style={s.opt}>
        <Icon name={icon} color={color} size={26} />
        <View><Text style={s.optTitle}>{value}</Text><Text style={s.optSub}>{label}</Text></View>
      </View>
    );
  }
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: c.onSurface },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", marginVertical: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderStrong },
  dotOn: { width: 18, backgroundColor: c.brand },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  brand: { fontSize: 44, fontWeight: "900", color: c.brandDeep, letterSpacing: 1 },
  tag: { fontSize: 16, color: c.onSurfaceTertiary, fontWeight: "600" },
  big: { fontSize: 26, fontWeight: "900", color: c.onSurface, textAlign: "center" },
  sub: { fontSize: 14, color: c.muted, textAlign: "center", paddingHorizontal: space.lg },
  label: { fontSize: 13, fontWeight: "700", color: c.onSurface },
  opt: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, minHeight: 64, borderRadius: radius.lg, backgroundColor: c.surfaceSecondary, borderWidth: 1.5, borderColor: "transparent" },
  optOn: { borderColor: c.brand, backgroundColor: c.brandTertiary },
  optIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  optTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  optSub: { fontSize: 13, color: c.muted },
  err: { color: c.error, textAlign: "center", fontWeight: "600" },
}));
