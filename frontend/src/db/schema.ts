  source TEXT, is_custom INTEGER DEFAULT 0, barcode TEXT, created_at TEXT);
// Versioned migrations. Never drop user data; append new migrations only.
import { db } from "./client";
import { seedExercises, seedFoods } from "./seed";

export const SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, string> = {
  1: `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT, sex TEXT, age INTEGER, height_cm REAL, weight_kg REAL,
  goal TEXT, activity TEXT, training_days INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS nutrition_targets (
  id INTEGER PRIMARY KEY CHECK (id = 1), calories INTEGER, protein INTEGER, carbs INTEGER, fat INTEGER,
  water_ml INTEGER, steps INTEGER, sleep_min INTEGER, is_custom INTEGER DEFAULT 0, updated_at TEXT);
CREATE TABLE IF NOT EXISTS weight_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, start_kg REAL, target_kg REAL, active INTEGER DEFAULT 1, created_at TEXT);
CREATE TABLE IF NOT EXISTS food_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, brand TEXT, basis TEXT DEFAULT 'g',
  kcal REAL NOT NULL, protein REAL NOT NULL, carbs REAL NOT NULL, fat REAL NOT NULL, fiber REAL,
  source TEXT, is_custom INTEGER DEFAULT 0, barcode TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_food_name ON food_items(name);
CREATE TABLE IF NOT EXISTS food_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT, food_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE, alias TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_alias ON food_aliases(alias);
CREATE TABLE IF NOT EXISTS food_servings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, food_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL, unit TEXT NOT NULL, grams REAL NOT NULL);
CREATE TABLE IF NOT EXISTS food_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, food_id INTEGER REFERENCES food_items(id) ON DELETE SET NULL,
  recipe_id INTEGER, name TEXT NOT NULL, meal TEXT NOT NULL, day TEXT NOT NULL, logged_at TEXT NOT NULL,
  quantity REAL, unit TEXT, grams REAL, kcal REAL NOT NULL, protein REAL NOT NULL, carbs REAL NOT NULL, fat REAL NOT NULL, source TEXT);
CREATE INDEX IF NOT EXISTS idx_entries_day ON food_entries(day);
CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, servings REAL NOT NULL, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_id INTEGER REFERENCES food_items(id) ON DELETE SET NULL, name TEXT NOT NULL, grams REAL NOT NULL,
  kcal REAL NOT NULL, protein REAL NOT NULL, carbs REAL NOT NULL, fat REAL NOT NULL);
CREATE TABLE IF NOT EXISTS saved_meals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT);
CREATE TABLE IF NOT EXISTS saved_meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, saved_meal_id INTEGER NOT NULL REFERENCES saved_meals(id) ON DELETE CASCADE,
  food_id INTEGER, name TEXT NOT NULL, quantity REAL, unit TEXT, grams REAL, kcal REAL, protein REAL, carbs REAL, fat REAL);
CREATE TABLE IF NOT EXISTS water_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, ml REAL NOT NULL, logged_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_water_day ON water_entries(day);
CREATE TABLE IF NOT EXISTS daily_step_entries (day TEXT PRIMARY KEY, steps INTEGER NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS sleep_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, bed_at TEXT NOT NULL, wake_at TEXT NOT NULL,
  minutes INTEGER NOT NULL, quality INTEGER, notes TEXT);
CREATE INDEX IF NOT EXISTS idx_sleep_day ON sleep_entries(day);
CREATE TABLE IF NOT EXISTS daily_checkins (day TEXT PRIMARY KEY, energy INTEGER, mood INTEGER, soreness INTEGER, notes TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, muscle TEXT NOT NULL, secondary TEXT, equipment TEXT,
  tracking TEXT NOT NULL DEFAULT 'weight_reps', instructions TEXT, is_custom INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS workout_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, notes TEXT, schedule_days TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS workout_plan_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, position INTEGER NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3, target_reps TEXT, target_weight REAL, rest_sec INTEGER DEFAULT 90, notes TEXT);
CREATE TABLE IF NOT EXISTS workout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER, name TEXT NOT NULL, status TEXT NOT NULL,
  day TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, paused_at TEXT, paused_ms INTEGER DEFAULT 0,
  duration_sec INTEGER, volume REAL, notes TEXT, pr_count INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON workout_sessions(status, day);
CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER, name TEXT NOT NULL, tracking TEXT NOT NULL, position INTEGER NOT NULL,
  rest_sec INTEGER DEFAULT 90, notes TEXT, skipped INTEGER DEFAULT 0, target_reps TEXT);
CREATE TABLE IF NOT EXISTS workout_session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_exercise_id INTEGER NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'working', weight REAL, reps INTEGER,
  duration_sec INTEGER, distance_m REAL, done INTEGER DEFAULT 0, completed_at TEXT);
CREATE TABLE IF NOT EXISTS body_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, measured_at TEXT NOT NULL, weight_kg REAL, body_fat REAL,
  waist REAL, chest REAL, hips REAL, neck REAL, arms REAL, thighs REAL, calves REAL, notes TEXT);
CREATE INDEX IF NOT EXISTS idx_meas_day ON body_measurements(day);
CREATE TABLE IF NOT EXISTS progress_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, pose TEXT NOT NULL, uri TEXT NOT NULL, notes TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS achievements (key TEXT PRIMARY KEY, unlocked_at TEXT NOT NULL);
`,
};

export async function migrate() {
  await db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);");
  const row = await db.get<{ value: string }>("SELECT value FROM meta WHERE key='schema_version'");
  let v = row ? Number(row.value) : 0;
  while (v < SCHEMA_VERSION) {
    const next = v + 1;
    await db.tx(async () => {
      await db.exec(MIGRATIONS[next]);
      if (next === 1) {
        await seedFoods();
        await seedExercises();
      }
      await db.run("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version',?)", [String(next)]);
    });
    v = next;
  }
}

export const DATA_TABLES = [
  "meta", "user_profile", "nutrition_targets", "weight_goals", "food_items", "food_aliases", "food_servings",
  "food_entries", "recipes", "recipe_ingredients", "saved_meals", "saved_meal_items", "water_entries",
  "daily_step_entries", "sleep_entries", "daily_checkins", "exercises", "workout_plans", "workout_plan_exercises",
  "workout_sessions", "workout_session_exercises", "workout_session_sets", "body_measurements", "progress_photos", "achievements",
];
