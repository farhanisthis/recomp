// Pure calculation helpers (nutrition, workouts, dates, units). No I/O here.

export type Goal = "fat_loss" | "muscle_gain" | "recomp" | "maintain";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type Sex = "male" | "female";
export type Meal = "breakfast" | "lunch" | "dinner" | "snacks";
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snacks"];
export const MEAL_LABEL: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

export const GOALS: { key: Goal; title: string; sub: string }[] = [
  { key: "fat_loss", title: "Lose Fat", sub: "Burn fat and get leaner" },
  { key: "muscle_gain", title: "Gain Muscle", sub: "Build size and strength" },
  { key: "recomp", title: "Recomposition", sub: "Lose fat and gain muscle" },
  { key: "maintain", title: "Maintain", sub: "Keep your current shape" },
];
export const ACTIVITIES: { key: Activity; title: string; sub: string; factor: number }[] = [
  { key: "sedentary", title: "Sedentary", sub: "Mostly sitting (e.g., desk job)", factor: 1.2 },
  { key: "light", title: "Lightly Active", sub: "Light exercise 1–3 days/week", factor: 1.375 },
  { key: "moderate", title: "Moderately Active", sub: "Exercise 3–5 days/week", factor: 1.55 },
  { key: "very", title: "Very Active", sub: "Hard exercise 6–7 days/week", factor: 1.725 },
];

export type Targets = { calories: number; protein: number; carbs: number; fat: number };

/** Mifflin–St Jeor BMR (kcal/day). */
export function bmr(sex: Sex, kg: number, cm: number, age: number) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
}

/** Estimated targets. Clearly an estimate; users may override. */
export function suggestTargets(p: { sex: Sex; weight_kg: number; height_cm: number; age: number; activity: Activity; goal: Goal }): Targets {
  const factor = ACTIVITIES.find((a) => a.key === p.activity)?.factor ?? 1.375;
  const tdee = bmr(p.sex, p.weight_kg, p.height_cm, p.age) * factor;
  const adj = { fat_loss: 0.8, muscle_gain: 1.1, recomp: 0.9, maintain: 1 }[p.goal];
  const calories = Math.round((tdee * adj) / 10) * 10;
  const proteinPerKg = { fat_loss: 2.0, muscle_gain: 1.8, recomp: 2.0, maintain: 1.6 }[p.goal];
  const protein = Math.round(p.weight_kg * proteinPerKg);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
/** consumed = grams / 100 * per100 */
export function scaleMacros(per100: Macros, grams: number): Macros {
  const k = grams / 100;
  return { kcal: per100.kcal * k, protein: per100.protein * k, carbs: per100.carbs * k, fat: per100.fat * k };
}
export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({ kcal: a.kcal + (m.kcal || 0), protein: a.protein + (m.protein || 0), carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
export function divMacros(m: Macros, n: number): Macros {
  return { kcal: m.kcal / n, protein: m.protein / n, carbs: m.carbs / n, fat: m.fat / n };
}

// ---------- Workouts ----------
/** Epley estimated 1RM (an estimate, not a measured lift). */
export function e1rm(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
export function setVolume(s: { weight?: number | null; reps?: number | null; done?: number; kind?: string }) {
  if (!s.done || s.kind === "warmup") return 0;
  return (s.weight || 0) * (s.reps || 0);
}

// ---------- Dates (local calendar day) ----------
const pad = (n: number) => String(n).padStart(2, "0");
export function dayKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseDay(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k: string, n: number) {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
export function isValidDay(k: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(k) && dayKey(parseDay(k)) === k;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS = WD;
export function fmtDay(k: string, withWeekday = true) {
  const d = parseDay(k);
  const today = dayKey();
  if (k === today) return "Today";
  if (k === addDays(today, -1)) return "Yesterday";
  return `${withWeekday ? WD[d.getDay()] + ", " : ""}${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export function fmtDayLong(k: string) {
  const d = parseDay(k);
  return `${WD[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
export function fmtShort(k: string) {
  const d = parseDay(k);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export function fmtDuration(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
/** Sleep minutes between HH:MM bed and wake, crossing midnight if wake <= bed. */
export function sleepMinutes(bed: string, wake: string) {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let diff = wh * 60 + wm - (bh * 60 + bm);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}
export function isHHMM(s: string) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s);
}

// ---------- Units (stored metric) ----------
export type Units = { weight: "kg" | "lb"; length: "cm" | "in" };
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;
export function wOut(kg: number | null | undefined, u: Units) {
  if (kg == null) return null;
  return u.weight === "lb" ? kg / KG_PER_LB : kg;
}
export function wIn(v: number, u: Units) {
  return u.weight === "lb" ? v * KG_PER_LB : v;
}
export function lOut(cm: number | null | undefined, u: Units) {
  if (cm == null) return null;
  return u.length === "in" ? cm / CM_PER_IN : cm;
}
export function lIn(v: number, u: Units) {
  return u.length === "in" ? v * CM_PER_IN : v;
}
export function fmtW(kg: number | null | undefined, u: Units, d = 1) {
  const v = wOut(kg, u);
  return v == null ? "—" : `${round(v, d)} ${u.weight}`;
}
export function round(v: number, d = 0) {
  const p = Math.pow(10, d);
  return Math.round(v * p) / p;
}
/** Parse a user-typed number accepting comma decimals. Returns null if invalid/empty. */
export function num(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).trim().replace(",", ".");
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export function defaultMeal(): Meal {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 18 ? "snacks" : "dinner";
}
