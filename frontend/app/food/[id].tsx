import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Card, Chips, DateNav, Field, LoadingIndicator, PrimaryButton, ScreenContainer, SecondaryButton, ThreeDIllustration, useUI } from "@/src/components/ui";
import { addEntries, deleteEntry, getEntry, getFood, getServings, updateEntry } from "@/src/db/repo/nutrition";
import { dayKey, fmtDay, MEAL_LABEL, MEALS, num, round, scaleMacros, type Meal } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { makeStyles, space, useTheme } from "@/src/theme";

/** Food details + quantity selector + meal/date. Also edits an existing entry (?entryId). */
export default function FoodDetail() {
  const p = useLocalSearchParams<{ id: string; day?: string; meal?: Meal; entryId?: string }>();
  const router = useRouter();
  const s = useStyles();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const entryId = p.entryId ? Number(p.entryId) : null;
  const { data } = useQ(async () => {
    const entry = entryId ? await getEntry(entryId) : null;
    const fid = entry ? entry.food_id : Number(p.id);
    const food = fid ? await getFood(fid) : null;
    return { entry, food, servings: food ? await getServings(food.id) : [] };
  }, [p.id, entryId]);
  const [unit, setUnit] = useState<string>("base");
  const [qty, setQty] = useState("100");
  const [meal, setMeal] = useState<Meal>(p.meal ?? "breakfast");
  const [day, setDay] = useState(p.day ?? dayKey());

  useEffect(() => {
    if (!data) return;
    if (data.entry) {
      setMeal(data.entry.meal); setDay(data.entry.day);
      const sv = data.servings.find((x) => String(x.id) === data.entry!.unit);
      if (sv) { setUnit(String(sv.id)); setQty(String(data.entry.quantity)); }
      else { setUnit("base"); setQty(String(round(data.entry.grams || data.entry.quantity, 1))); }
    } else if (data.servings[0]) { setUnit(String(data.servings[0].id)); setQty("1"); }
  }, [data]);

  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { food, entry, servings } = data;
  const q = num(qty);
  const sv = servings.find((x) => String(x.id) === unit);
  const grams = q == null ? 0 : sv ? sv.grams * q : q;
  // entries without a food (quick add / recipe / deleted food) scale from the stored snapshot
  const m = food ? scaleMacros(food, grams) : entry ? { kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat } : null;
  if (!m) return <ScreenContainer back title="Food not found"><Text>This food no longer exists.</Text></ScreenContainer>;
  const valid = food ? q != null && q > 0 && grams <= 3000 : true;
  const basis = food?.basis ?? "g";

  const save = async () => {
    const rec = { name: food?.name ?? entry!.name, meal, day, quantity: sv ? q! : grams, unit: sv ? String(sv.id) : basis, grams, ...m };
    if (entry) await updateEntry(entry.id, food ? rec : { meal, day });
    else await addEntries([{ ...rec, food_id: food!.id, recipe_id: null, source: "database" }]);
    toast(entry ? "Entry updated" : `Added to ${MEAL_LABEL[meal]}`);
    router.back();
  };
  const remove = async () => {
    if (entry && (await confirm({ title: "Delete entry?", message: entry.name, destructive: true, confirmText: "Delete" }))) {
      await deleteEntry(entry.id);
      router.back();
    }
  };

  return (
    <ScreenContainer back title={entry ? "Edit Entry" : "Add Food"} testID="food-detail-screen"
      footer={
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {entry && <SecondaryButton testID="food-entry-delete" danger title="Delete" onPress={remove} style={{ flex: 1 }} />}
          <PrimaryButton testID="food-add-confirm" title={entry ? "Save" : "Add to Meal"} disabled={!valid} onPress={save} style={{ flex: 2 }} />
        </View>
      }>
      <View style={{ alignItems: "center" }}>
        <ThreeDIllustration name="food_bowl" size={130} style={{ height: 100 }} />
        <Text style={s.title} testID="food-detail-name">{food?.name ?? entry?.name}</Text>
        {food && <Text style={s.cap}>{Math.round(food.kcal)} kcal per 100 {basis}{food.source ? ` · ${food.source}` : ""}</Text>}
      </View>
      {food && (
        <Card style={{ gap: space.md }}>
          <Text style={s.label}>Quantity</Text>
          <Chips testID="food-unit" value={unit} onChange={(u) => { setUnit(u); setQty(u === "base" ? String(round(grams || 100, 1)) : "1"); }}
            options={[{ key: "base", label: basis === "ml" ? "ml" : "grams" }, ...servings.map((x) => ({ key: String(x.id), label: x.label }))]} />
          <Field testID="food-qty-input" value={qty} onChangeText={setQty} keyboardType="decimal-pad" suffix={sv ? "× serving" : basis} error={!valid && qty !== "" ? "Enter a quantity between 0 and 3000 g" : null} />
          {sv && <Text style={s.cap}>= {round(grams, 1)} {basis}. Portion weights are typical values — switch to grams for accuracy.</Text>}
        </Card>
      )}
      <Card style={{ gap: space.sm }} testID="food-nutrition-card">
        <Text style={s.label}>Nutrition {food ? `(for ${round(grams, 1)} ${basis})` : "(saved snapshot)"}</Text>
        {[
          ["Calories", `${Math.round(m.kcal)} kcal`, colors.carbs, "kcal"],
          ["Protein", `${round(m.protein, 1)} g`, colors.protein, "protein"],
          ["Carbs", `${round(m.carbs, 1)} g`, colors.carbs, "carbs"],
          ["Fat", `${round(m.fat, 1)} g`, colors.fat, "fat"],
        ].map(([l, v, c, k]) => (
          <View key={l} style={s.rowBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={[s.dot, { backgroundColor: c }]} /><Text style={s.body}>{l}</Text></View>
            <Text style={s.label} testID={`food-detail-${k}`}>{v}</Text>
          </View>
        ))}
      </Card>
      <Text style={s.label}>Meal</Text>
      <Chips testID="food-meal" value={meal} onChange={setMeal} options={MEALS.map((x) => ({ key: x, label: MEAL_LABEL[x] }))} />
      <DateNav testID="food-detail-date" day={day} onChange={setDay} label={fmtDay(day)} />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  title: { fontSize: 22, fontWeight: "800", color: c.onSurface, textAlign: "center" },
  cap: { fontSize: 12.5, color: c.muted, textAlign: "center" },
  label: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  body: { fontSize: 15, color: c.onSurface },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 28 },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
