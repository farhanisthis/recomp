// Exercises, plans, sessions and records.
import { db } from "../client";
import { bump } from "../../lib/useQ";
import { dayKey, e1rm, setVolume } from "../../lib/calc";

export type Tracking = "weight_reps" | "reps" | "time" | "distance";
export type Exercise = { id: number; name: string; muscle: string; equipment: string | null; tracking: Tracking; instructions: string | null; is_custom: number };
export type Plan = { id: number; name: string; description: string | null; notes: string | null; schedule_days: string | null };
export type PlanExercise = { id?: number; exercise_id: number; name?: string; muscle?: string; sets: number; target_reps: string; target_weight: number | null; rest_sec: number; notes: string | null };
export type Session = { id: number; plan_id: number | null; name: string; status: "active" | "completed"; day: string; started_at: string; ended_at: string | null; paused_at: string | null; paused_ms: number; duration_sec: number | null; volume: number | null; notes: string | null; pr_count: number };
export type SSet = { id: number; session_exercise_id: number; position: number; kind: "warmup" | "working"; weight: number | null; reps: number | null; duration_sec: number | null; distance_m: number | null; done: number };
export type SExercise = { id: number; session_id: number; exercise_id: number | null; name: string; tracking: Tracking; position: number; rest_sec: number; notes: string | null; skipped: number; target_reps: string | null; sets: SSet[] };

const now = () => new Date().toISOString();

export const listExercises = (q = "", muscle = "All") =>
  db.all<Exercise>(
    "SELECT * FROM exercises WHERE lower(name) LIKE ? AND (?='All' OR muscle=?) ORDER BY muscle, name",
    [`%${q.toLowerCase()}%`, muscle, muscle],
  );
export const getExercise = (id: number) => db.get<Exercise>("SELECT * FROM exercises WHERE id=?", [id]);
export async function createExercise(e: Omit<Exercise, "id" | "is_custom">) {
  const r = await db.run("INSERT INTO exercises(name,muscle,equipment,tracking,instructions,is_custom) VALUES(?,?,?,?,?,1)", [
    e.name, e.muscle, e.equipment, e.tracking, e.instructions,
  ]);
  bump();
  return r.id;
}
export async function deleteExercise(id: number) {
  await db.run("DELETE FROM exercises WHERE id=? AND is_custom=1", [id]);
  bump();
}

// ---------- Plans ----------
export async function listPlans() {
  return db.all<Plan & { count: number; total_sets: number; muscles: string | null }>(
    `SELECT p.*, COUNT(pe.id) AS count, IFNULL(SUM(pe.sets),0) AS total_sets, GROUP_CONCAT(DISTINCT e.muscle) AS muscles
     FROM workout_plans p LEFT JOIN workout_plan_exercises pe ON pe.plan_id=p.id LEFT JOIN exercises e ON e.id=pe.exercise_id
     GROUP BY p.id ORDER BY p.id`,
  );
}
export async function getPlan(id: number) {
  const p = await db.get<Plan>("SELECT * FROM workout_plans WHERE id=?", [id]);
  if (!p) return null;
  const exercises = await db.all<PlanExercise>(
    `SELECT pe.*, e.name, e.muscle, e.tracking FROM workout_plan_exercises pe JOIN exercises e ON e.id=pe.exercise_id WHERE plan_id=? ORDER BY position`,
    [id],
  );
  return { ...p, exercises };
}
export async function savePlan(id: number | null, p: Omit<Plan, "id">, exercises: PlanExercise[]) {
  const pid = await db.tx(async () => {
    let pid = id;
    if (pid) {
      await db.run("UPDATE workout_plans SET name=?, description=?, notes=?, schedule_days=?, updated_at=? WHERE id=?", [
        p.name, p.description, p.notes, p.schedule_days, now(), pid,
      ]);
      await db.run("DELETE FROM workout_plan_exercises WHERE plan_id=?", [pid]);
    } else
      pid = (await db.run("INSERT INTO workout_plans(name,description,notes,schedule_days,created_at,updated_at) VALUES(?,?,?,?,?,?)", [
        p.name, p.description, p.notes, p.schedule_days, now(), now(),
      ])).id;
    let pos = 0;
    for (const e of exercises)
      await db.run(
        "INSERT INTO workout_plan_exercises(plan_id,exercise_id,position,sets,target_reps,target_weight,rest_sec,notes) VALUES(?,?,?,?,?,?,?,?)",
        [pid, e.exercise_id, pos++, e.sets, e.target_reps, e.target_weight, e.rest_sec, e.notes],
      );
    return pid!;
  });
  bump();
  return pid;
}
export async function duplicatePlan(id: number) {
  const p = await getPlan(id);
  if (!p) return;
  await savePlan(null, { name: `${p.name} (copy)`, description: p.description, notes: p.notes, schedule_days: null }, p.exercises);
}
export async function deletePlan(id: number) {
  await db.run("DELETE FROM workout_plans WHERE id=?", [id]);
  bump();
}
export async function planForWeekday(wd: number) {
  const plans = await listPlans();
  return plans.find((p) => (p.schedule_days ?? "").split(",").includes(String(wd))) ?? null;
}

