import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, EmptyState, Icon, LoadingIndicator, ScreenContainer, SettingsRow } from "@/src/components/ui";
import { listHistory } from "@/src/db/repo/workout";
import { dayKey, fmtDay, fmtDuration, parseDay } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export default function History() {
  const router = useRouter();
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState<string | null>(null);
  const { data } = useQ(() => listHistory(1000));
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const days = new Set(data.map((h) => h.day));
  const first = month.getDay();
  const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  const key = (d: number) => dayKey(new Date(month.getFullYear(), month.getMonth(), d));
  const list = sel ? data.filter((h) => h.day === sel) : data.filter((h) => { const d = parseDay(h.day); return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear(); });
  const today = dayKey();
  return (
    <ScreenContainer back title="Workout History" testID="history-screen">
      <Card style={{ gap: space.sm }} testID="history-calendar">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable testID="history-prev-month" hitSlop={8} onPress={() => { setSel(null); setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }}><Icon name="chevron-left" /></Pressable>
          <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
          <Pressable testID="history-next-month" hitSlop={8} onPress={() => { setSel(null); setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }}><Icon name="chevron-right" /></Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <Text key={i} style={{ width: "14.28%", textAlign: "center", color: colors.muted, fontSize: 12, fontWeight: "700" }}>{d}</Text>)}
          {cells.map((d, i) => {
            const k = d ? key(d) : "";
            const has = d && days.has(k);
            const on = sel === k;
            return (
              <Pressable key={i} disabled={!d} testID={d ? `history-day-${k}` : undefined} onPress={() => setSel(on ? null : k)} style={{ width: "14.28%", height: 40, alignItems: "center", justifyContent: "center" }}>
                {!!d && (
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.brandPrimary : has ? colors.brandSecondary : "transparent", borderWidth: k === today ? 1.5 : 0, borderColor: colors.brand }}>
                    <Text style={{ fontWeight: has ? "800" : "500", color: on ? colors.onBrandPrimary : colors.onSurface }}>{d}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Text style={{ fontWeight: "800", fontSize: 17, color: colors.onSurface }}>{sel ? fmtDay(sel) : "This month"} · {list.length} workout{list.length === 1 ? "" : "s"}</Text>
      {list.length === 0 && <EmptyState illus="calendar" title="No workouts" text="Completed sessions show up here." />}
      <View style={{ gap: space.sm }}>
        {list.map((h) => (
          <SettingsRow key={h.id} testID={`history-item-${h.id}`} icon="check-circle" color={colors.success} title={h.name}
            subtitle={`${fmtDay(h.day)} · ${fmtDuration(h.duration_sec ?? 0)} · ${h.set_count} sets · ${Math.round(h.volume ?? 0)} kg vol${h.pr_count ? ` · ${h.pr_count} PR` : ""}`}
            onPress={() => router.push(`/workout/session/${h.id}`)} />
        ))}
      </View>
    </ScreenContainer>
  );
}
