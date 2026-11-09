import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Card, DateNav, FadeInView, HeaderIcon, LoadingIndicator, NutritionProgress, PrimaryButton, ScreenContainer, SettingsRow, ThreeDIllustration, IconName } from "@/src/components/ui";
import { dayTotals } from "@/src/db/repo/nutrition";
import { getTargets } from "@/src/db/repo/settings";
import { dayKey, fmtDay, MEAL_LABEL, MEALS } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { makeStyles, space } from "@/src/theme";

const MEAL_ICON: Record<string, IconName> = { breakfast: "coffee", lunch: "food", dinner: "food-turkey", snacks: "food-apple" };

export default function FoodTab() {
  const s = useStyles();
  const router = useRouter();
  const [day, setDay] = useState(dayKey());
  const { data } = useQ(async () => ({ t: await dayTotals(day), targets: await getTargets() }), [day]);
  return (
    <ScreenContainer tab large title="Food" subtitle="Track your meals & macros" testID="food-screen"
      right={<HeaderIcon testID="food-ai-log-button" icon="text-box-search-outline" onPress={() => router.push(`/food/ai-log?day=${day}`)} />}
      footer={<PrimaryButton testID="food-log-food-button" icon="plus" title="Log Food" onPress={() => router.push(`/food/search?day=${day}`)} />}
    >
      <DateNav testID="food-date" day={day} onChange={setDay} label={fmtDay(day)} />
      {!data ? <LoadingIndicator /> : (
        <>
          <FadeInView>
            <Card style={{ overflow: "hidden" }}>
              <View style={{ position: "absolute", right: 4, top: -6 }}><ThreeDIllustration name="food_bowl" size={72} /></View>
              <Text style={[s.h2, { marginBottom: space.md }]}>Daily summary</Text>
              <NutritionProgress testID="food-nutrition" kcal={data.t.total.kcal} target={data.targets.calories} protein={data.t.total.protein} carbs={data.t.total.carbs} fat={data.t.total.fat} targets={data.targets} />
            </Card>
          </FadeInView>
          <Text style={s.h2}>Meals</Text>
          <View style={{ gap: space.sm }}>
            {MEALS.map((m) => (
              <SettingsRow key={m} testID={`food-meal-${m}`} icon={MEAL_ICON[m]} title={MEAL_LABEL[m]} subtitle={`${data.t.byMeal[m].count} item${data.t.byMeal[m].count === 1 ? "" : "s"} · P ${Math.round(data.t.byMeal[m].protein)}g`} value={`${Math.round(data.t.byMeal[m].kcal)} kcal`} onPress={() => router.push(`/food/meal?meal=${m}&day=${day}`)} />
            ))}
          </View>
          <Text style={s.h2}>Tools</Text>
          <View style={{ gap: space.sm }}>
            <SettingsRow testID="food-quick-add" icon="lightning-bolt" title="Quick Add" subtitle="Enter calories and macros directly" onPress={() => router.push(`/food/search?day=${day}&tab=quick`)} />
            <SettingsRow testID="food-text-log" icon="text-box-search-outline" title="Describe your meal" subtitle={'e.g. "2 roti, ek katori dal, 150g rice"'} onPress={() => router.push(`/food/ai-log?day=${day}`)} />
            <SettingsRow testID="food-recipes" illus="pot" title="Recipes & Saved Meals" subtitle="Build recipes and reuse combinations" onPress={() => router.push(`/food/recipes?day=${day}`)} />
            <SettingsRow testID="food-custom" illus="fruit_bowl" title="Create Custom Food" subtitle="Add a food from its label" onPress={() => router.push("/food/custom")} />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  h2: { fontSize: 18, fontWeight: "800", color: c.onSurface },
}));
