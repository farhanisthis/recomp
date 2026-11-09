// Auto-extracted pure parser from src/lib/ai.ts for node tests
export type ParsedItem = { name: string; quantity: number; unit: string };
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

