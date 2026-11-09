// Foods, entries, recipes, saved meals, water.
import { db } from "../client";
import { bump } from "../../lib/useQ";
import { divMacros, scaleMacros, sumMacros, type Macros, type Meal } from "../../lib/calc";

export type Food = { id: number; name: string; brand: string | null; basis: "g" | "ml"; kcal: number; protein: number; carbs: number; fat: number; fiber: number | null; source: string | null; is_custom: number };
export type Serving = { id: number; food_id: number; label: string; unit: string; grams: number };
export type Entry = Macros & { id: number; food_id: number | null; recipe_id: number | null; name: string; meal: Meal; day: string; logged_at: string; quantity: number; unit: string; grams: number; source: string | null };

const now = () => new Date().toISOString();

export async function searchFoods(q: string, limit = 40): Promise<Food[]> {
  const t = q.trim().toLowerCase();
  if (!t) return db.all<Food>("SELECT * FROM food_items ORDER BY is_custom DESC, name LIMIT ?", [limit]);
  const like = `%${t}%`;
  return db.all<Food>(
    `SELECT f.*, MIN(CASE WHEN lower(f.name)=? OR a.alias=? THEN 0 WHEN lower(f.name) LIKE ? OR a.alias LIKE ? THEN 1 ELSE 2 END) AS rank
     FROM food_items f LEFT JOIN food_aliases a ON a.food_id=f.id
     WHERE lower(f.name) LIKE ? OR a.alias LIKE ? OR lower(IFNULL(f.brand,'')) LIKE ?
     GROUP BY f.id ORDER BY rank, length(f.name) LIMIT ?`,
    [t, t, `${t}%`, `${t}%`, like, like, like, limit],
  );
}
export const getFood = (id: number) => db.get<Food>("SELECT * FROM food_items WHERE id=?", [id]);
export const getServings = (foodId: number) => db.all<Serving>("SELECT * FROM food_servings WHERE food_id=? ORDER BY grams", [foodId]);

export async function createFood(f: Omit<Food, "id" | "is_custom" | "source">, serving?: { label: string; unit: string; grams: number }) {
  const id = await db.tx(async () => {
    const r = await db.run(
      "INSERT INTO food_items(name,brand,basis,kcal,protein,carbs,fat,fiber,source,is_custom,created_at) VALUES(?,?,?,?,?,?,?,?,?,1,?)",
      [f.name, f.brand, f.basis, f.kcal, f.protein, f.carbs, f.fat, f.fiber, "Custom", now()],
    );
    await db.run("INSERT INTO food_aliases(food_id,alias) VALUES(?,?)", [r.id, f.name.toLowerCase()]);
    if (serving) await db.run("INSERT INTO food_servings(food_id,label,unit,grams) VALUES(?,?,?,?)", [r.id, serving.label, serving.unit, serving.grams]);
    return r.id;
  });
  bump();
  return id;
}
export async function deleteFood(id: number) {
  await db.run("DELETE FROM food_items WHERE id=? AND is_custom=1", [id]);
  bump();
}

