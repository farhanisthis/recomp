// SVG charts: dual-axis line chart (weight + body fat), single line, mini bars.
import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme";
import { fmtShort, parseDay } from "../lib/calc";

type Pt = { day: string; v: number };
const H = 200, PADL = 36, PADR = 36, PADT = 12, PADB = 24;

function scale(pts: Pt[]) {
  const vs = pts.map((p) => p.v);
  let min = Math.min(...vs), max = Math.max(...vs);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1;
  return { min: min - pad, max: max + pad };
}

export function ProgressChart({ a, b, aLabel, bLabel, aUnit, bUnit, testID }: { a: Pt[]; b?: Pt[]; aLabel: string; bLabel?: string; aUnit: string; bUnit?: string; testID: string }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const all = [...a, ...(b ?? [])];
  if (!all.length) return null;
  const times = all.map((p) => parseDay(p.day).getTime());
  let t0 = Math.min(...times), t1 = Math.max(...times);
  if (t0 === t1) { t0 -= 86400000; t1 += 86400000; }
  const innerW = Math.max(1, w - PADL - PADR);
  const x = (d: string) => PADL + ((parseDay(d).getTime() - t0) / (t1 - t0)) * innerW;
  const sa = a.length ? scale(a) : null, sb = b?.length ? scale(b) : null;
  const y = (v: number, s: { min: number; max: number }) => PADT + (1 - (v - s.min) / (s.max - s.min)) * (H - PADT - PADB);
  const ticks = [0, 0.5, 1];
  return (
    <View testID={testID} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: "row", gap: 16, marginBottom: 8 }}>
        <Legend color={colors.weightLine} label={`${aLabel} (${aUnit})`} />
        {bLabel && <Legend color={colors.fatLine} label={`${bLabel} (${bUnit})`} />}
      </View>
      {w > 0 && (
        <Svg width={w} height={H}>
          {ticks.map((t) => {
            const yy = PADT + t * (H - PADT - PADB);
            return (
              <React.Fragment key={t}>
                <Line x1={PADL} x2={w - PADR} y1={yy} y2={yy} stroke={colors.divider} strokeWidth={1} />
                {sa && <SvgText x={PADL - 6} y={yy + 4} fontSize={10} fill={colors.weightLine} textAnchor="end">{(sa.max - t * (sa.max - sa.min)).toFixed(1)}</SvgText>}
                {sb && <SvgText x={w - PADR + 6} y={yy + 4} fontSize={10} fill={colors.fatLine} textAnchor="start">{(sb.max - t * (sb.max - sb.min)).toFixed(1)}</SvgText>}
              </React.Fragment>
            );
          })}
          {sa && <Series pts={a} x={x} y={(v) => y(v, sa)} color={colors.weightLine} />}
          {sb && b && <Series pts={b} x={x} y={(v) => y(v, sb)} color={colors.fatLine} />}
          <SvgText x={PADL} y={H - 6} fontSize={10} fill={colors.muted}>{fmtShort(new Date(t0).toISOString().slice(0, 10) === "" ? a[0].day : dayOf(t0))}</SvgText>
          <SvgText x={w - PADR} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="end">{fmtShort(dayOf(t1))}</SvgText>
        </Svg>
      )}
    </View>
  );
}
function dayOf(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function Series({ pts, x, y, color }: { pts: Pt[]; x: (d: string) => number; y: (v: number) => number; color: string }) {
  const sorted = [...pts].sort((p, q) => p.day.localeCompare(q.day));
  return (
    <>
      {sorted.length > 1 && <Polyline points={sorted.map((p) => `${x(p.day)},${y(p.v)}`).join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />}
      {sorted.map((p, i) => <Circle key={i} cx={x(p.day)} cy={y(p.v)} r={3.5} fill={color} />)}
    </>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function MiniBars({ values, max, color, labels, height = 80, testID }: { values: (number | null)[]; max: number; color: string; labels?: string[]; height?: number; testID: string }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const n = values.length;
  const bw = n ? Math.min(22, (w / n) * 0.55) : 0;
  return (
    <View testID={testID} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height + 16}>
          {values.map((v, i) => {
            const cx = (w / n) * (i + 0.5);
            const h = v == null ? 3 : Math.max(3, (Math.min(v, max * 1.2) / (max * 1.2 || 1)) * height);
            return (
              <React.Fragment key={i}>
                <Rect x={cx - bw / 2} y={height - h} width={bw} height={h} rx={bw / 3} fill={v == null ? colors.surfaceTertiary : color} />
                {labels && <SvgText x={cx} y={height + 13} fontSize={10} fill={colors.muted} textAnchor="middle">{labels[i]}</SvgText>}
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