// ---------- Sessions ----------
export const getActiveSession = () => db.get<Session>("SELECT * FROM workout_sessions WHERE status='active' ORDER BY id DESC LIMIT 1");

/** Starts a session from a plan (or empty). Returns existing active session instead of creating a duplicate. */
export async function startSession(planId: number | null): Promise<{ id: number; existing: boolean }> {
  const active = await getActiveSession();
  if (active) return { id: active.id, existing: true };
  const plan = planId ? await getPlan(planId) : null;
  const id = await db.tx(async () => {
    const r = await db.run("INSERT INTO workout_sessions(plan_id,name,status,day,started_at,paused_ms) VALUES(?,?,'active',?,?,0)", [
      planId, plan?.name ?? "Quick Workout", dayKey(), now(),
    ]);
    if (plan) {
      for (const pe of plan.exercises) {
        const ex = await getExercise(pe.exercise_id);
        if (!ex) continue;
        const se = await db.run(
          "INSERT INTO workout_session_exercises(session_id,exercise_id,name,tracking,position,rest_sec,notes,target_reps) VALUES(?,?,?,?,?,?,?,?)",
          [r.id, ex.id, ex.name, ex.tracking, pe.id ?? 0, pe.rest_sec, pe.notes, pe.target_reps],
        );
        for (let i = 0; i < pe.sets; i++)
          await db.run("INSERT INTO workout_session_sets(session_exercise_id,position,kind,weight,reps,done) VALUES(?,?,'working',?,NULL,0)", [
            se.id, i, pe.target_weight,
          ]);
      }
    }
    return r.id;
  });
  bump();
  return { id, existing: false };
}

export async function getSession(id: number) {
  const s = await db.get<Session>("SELECT * FROM workout_sessions WHERE id=?", [id]);
  if (!s) return null;
  const exs = await db.all<Omit<SExercise, "sets">>("SELECT * FROM workout_session_exercises WHERE session_id=? ORDER BY position, id", [id]);
  const out: SExercise[] = [];
  for (const e of exs) out.push({ ...e, sets: await db.all<SSet>("SELECT * FROM workout_session_sets WHERE session_exercise_id=? ORDER BY position, id", [e.id]) });
  return { ...s, exercises: out };
}

