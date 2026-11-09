import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { MiniBars } from "@/src/components/charts";
import { Card, DateNav, EmptyState, Field, Icon, PrimaryButton, ScreenContainer, SecondaryButton, SettingsRow, ThreeDIllustration, useUI } from "@/src/components/ui";
import { addWater, deleteWater, waterForDay, waterRange } from "@/src/db/repo/nutrition";
import { getTargets } from "@/src/db/repo/settings";
import { addDays, dayKey, fmtDay, num, parseDay, WEEKDAYS } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function Water() {
  const p = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(p.day ?? dayKey());
  const { colors } = useTheme();
  const { confirm } = useUI();
  const [custom, setCustom] = useState("");
  const { data } = useQ(async () => {
    const list = await waterForDay(day);
    const from = addDays(day, -6);
    const r = await waterRange(from, day);
    const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
    return { list, total: list.reduce((a, x) => a + x.ml, 0), goal: (await getTargets()).water_ml, week: days.map((d) => r.find((x) => x.day === d)?.ml ?? null), labels: days.map((d) => WEEKDAYS[parseDay(d).getDay()][0]) };
  }, [day]);
  const c = num(custom);
  return (
    <ScreenContainer back title="Water" testID="water-screen">
      <DateNav testID="water-date" day={day} onChange={setDay} label={fmtDay(day)} />
      <View style={{ alignItems: "center", gap: 4 }}>
        <ThreeDIllustration name="water_bottle" size={150} style={{ height: 120 }} />
        <Text style={{ fontSize: 34, fontWeight: "900", color: colors.onSurface }} testID="water-total">{Math.round(data?.total ?? 0).toLocaleString()} ml</Text>
        <Text style={{ color: colors.muted }}>/ {data?.goal.toLocaleString()} ml goal</Text>
      </View>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {[250, 500, 750].map((ml) => <SecondaryButton key={ml} testID={`water-add-${ml}`} title={`+${ml} ml`} onPress={() => addWater(day, ml)} style={{ flex: 1, paddingHorizontal: 4 }} />)}
      </View>
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-end" }}>
        <Field testID="water-custom-input" style={{ flex: 1 }} label="Custom amount" value={custom} onChangeText={setCustom} keyboardType="number-pad" suffix="ml" />
        <PrimaryButton testID="water-custom-add" title="Add" disabled={!c || c <= 0 || c > 5000} onPress={() => { addWater(day, c!); setCustom(""); }} />
      </View>
      <Card><Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>Last 7 days</Text>
        {data && <MiniBars testID="water-week-bars" values={data.week} max={data.goal} color={colors.water} labels={data.labels} />}
      </Card>
      <Text style={{ fontWeight: "800", fontSize: 17, color: colors.onSurface }}>Entries</Text>
      {data?.list.length === 0 && <EmptyState illus="water_bottle" title="No water logged" />}
      {data?.list.map((w) => (
        <SettingsRow key={w.id} testID={`water-entry-${w.id}`} icon="water" color={colors.water} title={`${w.ml} ml`} subtitle={new Date(w.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          onPress={async () => { if (await confirm({ title: "Delete this entry?", message: `${w.ml} ml`, destructive: true, confirmText: "Delete" })) await deleteWater(w.id); }}
          right={<Icon name="delete-outline" color={colors.muted} />} />
      ))}
    </ScreenContainer>
  );
}
