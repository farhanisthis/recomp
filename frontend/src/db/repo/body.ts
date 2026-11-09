// Body measurements, photos, steps, sleep, check-ins, reports, achievements.
import { db } from "../client";
import { bump } from "../../lib/useQ";
import { addDays, dayKey } from "../../lib/calc";

export type Measurement = { id: number; day: string; weight_kg: number | null; body_fat: number | null; waist: number | null; chest: number | null; hips: number | null; neck: number | null; arms: number | null; thighs: number | null; calves: number | null; notes: string | null };
export const MEASURE_FIELDS = ["waist", "chest", "hips", "neck", "arms", "thighs", "calves"] as const;

const now = () => new Date().toISOString();

export const listMeasurements = (from = "0000-00-00") =>
  db.all<Measurement>("SELECT * FROM body_measurements WHERE day>=? ORDER BY day DESC, id DESC", [from]);
export const getMeasurement = (id: number) => db.get<Measurement>("SELECT * FROM body_measurements WHERE id=?", [id]);
export const latestWeight = () =>
  db.get<{ weight_kg: number; day: string }>("SELECT weight_kg, day FROM body_measurements WHERE weight_kg IS NOT NULL ORDER BY day DESC, id DESC LIMIT 1");
export const latestBodyFat = () =>
  db.get<{ body_fat: number; day: string }>("SELECT body_fat, day FROM body_measurements WHERE body_fat IS NOT NULL ORDER BY day DESC, id DESC LIMIT 1");

export async function saveMeasurement(id: number | null, m: Omit<Measurement, "id">) {
  const cols = ["day", "weight_kg", "body_fat", ...MEASURE_FIELDS, "notes"] as const;
  const vals = cols.map((c) => (m as any)[c] ?? null);
  if (id) await db.run(`UPDATE body_measurements SET ${cols.map((c) => `${c}=?`).join(",")} WHERE id=?`, [...vals, id]);
  else await db.run(`INSERT INTO body_measurements(${cols.join(",")},measured_at) VALUES(${cols.map(() => "?").join(",")},?)`, [...vals, now()]);
  bump();
}
export async function deleteMeasurement(id: number) {
  await db.run("DELETE FROM body_measurements WHERE id=?", [id]);
  bump();
}

// ---------- Photos ----------
export type Photo = { id: number; day: string; pose: string; uri: string; notes: string | null };
export const listPhotos = (pose?: string) =>
  pose ? db.all<Photo>("SELECT * FROM progress_photos WHERE pose=? ORDER BY day DESC, id DESC", [pose]) : db.all<Photo>("SELECT * FROM progress_photos ORDER BY day DESC");
export async function addPhoto(p: Omit<Photo, "id">) {
  await db.run("INSERT INTO progress_photos(day,pose,uri,notes,created_at) VALUES(?,?,?,?,?)", [p.day, p.pose, p.uri, p.notes, now()]);
  bump();
}
export async function deletePhoto(id: number) {
  await db.run("DELETE FROM progress_photos WHERE id=?", [id]);
  bump();
}

// ---------- Steps / sleep / check-in ----------
export const stepsFor = async (day: string) => (await db.get<{ steps: number }>("SELECT steps FROM daily_step_entries WHERE day=?", [day]))?.steps ?? null;
export async function setSteps(day: string, steps: number | null) {
  if (steps == null) await db.run("DELETE FROM daily_step_entries WHERE day=?", [day]);
  else await db.run("INSERT OR REPLACE INTO daily_step_entries(day,steps,updated_at) VALUES(?,?,?)", [day, steps, now()]);
  bump();
}
export const stepsHistory = () => db.all<{ day: string; steps: number }>("SELECT day, steps FROM daily_step_entries ORDER BY day DESC LIMIT 60");

export type Sleep = { id: number; day: string; bed_at: string; wake_at: string; minutes: number; quality: number | null; notes: string | null };
export const sleepFor = (day: string) => db.get<Sleep>("SELECT * FROM sleep_entries WHERE day=? ORDER BY id DESC LIMIT 1", [day]);
export const sleepHistory = () => db.all<Sleep>("SELECT * FROM sleep_entries ORDER BY day DESC, id DESC LIMIT 60");
export async function saveSleep(id: number | null, s: Omit<Sleep, "id">) {
  if (id) await db.run("UPDATE sleep_entries SET day=?, bed_at=?, wake_at=?, minutes=?, quality=?, notes=? WHERE id=?", [s.day, s.bed_at, s.wake_at, s.minutes, s.quality, s.notes, id]);
  else await db.run("INSERT INTO sleep_entries(day,bed_at,wake_at,minutes,quality,notes) VALUES(?,?,?,?,?,?)", [s.day, s.bed_at, s.wake_at, s.minutes, s.quality, s.notes]);
  bump();
}
export async function deleteSleep(id: number) {
  await db.run("DELETE FROM sleep_entries WHERE id=?", [id]);
  bump();
}
export type Checkin = { day: string; energy: number | null; mood: number | null; soreness: number | null; notes: string | null };
export const checkinFor = (day: string) => db.get<Checkin>("SELECT * FROM daily_checkins WHERE day=?", [day]);
export async function saveCheckin(c: Checkin) {
  await db.run("INSERT OR REPLACE INTO daily_checkins(day,energy,mood,soreness,notes,updated_at) VALUES(?,?,?,?,?,?)", [c.day, c.energy, c.mood, c.soreness, c.notes, now()]);
  bump();
}