/** Persists immediately. Pass notify=false for keystroke-level edits to avoid re-rendering inputs. */
export async function updateSet(id: number, patch: Partial<SSet>, notify = true) {
  const p: Record<string, any> = { ...patch };
  if (patch.done !== undefined) p.completed_at = patch.done ? now() : null;
  const k2 = Object.keys(p);
  await db.run(`UPDATE workout_session_sets SET ${k2.map((k) => `${k}=?`).join(",")} WHERE id=?`, [...k2.map((k) => p[k]), id]);
  if (notify) bump();
}
export async function addSet(seId: number, kind: "warmup" | "working" = "working") {
  const last = await db.get<SSet>("SELECT * FROM workout_session_sets WHERE session_exercise_id=? ORDER BY position DESC LIMIT 1", [seId]);
  await db.run("INSERT INTO workout_session_sets(session_exercise_id,position,kind,weight,reps,done) VALUES(?,?,?,?,?,0)", [
    seId, (last?.position ?? -1) + 1, kind, last?.weight ?? null, last?.reps ?? null,
  ]);
  bump();
}
export async function deleteSet(id: number) {
  await db.run("DELETE FROM workout_session_sets WHERE id=?", [id]);
  bump();
}
export async function addSessionExercise(sessionId: number, ex: Exercise) {
  const last = await db.get<{ p: number }>("SELECT MAX(position) AS p FROM workout_session_exercises WHERE session_id=?", [sessionId]);
  const se = await db.run(
    "INSERT INTO workout_session_exercises(session_id,exercise_id,name,tracking,position,rest_sec) VALUES(?,?,?,?,?,90)",
    [sessionId, ex.id, ex.name, ex.tracking, (last?.p ?? -1) + 1],
  );
  for (let i = 0; i < 3; i++) await db.run("INSERT INTO workout_session_sets(session_exercise_id,position,kind,done) VALUES(?,?,'working',0)", [se.id, i]);
  bump();
}
export async function updateSessionExercise(id: number, patch: { notes?: string; skipped?: number; rest_sec?: number }) {
  const k = Object.keys(patch);
  await db.run(`UPDATE workout_session_exercises SET ${k.map((x) => `${x}=?`).join(",")} WHERE id=?`, [...k.map((x) => (patch as any)[x]), id]);
  bump();
}
export async function removeSessionExercise(id: number) {
  await db.run("DELETE FROM workout_session_exercises WHERE id=?", [id]);
  bump();
}
export async function moveSessionExercise(sessionId: number, id: number, dir: -1 | 1) {
  const list = await db.all<{ id: number }>("SELECT id FROM workout_session_exercises WHERE session_id=? ORDER BY position, id", [sessionId]);
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.tx(async () => {
    for (let k = 0; k < list.length; k++) await db.run("UPDATE workout_session_exercises SET position=? WHERE id=?", [k, list[k].id]);
  });
  bump();
}
export async function setSessionPause(id: number, paused: boolean) {
  const s = await db.get<Session>("SELECT * FROM workout_sessions WHERE id=?", [id]);
  if (!s) return;
  if (paused && !s.paused_at) await db.run("UPDATE workout_sessions SET paused_at=? WHERE id=?", [now(), id]);
  if (!paused && s.paused_at) {
    const add = Date.now() - new Date(s.paused_at).getTime();
    await db.run("UPDATE workout_sessions SET paused_at=NULL, paused_ms=paused_ms+? WHERE id=?", [add, id]);
  }
  bump();
}
export function elapsedSec(s: Pick<Session, "started_at" | "paused_at" | "paused_ms" | "ended_at">, at = Date.now()) {
  const end = s.ended_at ? new Date(s.ended_at).getTime() : s.paused_at ? new Date(s.paused_at).getTime() : at;
  return Math.max(0, (end - new Date(s.started_at).getTime() - (s.paused_ms || 0)) / 1000);
}

/** Best performance per exercise from completed sessions before a given session. */
async function bestBefore(exerciseId: number, beforeSessionId: number) {
  return db.get<{ w: number | null; e: number | null }>(
    `SELECT MAX(ss.weight) AS w, MAX(ss.weight * (1 + ss.reps/30.0)) AS e FROM workout_session_sets ss
     JOIN workout_session_exercises se ON se.id=ss.session_exercise_id JOIN workout_sessions s ON s.id=se.session_id
     WHERE s.status='completed' AND s.id<>? AND se.exercise_id=? AND ss.done=1 AND ss.kind='working' AND ss.weight>0 AND ss.reps>0`,
    [beforeSessionId, exerciseId],
  );
}

