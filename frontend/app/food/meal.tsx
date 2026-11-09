import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Card, Chips, EmptyState, Field, Icon, LoadingIndicator, PrimaryButton, ScreenContainer, SecondaryButton, SettingsRow, Sheet, useUI } from "@/src/components/ui";
import { deleteEntry, entriesForDay, saveMealFromEntries, updateEntry, type Entry } from "@/src/db/repo/nutrition";
import { dayKey, fmtDay, MEAL_LABEL, MEALS, round, sumMacros, type Meal } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

/** Meal entry list for a day: edit, move, delete, save as a reusable meal. */
export default function MealScreen() {
  const p = useLocalSearchParams<{ meal: Meal; day?: string }>();
  const meal = (p.meal ?? "breakfast") as Meal;
  const day = p.day ?? dayKey();
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const { data } = useQ(async () => (await entriesForDay(day)).filter((e) => e.meal === meal), [day, meal]);
  const [sel, setSel] = useState<Entry | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const t = sumMacros(data);

  const open = (e: Entry) => (e.food_id ? router.push(`/food/${e.food_id}?entryId=${e.id}`) : setSel(e));
  return (
    <ScreenContainer back title={MEAL_LABEL[meal]} subtitle={fmtDay(day)} testID="meal-screen"
      footer={<PrimaryButton testID="meal-add-food" icon="plus" title="Add Food" onPress={() => router.push(`/food/search?day=${day}&meal=${meal}`)} />}>
      <Card testID="meal-totals">
        <Text style={{ fontSize: 28, fontWeight: "900", color: colors.onSurface }}>{Math.round(t.kcal)} kcal</Text>
        <Text style={{ color: colors.muted }}>P {round(t.protein, 1)} g · C {round(t.carbs, 1)} g · F {round(t.fat, 1)} g</Text>
      </Card>
      {data.length === 0 ? <EmptyState illus="food_bowl" title="Nothing logged" text="Add foods to this meal." /> : (
        <View style={{ gap: space.sm }}>
          {data.map((e) => (
            <SettingsRow key={e.id} testID={`meal-entry-${e.id}`} icon="food-variant" title={e.name}
              subtitle={`${e.grams ? round(e.grams, 0) + " g · " : ""}P ${round(e.protein, 1)} C ${round(e.carbs, 1)} F ${round(e.fat, 1)}`}
              value={`${Math.round(e.kcal)} kcal`} onPress={() => open(e)}
              right={<Icon name="dots-vertical" color={colors.muted} />} />
          ))}
          <SecondaryButton testID="meal-save-as-saved" icon="bookmark-outline" title="Save as reusable meal" onPress={() => { setName(`${MEAL_LABEL[meal]} combo`); setSaveOpen(true); }} />
        </View>
      )}
      {data.length > 0 && <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>Tap an entry to edit quantity, move or delete it.</Text>}

      <Sheet visible={!!sel} onClose={() => setSel(null)} title={sel?.name} testID="entry-sheet">
        <Text style={{ color: colors.muted }}>Move to another meal</Text>
        <Chips testID="entry-move" value={sel?.meal ?? meal} onChange={async (m) => { await updateEntry(sel!.id, { meal: m }); setSel(null); toast(`Moved to ${MEAL_LABEL[m]}`); }}
          options={MEALS.map((x) => ({ key: x, label: MEAL_LABEL[x] }))} />
        <SecondaryButton testID="entry-delete" danger icon="delete-outline" title="Delete entry" onPress={async () => {
          const e = sel!; setSel(null);
          if (await confirm({ title: "Delete entry?", message: e.name, destructive: true, confirmText: "Delete" })) await deleteEntry(e.id);
        }} />
      </Sheet>
      <Sheet visible={saveOpen} onClose={() => setSaveOpen(false)} title="Save meal" testID="save-meal-sheet">
        <Field testID="save-meal-name" value={name} onChangeText={setName} label="Name" />
        <PrimaryButton testID="save-meal-confirm" title="Save" disabled={!name.trim()} onPress={async () => { await saveMealFromEntries(name.trim(), data); setSaveOpen(false); toast("Saved meal created"); }} />
      </Sheet>
    </ScreenContainer>
  );
}
