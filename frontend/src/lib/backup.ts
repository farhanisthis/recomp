// Versioned JSON backup with SHA-256 integrity check, atomic restore, and CSV export.
import * as Crypto from "expo-crypto";
import { File, Directory, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { db } from "../db/client";
import { DATA_TABLES, SCHEMA_VERSION } from "../db/schema";
import { bump } from "./useQ";

const FORMAT = "recomp-backup";
const EXCLUDE_META = new Set(["rest_end_at", "rest_remaining", "rest_total"]);

export async function buildBackup() {
  const tables: Record<string, any[]> = {};
  for (const t of DATA_TABLES) tables[t] = await db.all(`SELECT * FROM ${t}`);
  tables.meta = tables.meta.filter((m) => !EXCLUDE_META.has(m.key));
  const photos: Record<string, string> = {};
  if (Platform.OS !== "web") {
    for (const p of tables.progress_photos) {
      try { photos[p.id] = await new File(p.uri).base64(); } catch { /* missing file: skipped */ }
    }
  }
  const payload = JSON.stringify({ tables, photos });
  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  return JSON.stringify({ format: FORMAT, version: 1, schema: SCHEMA_VERSION, created_at: new Date().toISOString(), checksum, payload });
}

export async function writeExportFile(name: string, content: string) {
  const dir = new Directory(Paths.cache, "exports");
  if (!dir.exists) dir.create({ intermediates: true });
  const f = new File(dir, name);
  if (f.exists) f.delete();
  f.create();
  await f.write(content);
  return f.uri;
}

export async function restoreBackup(text: string) {
  let outer: any;
  try { outer = JSON.parse(text); } catch { throw new Error("File is not valid JSON"); }
  if (outer?.format !== FORMAT) throw new Error("Not a RECOMP backup file");
  if (outer.schema > SCHEMA_VERSION) throw new Error("Backup was made by a newer app version");
  const sum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, outer.payload);
  if (sum !== outer.checksum) throw new Error("Integrity check failed — file is corrupted");
  const { tables, photos } = JSON.parse(outer.payload);
  for (const t of DATA_TABLES) if (!Array.isArray(tables[t])) throw new Error(`Backup missing table ${t}`);

  // Write photo files first (to new paths); DB swap happens in a single transaction.
  const photoUris: Record<string, string> = {};
  if (Platform.OS !== "web") {
    const dir = new Directory(Paths.document, "photos");
    if (!dir.exists) dir.create({ intermediates: true });
    for (const [id, b64] of Object.entries(photos as Record<string, string>)) {
      const f = new File(dir, `r_${Date.now()}_${id}.jpg`);
      f.create();
      await f.write(b64, { encoding: "base64" });
      photoUris[id] = f.uri;
    }
  }
  await db.exec("PRAGMA foreign_keys = OFF;");
  try {
    await db.tx(async () => {
      for (const t of [...DATA_TABLES].reverse()) await db.run(`DELETE FROM ${t}`);
      for (const t of DATA_TABLES) {
        const valid = new Set((await db.all<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name));
        for (const row of tables[t]) {
          if (Object.keys(row).some((c) => !valid.has(c))) throw new Error(`Backup has unknown column in ${t}`);
          if (t === "progress_photos" && photoUris[row.id]) row.uri = photoUris[row.id];
          if (t === "meta" && row.key === "schema_version") continue;
          const cols = Object.keys(row);
          await db.run(`INSERT INTO ${t}(${cols.join(",")}) VALUES(${cols.map(() => "?").join(",")})`, cols.map((c) => row[c]));
        }
      }
      await db.run("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version',?)", [String(SCHEMA_VERSION)]);
    });
  } finally {
    await db.exec("PRAGMA foreign_keys = ON;");
  }
  bump();
}

function csv(rows: any[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
export async function exportCsv(kind: "food" | "workouts" | "measurements") {
  const q = {
    food: "SELECT day, meal, name, grams, round(kcal,1) AS kcal, round(protein,1) AS protein, round(carbs,1) AS carbs, round(fat,1) AS fat, source FROM food_entries ORDER BY day, logged_at",
    workouts: `SELECT s.day, s.name AS workout, se.name AS exercise, ss.kind, ss.weight AS weight_kg, ss.reps, ss.duration_sec, ss.distance_m
      FROM workout_session_sets ss JOIN workout_session_exercises se ON se.id=ss.session_exercise_id JOIN workout_sessions s ON s.id=se.session_id
      WHERE s.status='completed' AND ss.done=1 ORDER BY s.started_at, se.position, ss.position`,
    measurements: "SELECT day, weight_kg, body_fat, waist, chest, hips, neck, arms, thighs, calves, notes FROM body_measurements ORDER BY day",
  }[kind];
  return csv(await db.all(q));
}

export async function clearHistory(kind: "food" | "workouts" | "measurements" | "activity") {
  const sql = {
    food: ["DELETE FROM food_entries", "DELETE FROM water_entries"],
    workouts: ["DELETE FROM workout_sessions"],
    measurements: ["DELETE FROM body_measurements", "DELETE FROM progress_photos"],
    activity: ["DELETE FROM daily_step_entries", "DELETE FROM sleep_entries", "DELETE FROM daily_checkins"],
  }[kind];
  await db.tx(async () => { for (const s of sql) await db.run(s); });
  bump();
}

export async function resetApp() {
  await db.exec("PRAGMA foreign_keys = OFF;");
  await db.tx(async () => {
    for (const t of ["user_profile", "nutrition_targets", "weight_goals", "food_entries", "recipes", "recipe_ingredients", "saved_meals", "saved_meal_items", "water_entries", "daily_step_entries", "sleep_entries", "daily_checkins", "workout_plans", "workout_plan_exercises", "workout_sessions", "workout_session_exercises", "workout_session_sets", "body_measurements", "progress_photos", "achievements"])
      await db.run(`DELETE FROM ${t}`);
    await db.run("DELETE FROM food_items WHERE is_custom=1");
    await db.run("DELETE FROM exercises WHERE is_custom=1");
    await db.run("DELETE FROM meta WHERE key<>'schema_version'");
  });
  await db.exec("PRAGMA foreign_keys = ON;");
  if (Platform.OS !== "web") { try { const d = new Directory(Paths.document, "photos"); if (d.exists) d.delete(); } catch {} }
  bump();
}
