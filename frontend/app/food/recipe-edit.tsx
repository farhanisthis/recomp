import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { FoodPicker } from "@/src/components/FoodPicker";
import { Card, Field, Icon, PrimaryButton, ScreenContainer, SecondaryButton, ThreeDIllustration, useUI } from "@/src/components/ui";
import { getRecipe, saveRecipe, type Ingredient } from "@/src/db/repo/nutrition";
import { divMacros, num, round, scaleMacros, sumMacros } from "@/src/lib/calc";
import { space, useTheme } from "@/src/theme";

export default function RecipeEdit() {
  const p = useLocalSearchParams<{ id?: string }>();
  const id = p.id ? Number(p.id) : null;
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useUI();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("2");
  const [ing, setIng] = useState<Ingredient[]>([]);
  const [picker, setPicker] = useState(false);
  useEffect(() => {
    if (id) getRecipe(id).then((r) => { if (r) { setName(r.name); setServings(String(r.servings)); setIng(r.ingredients); } });
  }, [id]);
  const sv = num(servings);
  const total = sumMacros(ing);
  const per = divMacros(total, sv && sv > 0 ? sv : 1);
  const ok = name.trim() && sv && sv > 0 && ing.length > 0;
  return (
    <ScreenContainer back title={id ? "Edit Recipe" : "Create Recipe"} testID="recipe-edit-screen"
      footer={<PrimaryButton testID="recipe-save" title={id ? "Save Recipe" : "Create Recipe"} disabled={!ok} onPress={async () => { await saveRecipe(id, name.trim(), sv!, ing); toast("Recipe saved"); router.back(); }} />}>
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="pot" size={120} style={{ height: 90 }} /></View>
      <Field testID="recipe-name-input" label="Recipe name" value={name} onChangeText={setName} placeholder="e.g. Chicken fried rice" />
      <Field testID="recipe-servings-input" label="Number of servings" value={servings} onChangeText={setServings} keyboardType="decimal-pad" />
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.onSurface }}>Ingredients</Text>
      {ing.map((i, k) => (
        <Card key={k} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md }} testID={`recipe-ing-${k}`}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: colors.onSurface }}>{i.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{Math.round(i.kcal)} kcal · P {round(i.protein, 1)} g</Text>
          </View>
          <Field testID={`recipe-ing-grams-${k}`} style={{ width: 100 }} value={String(i.grams)} keyboardType="decimal-pad" suffix="g"
            onChangeText={(v) => {
              const g = num(v) ?? 0;
              setIng(ing.map((x, j) => {
                if (j !== k) return x;
                const per100 = x.grams > 0 ? divMacros(x, x.grams / 100) : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
                return { ...x, grams: g, ...scaleMacros(per100, g) };
              }));
            }} />
          <Pressable testID={`recipe-ing-remove-${k}`} hitSlop={8} onPress={() => setIng(ing.filter((_, j) => j !== k))}><Icon name="close-circle" color={colors.muted} /></Pressable>
        </Card>
      ))}
      <SecondaryButton testID="recipe-add-ingredient" icon="plus" title="Add Ingredient" onPress={() => setPicker(true)} />
      <Card testID="recipe-totals" style={{ gap: 4 }}>
        <Text style={{ fontWeight: "800", color: colors.onSurface }}>Total: {Math.round(total.kcal)} kcal · P {round(total.protein, 1)} · C {round(total.carbs, 1)} · F {round(total.fat, 1)}</Text>
        <Text style={{ color: colors.brand, fontWeight: "700" }} testID="recipe-per-serving">Per serving: {Math.round(per.kcal)} kcal · P {round(per.protein, 1)} g</Text>
      </Card>
      <FoodPicker visible={picker} onClose={() => setPicker(false)} onPick={(f, g) => setIng([...ing, { food_id: f.id, name: f.name, grams: g, ...scaleMacros(f, g) }])} />
    </ScreenContainer>
  );
}
