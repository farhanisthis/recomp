// Timestamp-based rest timer persisted in meta so it survives app suspension/restart.
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getMeta, setMeta } from "../db/repo/settings";
import { fmtDuration, num } from "../lib/calc";
import { makeStyles, radius, space, useTheme } from "../theme";
import { Field, Icon, ProgressBar } from "./ui";

type State = { end: number | null; remaining: number | null; total: number };

export async function startRest(sec: number) {
  await setMeta("rest_total", String(sec), false);
  await setMeta("rest_remaining", null, false);
  await setMeta("rest_end_at", String(Date.now() + sec * 1000));
}

export function RestTimer() {
  const s = useStyles();
  const { colors } = useTheme();
  const [st, setSt] = useState<State>({ end: null, remaining: null, total: 90 });
  const [now, setNow] = useState(Date.now());
  const [custom, setCustom] = useState("");
  const fired = useRef(false);

  const load = async () => {
    const end = await getMeta("rest_end_at");
    const rem = await getMeta("rest_remaining");
    const tot = await getMeta("rest_total");
    setSt({ end: end ? Number(end) : null, remaining: rem ? Number(rem) : null, total: tot ? Number(tot) : 90 });
  };
  useEffect(() => {
    load();
    const t = setInterval(() => { setNow(Date.now()); }, 250);
    const r = setInterval(load, 1500);
    return () => { clearInterval(t); clearInterval(r); };
  }, []);

  const left = st.remaining != null ? st.remaining : st.end ? Math.max(0, (st.end - now) / 1000) : 0;
  const running = st.end != null && st.remaining == null && left > 0;
  useEffect(() => {
    if (st.end && st.remaining == null && left <= 0 && !fired.current) {
      fired.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    if (left > 0) fired.current = false;
  }, [left, st]);

  const start = async (sec: number) => { await startRest(sec); load(); };
  const pause = async () => { await setMeta("rest_remaining", String(left), false); await setMeta("rest_end_at", null); load(); };
  const resume = async () => { await setMeta("rest_end_at", String(Date.now() + (st.remaining ?? 0) * 1000), false); await setMeta("rest_remaining", null); load(); };
  const skip = async () => { await setMeta("rest_end_at", null, false); await setMeta("rest_remaining", null); load(); };
  const active = st.end != null || st.remaining != null;

  return (
    <View style={s.box} testID="rest-timer">
      <View style={s.row}>
        <Icon name="timer-outline" color={colors.brand} size={26} />
        <Text style={s.time} testID="rest-timer-display">{active ? (left > 0 ? fmtDuration(left) : "Rest done!") : "Rest"}</Text>
        {active && left > 0 && (
          <Pressable testID={running ? "rest-pause" : "rest-resume"} onPress={running ? pause : resume} style={s.iconBtn}><Icon name={running ? "pause" : "play"} color={colors.onBrandPrimary} /></Pressable>
        )}
        {active && <Pressable testID="rest-skip" onPress={skip} style={[s.iconBtn, { backgroundColor: colors.surfaceTertiary }]}><Icon name="skip-next" /></Pressable>}
      </View>
      {active && <ProgressBar value={left} max={st.total} color={colors.brand} />}
      <View style={s.row}>
        {[60, 90, 120, 180].map((x) => (
          <Pressable key={x} testID={`rest-start-${x}`} onPress={() => start(x)} style={s.chip}><Text style={s.chipT}>{x}s</Text></Pressable>
        ))}
        <Field testID="rest-custom-input" style={{ flex: 1 }} value={custom} onChangeText={setCustom} placeholder="sec" keyboardType="number-pad"
          onSubmitEditing={() => { const n = num(custom); if (n && n > 0 && n <= 3600) start(n); }} returnKeyType="go" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  time: { flex: 1, fontSize: 26, fontWeight: "900", color: c.onSurface },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  chip: { height: 40, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: c.brandTertiary, justifyContent: "center" },
  chipT: { fontWeight: "700", color: c.onBrandTertiary },
}));
