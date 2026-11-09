import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, FadeInView, HeaderIcon, Icon, LoadingIndicator, NutritionProgress, PrimaryButton, ProgressBar, ScreenContainer, ThreeDIllustration, IconName } from "@/src/components/ui";
import { sleepFor, stepsFor, latestWeight } from "@/src/db/repo/body";
import { dayTotals, waterTotal } from "@/src/db/repo/nutrition";
import { getProfile, getTargets, getUnits } from "@/src/db/repo/settings";
import { getActiveSession, getPlan, planForWeekday, startSession } from "@/src/db/repo/workout";
import { db } from "@/src/db/client";
import { dayKey, fmtDay, fmtMinutes, fmtW, MEAL_LABEL, MEALS, parseDay, WEEKDAYS } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { makeStyles, radius, space, useTheme } from "@/src/theme";
import type { IllusName } from "@/src/assets";

const MEAL_ICON: Record<string, IconName> = { breakfast: "coffee", lunch: "food", dinner: "food-turkey", snacks: "food-apple" };

async function loadHome(day: string) {
  const [profile, targets, totals, water, steps, sleep, weight, active, units] = await Promise.all([
    getProfile(), getTargets(), dayTotals(day), waterTotal(day), stepsFor(day), sleepFor(day), latestWeight(), getActiveSession(), getUnits(),
  ]);
  const done = await db.all<{ id: number; name: string; duration_sec: number }>("SELECT id, name, duration_sec FROM workout_sessions WHERE status='completed' AND day=? ORDER BY id DESC", [day]);
  const sched = await planForWeekday(parseDay(day).getDay());
  const plan = sched ? await getPlan(sched.id) : null;
  const prevW = weight ? await db.get<{ weight_kg: number }>("SELECT weight_kg FROM body_measurements WHERE weight_kg IS NOT NULL AND day<? ORDER BY day DESC LIMIT 1", [weight.day]) : null;
  return { profile, targets, totals, water, steps, sleep, weight, prevW, active, done, plan, sched, units };
}