// ---------- Reports (actual data only) ----------
export async function periodReport(days: number, end = dayKey()) {
  const from = addDays(end, -(days - 1));
  const food = await db.all<{ day: string; kcal: number; protein: number }>(
    "SELECT day, SUM(kcal) AS kcal, SUM(protein) AS protein FROM food_entries WHERE day BETWEEN ? AND ? GROUP BY day", [from, end]);
  const water = await db.all<{ day: string; ml: number }>("SELECT day, SUM(ml) AS ml FROM water_entries WHERE day BETWEEN ? AND ? GROUP BY day", [from, end]);
  const w = await db.get<{ n: number; v: number; d: number }>(
    "SELECT COUNT(*) AS n, IFNULL(SUM(volume),0) AS v, IFNULL(SUM(duration_sec),0) AS d FROM workout_sessions WHERE status='completed' AND day BETWEEN ? AND ?", [from, end]);
  const weights = await db.all<{ day: string; weight_kg: number }>(
    "SELECT day, weight_kg FROM body_measurements WHERE weight_kg IS NOT NULL AND day BETWEEN ? AND ? ORDER BY day", [from, end]);
  const prs = await db.get<{ n: number }>("SELECT IFNULL(SUM(pr_count),0) AS n FROM workout_sessions WHERE status='completed' AND day BETWEEN ? AND ?", [from, end]);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return {
    from, end, days,
    loggedDays: food.length,
    avgKcal: avg(food.map((f) => f.kcal)),
    avgProtein: avg(food.map((f) => f.protein)),
    waterDays: water.length,
    avgWater: avg(water.map((x) => x.ml)),
    workouts: w?.n ?? 0,
    volume: w?.v ?? 0,
    trainingSec: w?.d ?? 0,
    prs: prs?.n ?? 0,
    weightChange: weights.length >= 2 ? weights[weights.length - 1].weight_kg - weights[0].weight_kg : null,
    weighIns: weights.length,
  };
}

// ---------- Achievements (deterministic) ----------
export const ACHIEVEMENTS: { key: string; title: string; desc: string; cat: string; sql: string }[] = [
  { key: "first_meal", title: "First Meal", desc: "Log your first food entry", cat: "Nutrition", sql: "SELECT COUNT(*)>=1 AS ok FROM food_entries" },
  { key: "meals_50", title: "50 Entries", desc: "Log 50 food entries", cat: "Nutrition", sql: "SELECT COUNT(*)>=50 AS ok FROM food_entries" },
  { key: "log_7_days", title: "7 Logged Days", desc: "Log food on 7 different days", cat: "Nutrition", sql: "SELECT COUNT(DISTINCT day)>=7 AS ok FROM food_entries" },
  { key: "first_recipe", title: "Home Chef", desc: "Create your first recipe", cat: "Nutrition", sql: "SELECT COUNT(*)>=1 AS ok FROM recipes" },
  { key: "water_goal", title: "Hydrated", desc: "Reach your water goal on a day", cat: "Nutrition", sql: "SELECT EXISTS(SELECT 1 FROM water_entries GROUP BY day HAVING SUM(ml) >= (SELECT water_ml FROM nutrition_targets WHERE id=1)) AS ok" },
  { key: "first_workout", title: "First Workout", desc: "Complete your first workout", cat: "Workout", sql: "SELECT COUNT(*)>=1 AS ok FROM workout_sessions WHERE status='completed'" },
  { key: "workouts_10", title: "10 Workouts", desc: "Complete 10 workouts", cat: "Workout", sql: "SELECT COUNT(*)>=10 AS ok FROM workout_sessions WHERE status='completed'" },
  { key: "first_pr", title: "First PR", desc: "Beat a previous best lift", cat: "Workout", sql: "SELECT IFNULL(SUM(pr_count),0)>=1 AS ok FROM workout_sessions WHERE status='completed'" },
  { key: "three_week", title: "3 in a Week", desc: "Complete 3 workouts in one calendar week", cat: "Workout", sql: "SELECT EXISTS(SELECT 1 FROM workout_sessions WHERE status='completed' GROUP BY strftime('%Y-%W', day) HAVING COUNT(*)>=3) AS ok" },
  { key: "first_weigh", title: "First Weigh-in", desc: "Log a body measurement", cat: "Progress", sql: "SELECT COUNT(*)>=1 AS ok FROM body_measurements" },
  { key: "weeks_4", title: "4 Weeks Tracked", desc: "Log measurements in 4 different weeks", cat: "Progress", sql: "SELECT COUNT(DISTINCT strftime('%Y-%W', day))>=4 AS ok FROM body_measurements" },
  { key: "first_photo", title: "Snapshot", desc: "Add a progress photo", cat: "Progress", sql: "SELECT COUNT(*)>=1 AS ok FROM progress_photos" },
];
export async function evaluateAchievements() {
  const unlocked = await db.all<{ key: string; unlocked_at: string }>("SELECT * FROM achievements");
  const map = new Map(unlocked.map((u) => [u.key, u.unlocked_at]));
  for (const a of ACHIEVEMENTS) {
    if (map.has(a.key)) continue;
    const r = await db.get<{ ok: number }>(a.sql);
    if (r?.ok) {
      const t = now();
      await db.run("INSERT OR IGNORE INTO achievements(key,unlocked_at) VALUES(?,?)", [a.key, t]);
      map.set(a.key, t);
    }
  }
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked_at: map.get(a.key) ?? null }));
}
