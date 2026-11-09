import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Chips, EmptyState, Field, PrimaryButton, ScreenContainer, Segmented, SecondaryButton, SettingsRow, Sheet, useUI } from "@/src/components/ui";
import { deleteRecipe, deleteSavedMeal, listRecipes, listSavedMeals, logRecipe, logSavedMeal } from "@/src/db/repo/nutrition";
import { dayKey, defaultMeal, fmtDay, MEAL_LABEL, MEALS, num, round, type Meal } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function Recipes() {
  const p = useLocalSearchParams<{ day?: string }>();
  const day = p.day ?? dayKey();
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const [tab, setTab] = useState<"meals" | "recipes">("meals");
  const { data } = useQ(async () => ({ meals: await listSavedMeals(), recipes: await listRecipes() }));
  const [logT, setLogT] = useState<{ kind: "meal" | "recipe"; id: number; name: string } | null>(null);
  const [meal, setMeal] = useState<Meal>(defaultMeal());
  const [serv, setServ] = useState("1");

  const doLog = async () => {
    if (!logT) return;
    if (logT.kind === "meal") await logSavedMeal(logT.id, meal, day);
    else await logRecipe(logT.id, num(serv)!, meal, day);
    setLogT(null);
    toast(`Logged to ${MEAL_LABEL[meal]} · ${fmtDay(day)}`);
  };
  return (
    <ScreenContainer back title="Saved Meals" testID="recipes-screen"
      footer={tab === "recipes" ? <PrimaryButton testID="recipe-create-button" icon="plus" title="Create Recipe" onPress={() => router.push("/food/recipe-edit")} /> : undefined}>
      <Segmented testID="recipes-tabs" value={tab} onChange={setTab} options={[{ key: "meals", label: "Meals" }, { key: "recipes", label: "Recipes" }]} />
      {tab === "meals" ? (
        <View style={{ gap: space.sm }}>
          {data?.meals.length === 0 && <EmptyState illus="meal_plate" title="No saved meals" text={'Open any logged meal and tap "Save as reusable meal".'} />}
          {data?.meals.map((m) => (
            <SettingsRow key={m.id} testID={`saved-meal-${m.id}`} icon="bookmark" title={m.name} subtitle={`${Math.round(m.total.kcal)} kcal · ${round(m.total.protein, 0)} g protein · ${m.items.length} items`}
              onPress={() => setLogT({ kind: "meal", id: m.id, name: m.name })}
              right={<SecondaryButton small testID={`saved-meal-delete-${m.id}`} danger title="Delete" onPress={async () => { if (await confirm({ title: "Delete saved meal?", message: m.name, destructive: true })) await deleteSavedMeal(m.id); }} />} />
          ))}
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {data?.recipes.length === 0 && <EmptyState illus="pot" title="No recipes yet" text="Combine ingredients, set servings, and log portions." />}
          {data?.recipes.map((r) => (
            <View key={r.id} style={{ gap: 6 }}>
              <SettingsRow testID={`recipe-${r.id}`} illus="pot" title={r.name} subtitle={`${Math.round(r.perServing.kcal)} kcal / serving · ${r.servings} servings · ${r.count} ingredients`} onPress={() => router.push(`/food/recipe-edit?id=${r.id}`)} />
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <SecondaryButton small testID={`recipe-log-${r.id}`} icon="plus" title="Log serving" style={{ flex: 1 }} onPress={() => { setServ("1"); setLogT({ kind: "recipe", id: r.id, name: r.name }); }} />
                <SecondaryButton small danger testID={`recipe-delete-${r.id}`} title="Delete" style={{ flex: 1 }} onPress={async () => { if (await confirm({ title: "Delete recipe?", message: "Past log entries stay unchanged.", destructive: true })) await deleteRecipe(r.id); }} />
              </View>
            </View>
          ))}
        </View>
      )}
      <Sheet visible={!!logT} onClose={() => setLogT(null)} title={`Log ${logT?.name ?? ""}`} testID="log-saved-sheet">
        <Text style={{ color: colors.muted }}>{fmtDay(day)}</Text>
        <Chips testID="log-saved-meal" value={meal} onChange={setMeal} options={MEALS.map((x) => ({ key: x, label: MEAL_LABEL[x] }))} />
        {logT?.kind === "recipe" && <Field testID="log-recipe-servings" label="Servings" value={serv} onChangeText={setServ} keyboardType="decimal-pad" />}
        <PrimaryButton testID="log-saved-confirm" title="Log" disabled={logT?.kind === "recipe" && !(num(serv)! > 0)} onPress={doLog} />
      </Sheet>
    </ScreenContainer>
  );
}
