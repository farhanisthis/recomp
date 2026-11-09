import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, DateNav, Field, Icon, PrimaryButton, ScreenContainer, Segmented, SettingsRow, useUI } from "@/src/components/ui";
import { checkinFor, deleteSleep, saveCheckin, saveSleep, setSteps, sleepFor, sleepHistory, stepsFor, stepsHistory } from "@/src/db/repo/body";
import { getTargets } from "@/src/db/repo/settings";
import { dayKey, fmtDay, fmtMinutes, isHHMM, num, sleepMinutes } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

type Tab = "steps" | "sleep" | "checkin";
export default function Activity() {
  const p = useLocalSearchParams<{ day?: string; tab?: Tab }>();
  const [day, setDay] = useState(p.day ?? dayKey());
  const [tab, setTab] = useState<Tab>(p.tab ?? "steps");
  return (
    <ScreenContainer back title="Daily Activity" testID="activity-screen">
      <DateNav testID="activity-date" day={day} onChange={setDay} label={fmtDay(day)} />
      <Segmented testID="activity-tabs" value={tab} onChange={setTab} options={[{ key: "steps", label: "Steps" }, { key: "sleep", label: "Sleep" }, { key: "checkin", label: "Check-in" }]} />
      {tab === "steps" ? <Steps day={day} /> : tab === "sleep" ? <SleepTab day={day} /> : <CheckinTab day={day} />}
    </ScreenContainer>
  );
}

function Steps({ day }: { day: string }) {
  const { colors } = useTheme();
  const { toast } = useUI();
  const { data } = useQ(async () => ({ steps: await stepsFor(day), goal: (await getTargets()).steps, hist: await stepsHistory() }), [day]);
  const [v, setV] = useState("");
  useEffect(() => setV(data?.steps != null ? String(data.steps) : ""), [data?.steps, day]);
  const n = num(v);
  return (
    <>
      <Card style={{ gap: space.md }}>
        <Text style={{ color: colors.muted }}>Manual entry — goal {data?.goal.toLocaleString()} steps</Text>
        <Field testID="steps-input" label="Steps for this day" value={v} onChangeText={setV} keyboardType="number-pad" suffix="steps" />
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <PrimaryButton testID="steps-save" title="Save" style={{ flex: 1 }} disabled={n == null || n < 0 || n > 200000 || !Number.isInteger(n)} onPress={async () => { await setSteps(day, n!); toast("Steps saved"); }} />
          {data?.steps != null && <PrimaryButton testID="steps-clear" title="Clear" style={{ flex: 1 }} onPress={() => setSteps(day, null)} />}
        </View>
      </Card>
      <Text style={{ fontWeight: "800", fontSize: 17, color: colors.onSurface }}>History</Text>
      {data?.hist.map((h) => <SettingsRow key={h.day} testID={`steps-hist-${h.day}`} icon="shoe-print" color={colors.steps} title={h.steps.toLocaleString()} subtitle={fmtDay(h.day)} />)}
    </>
  );
}

function SleepTab({ day }: { day: string }) {
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const { data } = useQ(async () => ({ cur: await sleepFor(day), hist: await sleepHistory() }), [day]);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const [quality, setQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (data?.cur) { setBed(data.cur.bed_at); setWake(data.cur.wake_at); setQuality(data.cur.quality); setNotes(data.cur.notes ?? ""); }
    else { setBed("23:00"); setWake("07:00"); setQuality(null); setNotes(""); }
  }, [data?.cur, day]);
  const valid = isHHMM(bed) && isHHMM(wake);
  const mins = valid ? sleepMinutes(bed, wake) : 0;
  return (
    <>
      <Card style={{ gap: space.md }}>
        <Text style={{ color: colors.muted }}>Night ending on this morning ({fmtDay(day)})</Text>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Field testID="sleep-bed-input" style={{ flex: 1 }} label="Bedtime (HH:MM)" value={bed} onChangeText={setBed} placeholder="23:00" />
          <Field testID="sleep-wake-input" style={{ flex: 1 }} label="Wake-up (HH:MM)" value={wake} onChangeText={setWake} placeholder="07:00" />
        </View>
        <Text style={{ fontWeight: "800", fontSize: 20, color: colors.onSurface }} testID="sleep-duration">{valid ? fmtMinutes(mins) : "Enter times as HH:MM"}</Text>
        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
          <Text style={{ color: colors.onSurface, fontWeight: "600", marginRight: 8 }}>Quality</Text>
          {[1, 2, 3, 4, 5].map((q) => (
            <Pressable key={q} testID={`sleep-quality-${q}`} onPress={() => setQuality(quality === q ? null : q)} hitSlop={4} style={{ padding: 4 }}>
              <Icon name={quality != null && q <= quality ? "star" : "star-outline"} color={colors.carbs} size={26} />
            </Pressable>
          ))}
        </View>
        <Field testID="sleep-notes-input" label="Notes (optional)" value={notes} onChangeText={setNotes} />
        <PrimaryButton testID="sleep-save" title={data?.cur ? "Update Sleep" : "Save Sleep"} disabled={!valid} onPress={async () => {
          await saveSleep(data?.cur?.id ?? null, { day, bed_at: bed, wake_at: wake, minutes: mins, quality, notes: notes || null }); toast("Sleep saved");
        }} />
      </Card>
      <Text style={{ fontWeight: "800", fontSize: 17, color: colors.onSurface }}>History</Text>
      {data?.hist.map((h) => (
        <SettingsRow key={h.id} testID={`sleep-hist-${h.id}`} icon="sleep" color={colors.sleep} title={fmtMinutes(h.minutes)} subtitle={`${fmtDay(h.day)} · ${h.bed_at} → ${h.wake_at}${h.quality ? ` · ${h.quality}/5` : ""}`}
          right={<Pressable testID={`sleep-delete-${h.id}`} hitSlop={8} onPress={async () => { if (await confirm({ title: "Delete sleep entry?", destructive: true, confirmText: "Delete" })) await deleteSleep(h.id); }}><Icon name="delete-outline" color={colors.muted} /></Pressable>} />
      ))}
    </>
  );
}

function CheckinTab({ day }: { day: string }) {
  const { colors } = useTheme();
  const { toast } = useUI();
  const { data } = useQ(() => checkinFor(day), [day]);
  const [c, setC] = useState({ energy: null as number | null, mood: null as number | null, soreness: null as number | null, notes: "" });
  useEffect(() => setC({ energy: data?.energy ?? null, mood: data?.mood ?? null, soreness: data?.soreness ?? null, notes: data?.notes ?? "" }), [data, day]);
  const Scale = ({ k, label }: { k: "energy" | "mood" | "soreness"; label: string }) => (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700", color: colors.onSurface }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} testID={`checkin-${k}-${n}`} onPress={() => setC({ ...c, [k]: n })}
            style={{ flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c[k] === n ? colors.brandPrimary : colors.surfaceTertiary }}>
            <Text style={{ fontWeight: "800", color: c[k] === n ? colors.onBrandPrimary : colors.onSurfaceTertiary }}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
  return (
    <Card style={{ gap: space.md }}>
      <Scale k="energy" label="Energy" />
      <Scale k="mood" label="Mood" />
      <Scale k="soreness" label="Soreness" />
      <Field testID="checkin-notes" label="Notes" value={c.notes} onChangeText={(v) => setC({ ...c, notes: v })} />
      <PrimaryButton testID="checkin-save" title="Save Check-in" onPress={async () => { await saveCheckin({ day, ...c, notes: c.notes || null }); toast("Check-in saved"); }} />
    </Card>
  );
}
