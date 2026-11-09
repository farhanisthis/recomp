import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  Chips,
  EmptyState,
  Field,
  Icon,
  PrimaryButton,
  ScreenContainer,
  Segmented,
  SettingsRow,
  useUI,
} from "@/src/components/ui";
import { addEntries, searchFoods } from "@/src/db/repo/nutrition";
import {
  dayKey,
  defaultMeal,
  fmtDay,
  MEAL_LABEL,
  MEALS,
  num,
  type Meal,
} from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function FoodSearch() {
  const p = useLocalSearchParams<{ day?: string; meal?: Meal; tab?: string }>();
  const day = p.day ?? dayKey();
  const meal = p.meal ?? defaultMeal();
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"search" | "quick">(
    p.tab === "quick" ? "quick" : "search",
  );
  const [q, setQ] = useState("");
  const { data, loading } = useQ(() => searchFoods(q), [q]);
  return (
    <ScreenContainer
      back
      title="Log Food"
      subtitle={`${MEAL_LABEL[meal]} · ${fmtDay(day)}`}
      testID="food-search-screen"
    >
      <Segmented
        testID="log-food-tabs"
        value={tab}
        onChange={setTab}
        options={[
          { key: "search", label: "Search" },
          { key: "quick", label: "Quick Add" },
        ]}
      />
      {tab === "search" ? (
        <>
          <Field
            testID="food-search-input"
            placeholder="Search for food (e.g. roti, chicken, dahi)"
            value={q}
            onChangeText={setQ}
            autoCorrect={false}
          />
          <View style={{ gap: space.sm }}>
            {!loading && data?.length === 0 && (
              <EmptyState
                illus="yogurt_bowl"
                title="No match in your food database"
                text="Create it as a custom food — it will be searchable offline."
                action={
                  <PrimaryButton
                    small
                    testID="search-create-custom"
                    title="Create Custom Food"
                    onPress={() =>
                      router.push(`/food/custom?name=${encodeURIComponent(q)}`)
                    }
                  />
                }
              />
            )}
            {data?.map((f) => (
              <SettingsRow
                key={f.id}
                testID={`food-result-${f.id}`}
                icon={f.is_custom ? "star-outline" : "food-apple-outline"}
                title={f.name}
                subtitle={`${Math.round(f.kcal)} kcal · P ${f.protein}g per 100 ${f.basis}${f.source ? " · " + f.source : ""}`}
                onPress={() =>
                  router.push(`/food/${f.id}?day=${day}&meal=${meal}`)
                }
                right={
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      router.push(`/food/${f.id}?day=${day}&meal=${meal}`)
                    }
                  >
                    <Icon name="plus-circle" color={colors.brand} size={26} />
                  </Pressable>
                }
              />
            ))}
          </View>
          <Pressable
            testID="search-describe-link"
            onPress={() => router.push(`/food/ai-log?day=${day}&meal=${meal}`)}
          >
            <Text
              style={{
                color: colors.brand,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Describe a whole meal instead
            </Text>
          </Pressable>
        </>
      ) : (
        <QuickAdd day={day} meal={meal} />
      )}
    </ScreenContainer>
  );
}

function QuickAdd({ day, meal: m0 }: { day: string; meal: Meal }) {
  const router = useRouter();
  const { toast } = useUI();
  const [meal, setMeal] = useState<Meal>(m0);
  const [f, setF] = useState({ name: "", kcal: "", p: "", c: "", fat: "" });
  const kcal = num(f.kcal);
  const bad = [f.p, f.c, f.fat].some(
    (x) => x.trim() !== "" && (num(x) == null || num(x)! < 0),
  );
  const save = async () => {
    await addEntries([
      {
        food_id: null,
        recipe_id: null,
        name: f.name.trim() || "Quick add",
        meal,
        day,
        quantity: 1,
        unit: "serving",
        grams: 0,
        kcal: kcal!,
        protein: num(f.p) ?? 0,
        carbs: num(f.c) ?? 0,
        fat: num(f.fat) ?? 0,
        source: "quick_add",
      },
    ]);
    toast("Added");
    router.back();
  };
  return (
    <View style={{ gap: space.md }}>
      <Chips
        testID="quick-meal"
        value={meal}
        onChange={setMeal}
        options={MEALS.map((x) => ({ key: x, label: MEAL_LABEL[x] }))}
      />
      <Field
        testID="quick-name-input"
        label="Label (optional)"
        value={f.name}
        onChangeText={(v) => setF({ ...f, name: v })}
        placeholder="e.g. Office samosa"
      />
      <Field
        testID="quick-kcal-input"
        label="Calories"
        value={f.kcal}
        onChangeText={(v) => setF({ ...f, kcal: v })}
        keyboardType="decimal-pad"
        suffix="kcal"
      />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Field
          testID="quick-protein-input"
          style={{ flex: 1 }}
          label="Protein"
          value={f.p}
          onChangeText={(v) => setF({ ...f, p: v })}
          keyboardType="decimal-pad"
          suffix="g"
        />
        <Field
          testID="quick-carbs-input"
          style={{ flex: 1 }}
          label="Carbs"
          value={f.c}
          onChangeText={(v) => setF({ ...f, c: v })}
          keyboardType="decimal-pad"
          suffix="g"
        />
        <Field
          testID="quick-fat-input"
          style={{ flex: 1 }}
          label="Fat"
          value={f.fat}
          onChangeText={(v) => setF({ ...f, fat: v })}
          keyboardType="decimal-pad"
          suffix="g"
        />
      </View>
      <PrimaryButton
        testID="quick-add-save"
        title="Add Food"
        disabled={kcal == null || kcal < 0 || kcal > 10000 || bad}
        onPress={save}
      />
    </View>
  );
}