export async function finishSession(id: number) {
  const s = await getSession(id);
  if (!s) return null;
  let volume = 0, prs = 0;
  for (const e of s.exercises) {
    if (e.skipped) continue;
    const working = e.sets.filter((x) => x.done && x.kind === "working" && (x.weight ?? 0) > 0 && (x.reps ?? 0) > 0);
    volume += e.sets.reduce((a, x) => a + setVolume(x), 0);
    if (e.exercise_id && working.length) {
      const prev = await bestBefore(e.exercise_id, id);
      const maxW = Math.max(...working.map((x) => x.weight!));
      const maxE = Math.max(...working.map((x) => e1rm(x.weight!, x.reps!)));
      if (prev?.w != null && (maxW > prev.w || maxE > (prev.e ?? 0) + 0.01)) prs++;
    }
  }
  const t = now();
  const ended = { ...s, ended_at: t };
  await db.run("UPDATE workout_sessions SET status='completed', ended_at=?, paused_at=NULL, duration_sec=?, volume=?, pr_count=? WHERE id=?", [
    s.paused_at ?? t, Math.round(elapsedSec({ ...ended, ended_at: s.paused_at ?? t })), volume, prs, id,
  ]);
  await db.run("DELETE FROM meta WHERE key IN ('rest_end_at','rest_remaining','rest_total')");
  bump();
  return { volume, prs };
}
export async function recomputeSession(id: number) {
  const s = await getSession(id);
  if (!s) return;
  const volume = s.exercises.filter((e) => !e.skipped).reduce((a, e) => a + e.sets.reduce((b, x) => b + setVolume(x), 0), 0);
  await db.run("UPDATE workout_sessions SET volume=? WHERE id=?", [volume, id]);
  bump();
}
export async function discardSession(id: number) {
  await db.run("DELETE FROM workout_sessions WHERE id=?", [id]);
  await db.run("DELETE FROM meta WHERE key IN ('rest_end_at','rest_remaining','rest_total')");
  bump();
}
export async function updateSessionNotes(id: number, notes: string) {
  await db.run("UPDATE workout_sessions SET notes=? WHERE id=?", [notes, id]);
  bump();
}

export async function listHistory(limit = 200) {
  return db.all<Session & { ex_count: number; set_count: number }>(
    `SELECT s.*, (SELECT COUNT(*) FROM workout_session_exercises se WHERE se.session_id=s.id AND se.skipped=0) AS ex_count,
     (SELECT COUNT(*) FROM workout_session_sets ss JOIN workout_session_exercises se ON se.id=ss.session_exercise_id WHERE se.session_id=s.id AND ss.done=1) AS set_count
     FROM workout_sessions s WHERE status='completed' ORDER BY started_at DESC LIMIT ?`,
    [limit],
  );
}
export async function lastPerformance(exerciseId: number, excludeSession: number) {
  const s = await db.get<{ se_id: number; day: string }>(
    `SELECT se.id AS se_id, s.day FROM workout_session_exercises se JOIN workout_sessions s ON s.id=se.session_id
     WHERE s.status='completed' AND se.exercise_id=? AND s.id<>? ORDER BY s.started_at DESC LIMIT 1`,
    [exerciseId, excludeSession],
  );
  if (!s) return null;
  const sets = await db.all<SSet>("SELECT * FROM workout_session_sets WHERE session_exercise_id=? AND done=1 ORDER BY position", [s.se_id]);
  return { day: s.day, sets };
}

export async function personalRecords() {
  return db.all<{ exercise_id: number; name: string; tracking: string; max_w: number | null; best_e1rm: number | null; max_reps: number | null; max_time: number | null; max_dist: number | null }>(
    `SELECT se.exercise_id, se.name, se.tracking, MAX(CASE WHEN ss.kind='working' THEN ss.weight END) AS max_w,
     MAX(CASE WHEN ss.kind='working' AND ss.weight>0 AND ss.reps>0 THEN ss.weight*(1+ss.reps/30.0) END) AS best_e1rm,
     MAX(ss.reps) AS max_reps, MAX(ss.duration_sec) AS max_time, MAX(ss.distance_m) AS max_dist
     FROM workout_session_sets ss JOIN workout_session_exercises se ON se.id=ss.session_exercise_id JOIN workout_sessions s ON s.id=se.session_id
     WHERE s.status='completed' AND ss.done=1 AND se.skipped=0 GROUP BY se.exercise_id ORDER BY se.name`,
  );
}
export async function strengthSeries(exerciseId: number) {
  return db.all<{ day: string; max_w: number; best: number; reps_at_max: number }>(
    `SELECT s.day, MAX(ss.weight) AS max_w, MAX(ss.weight*(1+ss.reps/30.0)) AS best FROM workout_session_sets ss
     JOIN workout_session_exercises se ON se.id=ss.session_exercise_id JOIN workout_sessions s ON s.id=se.session_id
     WHERE s.status='completed' AND se.exercise_id=? AND ss.done=1 AND ss.kind='working' AND ss.weight>0 AND ss.reps>0
     GROUP BY s.id ORDER BY s.started_at`,
    [exerciseId],
  );
}
export async function bestSessionVolume() {
  return db.get<{ v: number; name: string; day: string }>("SELECT volume AS v, name, day FROM workout_sessions WHERE status='completed' ORDER BY volume DESC LIMIT 1");
}
