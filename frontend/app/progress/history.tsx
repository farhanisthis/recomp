import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { EmptyState, LoadingIndicator, PrimaryButton, ScreenContainer, Segmented, SettingsRow } from "@/src/components/ui";
import { listMeasurements, MEASURE_FIELDS } from "@/src/db/repo/body";
import { getUnits } from "@/src/db/repo/settings";
import { fmtDayLong, fmtW, lOut, round } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space } from "@/src/theme";

export default function MeasureHistory() {
  const router = useRouter();
  const [tab, setTab] = useState<"weight" | "fat" | "other">("weight");
  const { data } = useQ(async () => ({ list: await listMeasurements(), units: await getUnits() }));
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const { list, units } = data;
  const rows = list.filter((m) => (tab === "weight" ? m.weight_kg != null : tab === "fat" ? m.body_fat != null : MEASURE_FIELDS.some((f) => m[f] != null)));
  return (
    <ScreenContainer back title="Measurement History" testID="measure-history-screen"
      footer={<PrimaryButton testID="measure-history-add" icon="plus" title="Log Measurement" onPress={() => router.push("/progress/measure")} />}>
      <Segmented testID="measure-history-tabs" value={tab} onChange={setTab} options={[{ key: "weight", label: "Weight" }, { key: "fat", label: "Body Fat" }, { key: "other", label: "Other" }]} />
      {rows.length === 0 && <EmptyState illus="tape" title="Nothing logged yet" />}
      <View style={{ gap: space.sm }}>
        {rows.map((m, i) => {
          const prev = rows[i + 1];
          const diff = tab === "weight" && prev ? m.weight_kg! - prev.weight_kg! : tab === "fat" && prev ? m.body_fat! - prev.body_fat! : null;
          return (
            <SettingsRow key={m.id} testID={`measure-row-${m.id}`} icon="calendar-blank-outline" title={fmtDayLong(m.day)}
              subtitle={tab === "other" ? MEASURE_FIELDS.filter((f) => m[f] != null).map((f) => `${f} ${round(lOut(m[f], units)!, 1)}`).join(" · ") : diff != null ? `${diff > 0 ? "+" : ""}${tab === "weight" ? fmtW(diff, units) : round(diff, 1) + "%"} vs previous` : m.notes ?? undefined}
              value={tab === "weight" ? fmtW(m.weight_kg, units) : tab === "fat" ? `${m.body_fat}%` : undefined}
              onPress={() => router.push(`/progress/measure?id=${m.id}`)} />
          );
        })}
      </View>
    </ScreenContainer>
  );
}
