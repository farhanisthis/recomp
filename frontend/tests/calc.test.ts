// Run: node --experimental-strip-types tests/calc.test.ts
import assert from "node:assert/strict";
import { bmr, e1rm, scaleMacros, setVolume, sleepMinutes, suggestTargets, sumMacros, wIn, wOut, addDays, isValidDay } from "../src/lib/calc.ts";
import { parseDeterministic } from "./parser-shim.ts";

assert.equal(Math.round(bmr("male", 74.8, 175, 24)), 1727);
const t = suggestTargets({ sex: "male", weight_kg: 74.8, height_cm: 175, age: 24, activity: "moderate", goal: "recomp" });
assert.equal(t.calories, 2410);
assert.equal(t.protein, 150);
assert.ok(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.calories) < 10);
const m = scaleMacros({ kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, 150);
assert.equal(m.kcal, 247.5); assert.equal(m.protein, 46.5);
assert.equal(sumMacros([m, m]).kcal, 495);
assert.equal(e1rm(100, 1), 100); assert.equal(Math.round(e1rm(80, 8) * 10) / 10, 101.3);
assert.equal(setVolume({ weight: 80, reps: 8, done: 1, kind: "working" }), 640);
assert.equal(setVolume({ weight: 40, reps: 10, done: 1, kind: "warmup" }), 0);
assert.equal(setVolume({ weight: 80, reps: 8, done: 0, kind: "working" }), 0);
assert.equal(sleepMinutes("23:30", "07:15"), 465);
assert.equal(sleepMinutes("01:00", "08:00"), 420);
assert.ok(Math.abs(wIn(wOut(74.8, { weight: "lb", length: "cm" })!, { weight: "lb", length: "cm" }) - 74.8) < 1e-9);
assert.equal(addDays("2026-02-28", 1), "2026-03-01");
assert.ok(!isValidDay("2026-02-30"));
const p = parseDeterministic("2 roti, ek katori dal, 150g rice");
assert.deepEqual(p, [{ name: "roti", quantity: 2, unit: "piece" }, { name: "dal", quantity: 1, unit: "bowl" }, { name: "rice", quantity: 150, unit: "g" }]);
console.log("All calc tests passed");