export default function Home() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [day, setDay] = useState(dayKey());
  const { data } = useQ(() => loadHome(day), [day]);
  if (!data) return <ScreenContainer tab><LoadingIndicator /></ScreenContainer>;
  const { profile, targets, totals, water, steps, sleep, weight, prevW, active, done, plan, units } = data;
  const isToday = day === dayKey();
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const start = async () => {
    const r = await startSession(plan?.id ?? null);
    router.push(`/workout/active?id=${r.id}`);
  };

  return (
    <ScreenContainer
      tab large title="RECOMP"
      subtitle={`${isToday ? `${greet}, ${profile?.name?.split(" ")[0] ?? ""} · ` : ""}${fmtDay(day)}${plan ? ` · ${plan.name}` : ""}`}
      right={
        <>
          <HeaderIcon testID="home-prev-day" icon="chevron-left" onPress={() => setDay(shift(day, -1))} />
          <HeaderIcon testID="home-next-day" icon={isToday ? "calendar-today" : "chevron-right"} onPress={() => setDay(isToday ? day : shift(day, 1))} />
        </>
      }
      testID="home-screen"
    >
      {!isToday && (
        <Pressable testID="home-go-today" onPress={() => setDay(dayKey())}><Text style={s.link}>Back to today</Text></Pressable>
      )}
      <FadeInView>
        <Card style={s.hero} testID="home-workout-card">
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.label}>{active ? "Workout in progress" : done.length ? "Workout done" : isToday ? "Today's Workout" : "Workout"}</Text>
            <Text style={s.heroTitle} numberOfLines={2}>{active ? active.name : done.length ? done[0].name : plan ? plan.name : "No workout scheduled"}</Text>
            <Text style={s.cap}>
              {active ? "Tap resume to continue" : done.length ? `${done.length} session${done.length > 1 ? "s" : ""} completed` : plan ? `${plan.exercises.length} exercises · ${plan.exercises.reduce((a, e) => a + e.sets, 0)} sets` : "Create a plan or start a quick session"}
            </Text>
            {active ? (
              <PrimaryButton testID="home-resume-workout-button" small icon="play" title="Resume" onPress={() => router.push(`/workout/active?id=${active.id}`)} style={s.heroBtn} />
            ) : done.length ? (
              <PrimaryButton testID="home-view-workout-button" small icon="check" title="View" onPress={() => router.push(`/workout/session/${done[0].id}`)} style={s.heroBtn} />
            ) : isToday ? (
              <PrimaryButton testID="home-start-workout-button" small icon="play" title="Start" onPress={start} style={s.heroBtn} />
            ) : null}
          </View>
          <ThreeDIllustration name="shaker_gym" size={130} />
        </Card>
      </FadeInView>

      <FadeInView delay={60}>
        <Card testID="home-nutrition-card" onPress={() => router.push("/(tabs)/food")}>
          <Text style={[s.h2, { marginBottom: space.md }]}>Nutrition {isToday ? "Today" : ""}</Text>
          <NutritionProgress testID="home-nutrition" kcal={totals.total.kcal} target={targets.calories} protein={totals.total.protein} carbs={totals.total.carbs} fat={totals.total.fat} targets={targets} />
        </Card>
      </FadeInView>

      <FadeInView delay={120}>
        <View style={s.rowBetween}>
          <Text style={s.h2}>Meals</Text>
          <Pressable testID="home-log-meal-button" onPress={() => router.push(`/food/search?day=${day}`)} style={s.pill}>
            <Icon name="plus" size={14} color={colors.onBrandTertiary} /><Text style={s.pillText}>Log Meal</Text>
          </Pressable>
        </View>
        <View style={s.meals}>
          {MEALS.map((m) => (
            <Pressable key={m} testID={`home-meal-${m}`} style={s.meal} onPress={() => router.push(`/food/meal?meal=${m}&day=${day}`)}>
              <View style={s.mealIcon}><Icon name={MEAL_ICON[m]} color={colors.brand} /></View>
              <Text style={s.mealName}>{MEAL_LABEL[m]}</Text>
              <Text style={s.cap}>{Math.round(totals.byMeal[m].kcal)} kcal</Text>
            </Pressable>
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={180} style={s.grid}>
        <Tile testID="home-steps-tile" icon="shoe-print" color={colors.steps} title="Steps" value={steps != null ? steps.toLocaleString() : "Not logged"} goal={`/ ${targets.steps.toLocaleString()}`} pct={steps != null ? steps / targets.steps : 0} onPress={() => router.push(`/activity?day=${day}`)} />
        <Tile testID="home-water-tile" icon="water" color={colors.water} title="Water" value={`${Math.round(water).toLocaleString()}`} goal={`/ ${targets.water_ml.toLocaleString()} ml`} pct={water / targets.water_ml} onPress={() => router.push(`/water?day=${day}`)} />
        <Tile testID="home-sleep-tile" icon="sleep" color={colors.sleep} title="Sleep" value={sleep ? fmtMinutes(sleep.minutes) : "Not logged"} goal={sleep ? `/ ${fmtMinutes(targets.sleep_min)}` : ""} pct={sleep ? sleep.minutes / targets.sleep_min : 0} onPress={() => router.push(`/activity?day=${day}&tab=sleep`)} />
        <Tile testID="home-weight-tile" icon="scale-bathroom" color={colors.brand} title="Weight" value={weight ? fmtW(weight.weight_kg, units) : "Not logged"} goal={weight && prevW ? `${weight.weight_kg - prevW.weight_kg <= 0 ? "↓" : "↑"} ${fmtW(Math.abs(weight.weight_kg - prevW.weight_kg), units)}` : weight ? fmtDay(weight.day) : ""} onPress={() => router.push("/progress/measure")} />
      </FadeInView>
    </ScreenContainer>
  );

  function Tile({ icon, color, title, value, goal, pct, onPress, testID }: { icon: IconName; color: string; title: string; value: string; goal: string; pct?: number; onPress: () => void; testID: string; illus?: IllusName }) {
    return (
      <Card style={s.tile} onPress={onPress} testID={testID}>
        <View style={s.row}><Icon name={icon} size={18} color={color} /><Text style={s.label}>{title}</Text></View>
        <Text style={s.tileVal} numberOfLines={1} testID={`${testID}-value`}>{value} <Text style={s.cap}>{goal}</Text></Text>
        {pct !== undefined && <ProgressBar value={pct} max={1} color={color} />}
      </Card>
    );
  }
}
function shift(k: string, n: number) {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
void WEEKDAYS;

const useStyles = makeStyles((c) => ({
  hero: { flexDirection: "row", alignItems: "center", paddingRight: space.sm, overflow: "hidden" },
  heroTitle: { fontSize: 19, fontWeight: "800", color: c.onSurface },
  heroBtn: { alignSelf: "flex-start", marginTop: 4 },
  label: { fontSize: 13.5, fontWeight: "700", color: c.onSurface },
  cap: { fontSize: 12, color: c.muted, fontWeight: "500" },
  h2: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  link: { color: c.brand, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandTertiary, paddingHorizontal: 12, height: 32, borderRadius: radius.pill },
  pillText: { fontSize: 13, fontWeight: "700", color: c.onBrandTertiary },
  meals: { flexDirection: "row", gap: space.sm },
  meal: { flex: 1, alignItems: "center", gap: 4, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, paddingVertical: space.md },
  mealIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  mealName: { fontSize: 12.5, fontWeight: "700", color: c.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  tile: { width: "47.8%", flexGrow: 1, gap: 8, padding: space.md },
  tileVal: { fontSize: 18, fontWeight: "800", color: c.onSurface },
}));
