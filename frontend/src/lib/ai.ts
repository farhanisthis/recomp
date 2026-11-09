// Food text interpretation. AI only extracts {name, quantity, unit}; nutrition always comes from the local DB.
import { storage } from "../utils/storage";
import { getMeta } from "../db/repo/settings";
import { getServings, searchFoods, type Food, type Serving } from "../db/repo/nutrition";

export type ParsedItem = { name: string; quantity: number; unit: string };
export const GEMINI_KEY = "gemini_api_key";
export const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const WORDNUM: Record<string, number> = {
  ek: 1, ak: 1, one: 1, a: 1, an: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4, paanch: 5, panch: 5, five: 5,
  half: 0.5, aadha: 0.5, adha: 0.5, dedh: 1.5, dhai: 2.5, six: 6, chhe: 6,
};
const UNITS: Record<string, string> = {
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", kg: "kg", ml: "ml", l: "l", litre: "l", liter: "l",
  piece: "piece", pieces: "piece", pc: "piece", pcs: "piece", nos: "piece",
  katori: "bowl", katoris: "bowl", bowl: "bowl", bowls: "bowl", cup: "cup", cups: "cup", glass: "glass", glasses: "glass",
  plate: "plate", plates: "plate", tbsp: "tbsp", tablespoon: "tbsp", chammach: "tbsp", spoon: "tbsp", tsp: "tsp", teaspoon: "tsp",
  slice: "slice", slices: "slice", scoop: "scoop", scoops: "scoop", serving: "serving", servings: "serving",
};
const FILLER = new Set(["of", "and", "aur", "with", "ke", "ki", "ka", "saath", "sath", "bhi"]);

/** Deterministic, offline parser for simple English/Hinglish descriptions. */
export function parseDeterministic(text: string): ParsedItem[] {
  const parts = text.toLowerCase().split(/,|\+|\band\b|\baur\b|\bwith\b|\n|;/).map((x) => x.trim()).filter(Boolean);
  const out: ParsedItem[] = [];
  for (const p of parts) {
    let tokens = p.replace(/(\d)([a-z])/g, "$1 $2").split(/\s+/).filter(Boolean);
    let qty: number | null = null;
    let unit = "";
    const t0 = tokens[0];
    if (t0 && /^\d+(\.\d+)?$/.test(t0)) { qty = Number(t0); tokens = tokens.slice(1); }
    else if (t0 && t0 in WORDNUM) { qty = WORDNUM[t0]; tokens = tokens.slice(1); }
    if (tokens[0] && UNITS[tokens[0]]) { unit = UNITS[tokens[0]]; tokens = tokens.slice(1); }
    tokens = tokens.filter((t) => !FILLER.has(t));
    // trailing quantity like "rice 150g"
    const last = tokens[tokens.length - 1];
    if (qty == null && tokens.length > 1 && /^\d+(\.\d+)?$/.test(tokens[tokens.length - 2] ?? "") && UNITS[last]) {
      qty = Number(tokens[tokens.length - 2]); unit = UNITS[last]; tokens = tokens.slice(0, -2);
    }
    const name = tokens.join(" ").trim();
    if (!name) continue;
    if (unit === "kg") { qty = (qty ?? 1) * 1000; unit = "g"; }
    if (unit === "l") { qty = (qty ?? 1) * 1000; unit = "ml"; }
    out.push({ name, quantity: qty ?? 1, unit: unit || "piece" });
  }
  return out;
}

function validate(raw: any): ParsedItem[] {
  if (!raw || !Array.isArray(raw.items)) throw new Error("AI response did not match the expected schema");
  return raw.items
    .filter((i: any) => typeof i?.name === "string" && i.name.trim() && Number.isFinite(Number(i.quantity)) && Number(i.quantity) > 0)
    .slice(0, 20)
    .map((i: any) => ({ name: String(i.name).trim().toLowerCase().slice(0, 60), quantity: Number(i.quantity), unit: UNITS[String(i.unit ?? "").toLowerCase()] ?? "piece" }));
}

export async function geminiRequest(path: string, init?: RequestInit) {
  const key = await storage.secureGet(GEMINI_KEY, null);
  if (!key) throw new Error("No Gemini API key saved");
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}`, { ...init, headers: { "Content-Type": "application/json", "x-goog-api-key": String(key), ...(init?.headers ?? {}) } });
  } catch {
    throw new Error("No internet connection or Gemini unreachable");
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const b = await res.json().catch(() => ({}));
    throw new Error(/API key/i.test(JSON.stringify(b)) ? "Invalid API key" : b?.error?.message ?? `Request rejected (${res.status})`);
  }
  if (res.status === 404) throw new Error("Model not found or unsupported");
  if (res.status === 429) throw new Error("Rate limit reached — try again later");
  if (!res.ok) throw new Error(`Gemini service error (${res.status})`);
  return res.json();
}

export async function testGemini(model: string) {
  const r = await geminiRequest(`models/${model}`);
  return String(r?.displayName ?? model);
}

async function geminiParse(text: string): Promise<ParsedItem[]> {
  const model = (await getMeta("gemini_model")) ?? GEMINI_MODELS[0];
  const prompt = `Extract foods from this meal description (English or Hinglish). Do not estimate nutrition. Translate Hindi food words to common English/Indian names (e.g. "katori" = bowl, "anda" = egg). Units must be one of: g, ml, piece, bowl, cup, glass, plate, tbsp, tsp, slice, scoop, serving.\nText: ${JSON.stringify(text)}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, quantity: { type: "NUMBER" }, unit: { type: "STRING" } }, required: ["name", "quantity", "unit"] } } },
        required: ["items"],
      },
    },
  };
  const r = await geminiRequest(`models/${model}:generateContent`, { method: "POST", body: JSON.stringify(body) });
  const txt = r?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error("Empty response from Gemini");
  let parsed: any;
  try { parsed = JSON.parse(txt); } catch { throw new Error("Gemini returned invalid JSON"); }
  return validate(parsed);
}

export async function interpret(text: string): Promise<{ items: ParsedItem[]; provider: string }> {
  const provider = (await getMeta("ai_provider")) ?? "manual";
  if (provider === "gemini") return { items: await geminiParse(text), provider: "Gemini" };
  return { items: parseDeterministic(text), provider: "Offline parser" };
}

export type Resolved = ParsedItem & { food: Food | null; servings: Serving[]; grams: number | null; needsReview: string | null };
/** Match items to local foods and convert quantities to grams. Flags anything ambiguous. */
export async function resolveItems(items: ParsedItem[]): Promise<Resolved[]> {
  const out: Resolved[] = [];
  for (const it of items) {
    const food = (await searchFoods(it.name, 1))[0] ?? null;
    const servings = food ? await getServings(food.id) : [];
    let grams: number | null = null;
    let needsReview: string | null = null;
    if (!food) needsReview = "No matching food — pick one";
    else if (it.unit === "g" || it.unit === "ml") grams = it.quantity;
    else {
      const sv = servings.find((s) => s.unit === it.unit) ?? (it.unit === "piece" || it.unit === "serving" ? servings.find((s) => s.unit === "piece") : undefined);
      if (sv) { grams = sv.grams * it.quantity; needsReview = `Assumed ${sv.label} — check portion`; }
      else needsReview = `Unknown weight for "${it.unit}" — enter grams`;
    }
    out.push({ ...it, food, servings, grams, needsReview });
  }
  return out;
}