export type NewEntry = Omit<Entry, "id" | "logged_at">;
export async function addEntries(list: NewEntry[]) {
  await db.tx(async () => {
    for (const e of list)
      await db.run(
        `INSERT INTO food_entries(food_id,recipe_id,name,meal,day,logged_at,quantity,unit,grams,kcal,protein,carbs,fat,source)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [e.food_id, e.recipe_id, e.name, e.meal, e.day, now(), e.quantity, e.unit, e.grams, e.kcal, e.protein, e.carbs, e.fat, e.source],
      );
  });
  bump();
}
export async function updateEntry(id: number, e: Partial<NewEntry>) {
  const keys = Object.keys(e) as (keyof NewEntry)[];
  if (!keys.length) return;
  await db.run(`UPDATE food_entries SET ${keys.map((k) => `${k}=?`).join(",")} WHERE id=?`, [...keys.map((k) => e[k] as any), id]);
  bump();
}
export async function deleteEntry(id: number) {
  await db.run("DELETE FROM food_entries WHERE id=?", [id]);
  bump();
}
export const getEntry = (id: number) => db.get<Entry>("SELECT * FROM food_entries WHERE id=?", [id]);
export const entriesForDay = (day: string) => db.all<Entry>("SELECT * FROM food_entries WHERE day=? ORDER BY logged_at", [day]);

export async function dayTotals(day: string) {
  const list = await entriesForDay(day);
  const byMeal: Record<string, Macros & { count: number }> = {};
  for (const m of ["breakfast", "lunch", "dinner", "snacks"]) byMeal[m] = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
  for (const e of list) {
    const b = byMeal[e.meal];
    b.kcal += e.kcal; b.protein += e.protein; b.carbs += e.carbs; b.fat += e.fat; b.count++;
  }
  return { total: sumMacros(list), byMeal, count: list.length };
}

// ---------- Recipes ----------
export type Ingredient = Macros & { id?: number; food_id: number | null; name: string; grams: number };
export type Recipe = { id: number; name: string; servings: number; notes: string | null };
export async function listRecipes() {
  const rs = await db.all<Recipe>("SELECT * FROM recipes ORDER BY name");
  const out: (Recipe & { total: Macros; perServing: Macros; count: number })[] = [];
  for (const r of rs) {
    const ing = await db.all<Ingredient>("SELECT * FROM recipe_ingredients WHERE recipe_id=?", [r.id]);
    const total = sumMacros(ing);
    out.push({ ...r, total, perServing: divMacros(total, r.servings || 1), count: ing.length });
  }
  return out;
}
export async function getRecipe(id: number) {
  const r = await db.get<Recipe>("SELECT * FROM recipes WHERE id=?", [id]);
  if (!r) return null;
  const ingredients = await db.all<Ingredient>("SELECT * FROM recipe_ingredients WHERE recipe_id=? ORDER BY id", [id]);
  return { ...r, ingredients };
}
export async function saveRecipe(id: number | null, name: string, servings: number, ingredients: Ingredient[]) {
  const rid = await db.tx(async () => {
    let rid = id;
    if (rid) {
      await db.run("UPDATE recipes SET name=?, servings=?, updated_at=? WHERE id=?", [name, servings, now(), rid]);
      await db.run("DELETE FROM recipe_ingredients WHERE recipe_id=?", [rid]);
    } else rid = (await db.run("INSERT INTO recipes(name,servings,created_at,updated_at) VALUES(?,?,?,?)", [name, servings, now(), now()])).id;
    for (const i of ingredients)
      await db.run("INSERT INTO recipe_ingredients(recipe_id,food_id,name,grams,kcal,protein,carbs,fat) VALUES(?,?,?,?,?,?,?,?)", [
        rid, i.food_id, i.name, i.grams, i.kcal, i.protein, i.carbs, i.fat,
      ]);
    return rid!;
  });
  bump();
  return rid;
}
export async function deleteRecipe(id: number) {
  await db.run("DELETE FROM recipes WHERE id=?", [id]);
  bump();
}

// ---------- Saved meals ----------
export async function listSavedMeals() {
  const ms = await db.all<{ id: number; name: string }>("SELECT * FROM saved_meals ORDER BY name");
  const out = [];
  for (const m of ms) {
    const items = await db.all<Entry>("SELECT * FROM saved_meal_items WHERE saved_meal_id=?", [m.id]);
    out.push({ ...m, items, total: sumMacros(items) });
  }
  return out;
}
export async function saveMealFromEntries(name: string, entries: Entry[]) {
  await db.tx(async () => {
    const r = await db.run("INSERT INTO saved_meals(name,created_at) VALUES(?,?)", [name, now()]);
    for (const e of entries)
      await db.run(
        "INSERT INTO saved_meal_items(saved_meal_id,food_id,name,quantity,unit,grams,kcal,protein,carbs,fat) VALUES(?,?,?,?,?,?,?,?,?,?)",
        [r.id, e.food_id, e.name, e.quantity, e.unit, e.grams, e.kcal, e.protein, e.carbs, e.fat],
      );
  });
  bump();
}
export async function deleteSavedMeal(id: number) {
  await db.run("DELETE FROM saved_meals WHERE id=?", [id]);
  bump();
}
export async function logSavedMeal(id: number, meal: Meal, day: string) {
  const items = await db.all<Entry>("SELECT * FROM saved_meal_items WHERE saved_meal_id=?", [id]);
  await addEntries(items.map((i) => ({ ...i, id: undefined as any, recipe_id: null, meal, day, source: "saved_meal" })));
}
export async function logRecipe(id: number, servings: number, meal: Meal, day: string) {
  const r = await getRecipe(id);
  if (!r) return;
  const total = sumMacros(r.ingredients);
  const totalG = r.ingredients.reduce((a, i) => a + i.grams, 0);
  const per = divMacros(total, r.servings || 1);
  await addEntries([
    {
      food_id: null, recipe_id: id, name: r.name, meal, day, quantity: servings, unit: "serving",
      grams: (totalG / (r.servings || 1)) * servings, kcal: per.kcal * servings, protein: per.protein * servings,
      carbs: per.carbs * servings, fat: per.fat * servings, source: "recipe",
    },
  ]);
}

export function macrosForFood(f: Food, grams: number) {
  return scaleMacros(f, grams);
}

// ---------- Water ----------
export const waterForDay = (day: string) => db.all<{ id: number; ml: number; logged_at: string }>("SELECT * FROM water_entries WHERE day=? ORDER BY logged_at DESC", [day]);
export async function waterTotal(day: string) {
  const r = await db.get<{ t: number }>("SELECT SUM(ml) AS t FROM water_entries WHERE day=?", [day]);
  return r?.t ?? 0;
}
export async function addWater(day: string, ml: number) {
  await db.run("INSERT INTO water_entries(day,ml,logged_at) VALUES(?,?,?)", [day, ml, now()]);
  bump();
}
export async function deleteWater(id: number) {
  await db.run("DELETE FROM water_entries WHERE id=?", [id]);
  bump();
}
export async function waterRange(from: string, to: string) {
  return db.all<{ day: string; ml: number }>("SELECT day, SUM(ml) AS ml FROM water_entries WHERE day BETWEEN ? AND ? GROUP BY day", [from, to]);
}
