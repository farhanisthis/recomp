// Profile, targets and app preferences.
import { db } from "../client";
import { bump } from "../../lib/useQ";
import type { Activity, Goal, Sex, Targets, Units } from "../../lib/calc";

export type Profile = { name: string; sex: Sex; age: number; height_cm: number; weight_kg: number; goal: Goal; activity: Activity; training_days: number };
export type FullTargets = Targets & { water_ml: number; steps: number; sleep_min: number; is_custom: number };

const now = () => new Date().toISOString();

export async function getMeta(key: string): Promise<string | null> {
  const r = await db.get<{ value: string }>("SELECT value FROM meta WHERE key=?", [key]);
  return r ? r.value : null;
}
export async function setMeta(key: string, value: string | null, notify = true) {
  if (value === null) await db.run("DELETE FROM meta WHERE key=?", [key]);
  else await db.run("INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)", [key, value]);
  if (notify) bump();
}

export async function getProfile(): Promise<Profile | null> {
  return db.get<Profile>("SELECT * FROM user_profile WHERE id=1");
}
export async function saveProfile(p: Profile) {
  const t = now();
  await db.run(
    `INSERT INTO user_profile(id,name,sex,age,height_cm,weight_kg,goal,activity,training_days,created_at,updated_at)
     VALUES(1,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, sex=excluded.sex, age=excluded.age,
     height_cm=excluded.height_cm, weight_kg=excluded.weight_kg, goal=excluded.goal, activity=excluded.activity,
     training_days=excluded.training_days, updated_at=excluded.updated_at`,
    [p.name, p.sex, p.age, p.height_cm, p.weight_kg, p.goal, p.activity, p.training_days, t, t],
  );
  bump();
}

export async function getTargets(): Promise<FullTargets> {
  const r = await db.get<FullTargets>("SELECT * FROM nutrition_targets WHERE id=1");
  return r ?? { calories: 2000, protein: 120, carbs: 230, fat: 60, water_ml: 3000, steps: 8000, sleep_min: 480, is_custom: 0 };
}
export async function saveTargets(t: FullTargets) {
  await db.run(
    `INSERT INTO nutrition_targets(id,calories,protein,carbs,fat,water_ml,steps,sleep_min,is_custom,updated_at) VALUES(1,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET calories=excluded.calories, protein=excluded.protein, carbs=excluded.carbs, fat=excluded.fat,
     water_ml=excluded.water_ml, steps=excluded.steps, sleep_min=excluded.sleep_min, is_custom=excluded.is_custom, updated_at=excluded.updated_at`,
    [t.calories, t.protein, t.carbs, t.fat, t.water_ml, t.steps, t.sleep_min, t.is_custom, now()],
  );
  bump();
}

export async function getWeightGoal() {
  return db.get<{ id: number; kind: string; start_kg: number; target_kg: number | null; created_at: string }>(
    "SELECT * FROM weight_goals WHERE active=1 ORDER BY id DESC LIMIT 1",
  );
}
export async function setWeightGoal(kind: string, start_kg: number, target_kg: number | null) {
  await db.tx(async () => {
    await db.run("UPDATE weight_goals SET active=0");
    await db.run("INSERT INTO weight_goals(kind,start_kg,target_kg,active,created_at) VALUES(?,?,?,1,?)", [kind, start_kg, target_kg, now()]);
  });
  bump();
}

export async function getUnits(): Promise<Units> {
  const w = (await getMeta("unit_weight")) as Units["weight"] | null;
  const l = (await getMeta("unit_length")) as Units["length"] | null;
  return { weight: w ?? "kg", length: l ?? "cm" };
}
