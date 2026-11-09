import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { FoodPicker } from "@/src/components/FoodPicker";
import { Card, Chips, Field, Icon, PrimaryButton, ScreenContainer, useUI } from "@/src/components/ui";
import { addEntries, getServings } from "@/src/db/repo/nutrition";
import { getMeta } from "@/src/db/repo/settings";
import { interpret, resolveItems, type Resolved } from "@/src/lib/ai";
import { dayKey, defaultMeal, fmtDay, MEAL_LABEL, MEALS, num, round, scaleMacros, type Meal } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

/** Text logging: interpret → match local foods → user reviews every item → save. Never auto-saves. */
export default function AiLog() {
  const p = useLocalSearchParams<{ day?: string; meal?: Meal }>();
  const day = p.day ?? dayKey();
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useUI();
  const { data: provider } = useQ(async () => (await getMeta("ai_provider")) ?? "manual");
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<Meal>(p.meal ?? defaultMeal());
  const [items, setItems] = useState<(Resolved & { gramsText: string; ok: boolean })[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [usedProvider, setUsedProvider] = useState("");
  const [pickFor, setPickFor] = useState<number | null>(null);

  const run = async () => {
    setBusy(true); setErr(null); setItems(null);
    try {
      const r = await interpret(text);
      setUsedProvider(r.provider);
      if (!r.items.length) throw new Error("Couldn't find any foods in that text.");
      const res = await resolveItems(r.items);
      setItems(res.map((x) => ({ ...x, gramsText: x.grams != null ? String(round(x.grams, 1)) : "", ok: false })));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };
  const ready = !!items?.length && items.every((i) => i.food && (num(i.gramsText) ?? 0) > 0 && i.ok);
  const save = async () => {
    await addEntries(items!.map((i) => {
      const g = num(i.gramsText)!;
      return { food_id: i.food!.id, recipe_id: null, name: i.food!.name, meal, day, quantity: g, unit: i.food!.basis, grams: g, ...scaleMacros(i.food!, g), source: usedProvider === "Gemini" ? "gemini" : "text_parser" };
    }));
    toast(`${items!.length} items added`);
    router.back();
  };
  return (
    <ScreenContainer back title="Describe Your Meal" subtitle={`${fmtDay(day)} · ${provider === "gemini" ? "Gemini (online)" : "Offline parser"}`} testID="ai-log-screen"
      footer={items ? <PrimaryButton testID="ai-log-save" title={ready ? "Add All to Meal" : "Review all items to continue"} disabled={!ready} onPress={save} /> : undefined}>
      <Field testID="ai-log-input" multiline value={text} onChangeText={setText} placeholder="2 roti, ek katori dal, 150g rice" style={{ minHeight: 90 }} />
      <Chips testID="ai-log-meal" value={meal} onChange={setMeal} options={MEALS.map((x) => ({ key: x, label: MEAL_LABEL[x] }))} />
      <PrimaryButton testID="ai-log-interpret" icon="text-search" title="Interpret" loading={busy} disabled={!text.trim()} onPress={run} />
      {provider === "gemini" && <Text style={{ color: colors.muted, fontSize: 12 }}>Your text will be sent to Google Gemini. Switch to Manual in AI settings to stay offline.</Text>}
      {!!err && <Text style={{ color: colors.error }} testID="ai-log-error">{err}</Text>}
      {items?.map((it, k) => {
        const g = num(it.gramsText) ?? 0;
        const m = it.food ? scaleMacros(it.food, g) : null;
        const set = (patch: Partial<typeof it>) => setItems(items.map((x, j) => (j === k ? { ...x, ...patch } : x)));
        return (
          <Card key={k} style={{ gap: space.sm, borderWidth: it.ok ? 0 : 1.5, borderColor: colors.warning }} testID={`ai-item-${k}`}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>You wrote: “{it.quantity} {it.unit} {it.name}”</Text>
            <Pressable testID={`ai-item-change-${k}`} onPress={() => setPickFor(k)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontWeight: "800", fontSize: 16, color: it.food ? colors.onSurface : colors.error, flex: 1 }}>{it.food?.name ?? "Pick a food"}</Text>
              <Icon name="swap-horizontal" color={colors.brand} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
              <Field testID={`ai-item-grams-${k}`} style={{ flex: 1 }} value={it.gramsText} onChangeText={(v) => set({ gramsText: v })} keyboardType="decimal-pad" suffix={it.food?.basis ?? "g"} placeholder="grams" />
              <Text style={{ fontWeight: "700", color: colors.onSurface, width: 90, textAlign: "right" }}>{m ? `${Math.round(m.kcal)} kcal` : "—"}</Text>
            </View>
            {!!it.needsReview && <Text style={{ color: colors.warning, fontSize: 12 }}>{it.needsReview}</Text>}
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Pressable testID={`ai-item-confirm-${k}`} onPress={() => set({ ok: !it.ok })} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 }}>
                <Icon name={it.ok ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} color={it.ok ? colors.success : colors.muted} />
                <Text style={{ color: colors.onSurface, fontWeight: "600" }}>Looks right</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable testID={`ai-item-remove-${k}`} onPress={() => setItems(items.filter((_, j) => j !== k))} style={{ minHeight: 36, justifyContent: "center" }}>
                <Text style={{ color: colors.error, fontWeight: "600" }}>Remove</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
      <FoodPicker visible={pickFor != null} askGrams={false} initialQuery={pickFor != null ? items?.[pickFor]?.name : ""} onClose={() => setPickFor(null)}
        onPick={async (f) => {
          const k = pickFor!;
          const sv = await getServings(f.id);
          setItems((prev) => prev!.map((x, j) => (j === k ? { ...x, food: f, servings: sv, ok: false, needsReview: x.gramsText ? "Food changed — confirm amount" : "Enter grams" } : x)));
        }} />
    </ScreenContainer>
  );
}
