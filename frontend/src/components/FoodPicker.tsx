// Reusable modal food picker used by recipes and AI review.
import { useState } from "react";
import { Text, View } from "react-native";
import { Field, PrimaryButton, Sheet, SettingsRow } from "./ui";
import { searchFoods, type Food } from "../db/repo/nutrition";
import { num } from "../lib/calc";
import { useQ } from "../lib/useQ";
import { space, useTheme } from "../theme";

export function FoodPicker({ visible, onClose, onPick, askGrams = true, initialQuery = "" }: {
  visible: boolean; onClose: () => void; onPick: (f: Food, grams: number) => void; askGrams?: boolean; initialQuery?: string;
}) {
  const { colors } = useTheme();
  const [q, setQ] = useState(initialQuery);
  const [sel, setSel] = useState<Food | null>(null);
  const [g, setG] = useState("100");
  const { data } = useQ(() => searchFoods(q, 25), [q]);
  const close = () => { setSel(null); onClose(); };
  return (
    <Sheet visible={visible} onClose={close} title={sel ? sel.name : "Choose food"} testID="food-picker">
      {sel ? (
        <View style={{ gap: space.md }}>
          <Field testID="food-picker-grams-input" label={`Amount (${sel.basis})`} value={g} onChangeText={setG} keyboardType="decimal-pad" suffix={sel.basis} autoFocus />
          <Text style={{ color: colors.muted }}>{Math.round(((num(g) ?? 0) / 100) * sel.kcal)} kcal · P {Math.round(((num(g) ?? 0) / 100) * sel.protein)} g</Text>
          <PrimaryButton testID="food-picker-confirm" title="Add" disabled={!num(g) || num(g)! <= 0} onPress={() => { onPick(sel, num(g)!); close(); }} />
        </View>
      ) : (
        <>
          <Field testID="food-picker-search" placeholder="Search foods (e.g. dal, paneer)" value={q} onChangeText={setQ} />
          {(data ?? []).map((f) => (
            <SettingsRow key={f.id} testID={`food-picker-item-${f.id}`} icon="food-apple-outline" title={f.name} subtitle={`${Math.round(f.kcal)} kcal per 100 ${f.basis}`}
              onPress={() => (askGrams ? setSel(f) : (onPick(f, 100), close()))} />
          ))}
        </>
      )}
    </Sheet>
  );
}
