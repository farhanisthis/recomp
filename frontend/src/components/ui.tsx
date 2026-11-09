import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { ILLUS, IllusName } from "../assets";
import { usesNativeTabs } from "../navigation";
import { makeStyles, radius, space, useTheme } from "../theme";

export type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <MaterialDesignIcons name={name} size={size} color={color ?? colors.onSurface} />;
}

export function ThreeDIllustration({ name, size = 120, style }: { name: IllusName; size?: number; style?: any }) {
  return <Image source={ILLUS[name]} style={[{ width: size, height: size }, style]} contentFit="contain" transition={150} />;
}

// ---------- Screen container ----------
type ScreenProps = {
  title?: string; subtitle?: string; back?: boolean; right?: React.ReactNode; children: React.ReactNode;
  scroll?: boolean; footer?: React.ReactNode; tab?: boolean; large?: boolean; testID?: string; onBack?: () => void;
};
export function ScreenContainer({ title, subtitle, back, right, children, scroll = true, footer, tab, large, testID, onBack }: ScreenProps) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottom = tab ? (usesNativeTabs ? insets.bottom + space.lg : space.xl) : insets.bottom + space.lg;
  const content = <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>{children}</View>;
  return (
    <View style={s.root} testID={testID}>
      {(title || back) && (
        <View style={[s.header, { paddingTop: insets.top + space.sm }]}>
          {back && (
            <Pressable testID="header-back-button" hitSlop={10} onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace("/"))} style={s.backBtn}>
              <Icon name="chevron-left" size={28} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            {!!title && <Text style={[large ? s.titleLarge : s.title]} numberOfLines={1}>{title}</Text>}
            {!!subtitle && <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
          <View style={s.headerRight}>{right}</View>
        </View>
      )}
      {scroll ? (
        <KeyboardAwareScrollView
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: title || back ? space.sm : insets.top + space.md, paddingBottom: footer ? space.lg : bottom }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </KeyboardAwareScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer && <View style={[s.footer, { paddingBottom: tab ? bottom - space.sm : insets.bottom + space.md }]}>{footer}</View>}
    </View>
  );
}

export function HeaderIcon({ icon, onPress, testID }: { icon: IconName; onPress: () => void; testID: string }) {
  const s = useStyles();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [s.headerIcon, pressed && { opacity: 0.6 }]} hitSlop={6}>
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

// ---------- Text ----------
export function H2({ children, style }: { children: React.ReactNode; style?: any }) {
  const s = useStyles();
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function Body({ children, muted, style, numberOfLines, testID }: { children: React.ReactNode; muted?: boolean; style?: any; numberOfLines?: number; testID?: string }) {
  const s = useStyles();
  return <Text testID={testID} numberOfLines={numberOfLines} style={[s.body, muted && s.muted, style]}>{children}</Text>;
}

// ---------- Card ----------
export function Card({ children, style, onPress, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; testID?: string }) {
  const s = useStyles();
  if (onPress)
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}>
        {children}
      </Pressable>
    );
  return <View testID={testID} style={[s.card, style]}>{children}</View>;
}
export function FadeInView({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  return <Animated.View entering={FadeInDown.delay(delay).duration(350)} style={style}>{children}</Animated.View>;
}

// ---------- Buttons ----------
type BtnProps = { title: string; onPress: () => void; icon?: IconName; disabled?: boolean; loading?: boolean; testID: string; style?: any; small?: boolean; danger?: boolean };
export function PrimaryButton({ title, onPress, icon, disabled, loading, testID, style, small }: BtnProps) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSmall, (disabled || loading) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.97 }] }, style]}>
      {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
        <>
          {icon && <Icon name={icon} size={small ? 16 : 20} color={colors.onBrandPrimary} />}
          <Text style={[s.btnText, small && { fontSize: 14 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
export function SecondaryButton({ title, onPress, icon, disabled, testID, style, small, danger }: BtnProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const c = danger ? colors.error : colors.onBrandSecondary;
  return (
    <Pressable testID={testID} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, s.btn2, small && s.btnSmall, disabled && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.97 }] }, style]}>
      {icon && <Icon name={icon} size={small ? 16 : 20} color={c} />}
      <Text style={[s.btnText, { color: c }, small && { fontSize: 14 }]}>{title}</Text>
    </Pressable>
  );
}

// ---------- Progress ----------
export function ProgressBar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.surfaceTertiary, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}
export function Ring({ value, max, size = 120, stroke = 12, color, children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceTertiary} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color ?? colors.brand} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </Svg>
      {children}
    </View>
  );
}
export function MacroIndicator({ label, value, target, color, icon, testID }: { label: string; value: number; target: number; color: string; icon: IconName; testID: string }) {
  const s = useStyles();
  return (
    <View style={{ gap: 4 }} testID={testID}>
      <View style={s.rowBetween}>
        <View style={s.row}>
          <Icon name={icon} size={16} color={color} />
          <Text style={s.macroLabel}>{label}</Text>
        </View>
        <Text style={s.macroVal}>{Math.round(value)} / {target} g</Text>
      </View>
      <ProgressBar value={value} max={target} color={color} />
    </View>
  );
}
export function NutritionProgress({ kcal, target, protein, carbs, fat, targets, testID }: { kcal: number; target: number; protein: number; carbs: number; fat: number; targets: { protein: number; carbs: number; fat: number }; testID: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const remaining = Math.round(target - kcal);
  return (
    <View style={s.row} testID={testID}>
      <Ring value={kcal} max={target} size={124} stroke={12}>
        <Text style={s.ringBig} testID={`${testID}-kcal`}>{Math.round(kcal)}</Text>
        <Text style={s.caption}>/ {target} kcal</Text>
      </Ring>
      <View style={{ flex: 1, gap: space.sm, marginLeft: space.lg }}>
        <View style={s.pill}>
          <Icon name="fire" size={14} color={colors.brand} />
          <Text style={s.pillText}>{remaining >= 0 ? `${remaining} kcal remaining` : `${-remaining} kcal over`}</Text>
        </View>
        <MacroIndicator label="Protein" value={protein} target={targets.protein} color={colors.protein} icon="arm-flex" testID={`${testID}-protein`} />
        <MacroIndicator label="Carbs" value={carbs} target={targets.carbs} color={colors.carbs} icon="barley" testID={`${testID}-carbs`} />
        <MacroIndicator label="Fat" value={fat} target={targets.fat} color={colors.fat} icon="water-outline" testID={`${testID}-fat`} />
      </View>
    </View>
  );
}

// ---------- Chips / segmented ----------
export function Chips<T extends string>({ options, value, onChange, testID }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; testID: string }) {
  const s = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0, marginHorizontal: -space.lg }}
      contentInset={{ left: 0 }}>
      <View style={{ width: space.lg - space.sm }} />
      {options.map((o) => (
        <Pressable key={o.key} testID={`${testID}-${o.key}`} onPress={() => onChange(o.key)} style={[s.chip, value === o.key && s.chipOn]}>
          <Text style={[s.chipText, value === o.key && s.chipTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
      <View style={{ width: space.lg - space.sm }} />
    </ScrollView>
  );
}
export function Segmented<T extends string>({ options, value, onChange, testID }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; testID: string }) {
  const s = useStyles();
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={o.key} testID={`${testID}-${o.key}`} onPress={() => onChange(o.key)} style={[s.segItem, value === o.key && s.segOn]}>
          <Text style={[s.segText, value === o.key && s.chipTextOn]} numberOfLines={1}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- Inputs ----------
export function Field({ label, suffix, error, style, ...p }: TextInputProps & { label?: string; suffix?: string; error?: string | null }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {!!label && <Text style={s.fieldLabel}>{label}</Text>}
      <View style={[s.input, !!error && { borderColor: colors.error }]}>
        <TextInput placeholderTextColor={colors.muted} style={s.inputText} {...p} />
        {!!suffix && <Text style={s.muted}>{suffix}</Text>}
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
export const MeasurementInput = Field;

// ---------- Rows ----------
export function SettingsRow({ icon, illus, title, subtitle, value, onPress, testID, right, color }: {
  icon?: IconName; illus?: IllusName; title: string; subtitle?: string; value?: string; onPress?: () => void; testID: string; right?: React.ReactNode; color?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.listRow, pressed && { opacity: 0.7 }]}>
      {illus ? <ThreeDIllustration name={illus} size={40} /> : icon ? (
        <View style={s.rowIcon}><Icon name={icon} size={20} color={color ?? colors.brand} /></View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.caption} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={s.rowValue}>{value}</Text>}
      {right}
      {onPress && !right && <Icon name="chevron-right" size={20} color={colors.muted} />}
    </Pressable>
  );
}
export const FoodListItem = SettingsRow;
export const ExerciseListItem = SettingsRow;

export function StatSummary({ items, testID }: { items: { label: string; value: string; icon?: IconName; color?: string }[]; testID: string }) {
  const s = useStyles();
  return (
    <Card style={s.statRow} testID={testID}>
      {items.map((it, i) => (
        <View key={it.label} style={[s.statCell, i > 0 && s.statDivider]}>
          {it.icon && <Icon name={it.icon} size={20} color={it.color} />}
          <Text style={s.statVal} numberOfLines={1} testID={`${testID}-${i}`}>{it.value}</Text>
          <Text style={s.caption} numberOfLines={1}>{it.label}</Text>
        </View>
      ))}
    </Card>
  );
}

export function EmptyState({ illus = "clipboard", title, text, action }: { illus?: IllusName; title: string; text?: string; action?: React.ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.empty} testID="empty-state">
      <ThreeDIllustration name={illus} size={96} />
      <Text style={s.rowTitle}>{title}</Text>
      {!!text && <Text style={[s.caption, { textAlign: "center" }]}>{text}</Text>}
      {action}
    </View>
  );
}
export function LoadingIndicator() {
  const { colors } = useTheme();
  return <View style={{ padding: space.xxl, alignItems: "center" }}><ActivityIndicator color={colors.brand} /></View>;
}

export function DateNav({ day, onChange, label, testID = "date-nav" }: { day: string; onChange: (d: string) => void; label: string; testID?: string }) {
  const s = useStyles();
  return (
    <View style={s.dateNav}>
      <Pressable testID={`${testID}-prev`} onPress={() => onChange(shift(day, -1))} hitSlop={8} style={s.dateBtn}><Icon name="chevron-left" /></Pressable>
      <Text style={s.rowTitle} testID={`${testID}-label`}>{label}</Text>
      <Pressable testID={`${testID}-next`} onPress={() => onChange(shift(day, 1))} hitSlop={8} style={s.dateBtn}><Icon name="chevron-right" /></Pressable>
    </View>
  );
}
function shift(k: string, n: number) {
  const [y, m, d] = k.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// ---------- Bottom sheet ----------
export function Sheet({ visible, onClose, title, children, testID }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; testID?: string }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose} testID={`${testID ?? "sheet"}-backdrop`} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]} testID={testID}>
        <View style={s.grabber} />
        {!!title && <Text style={[s.h2, { marginBottom: space.md }]}>{title}</Text>}
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 560 }} contentContainerStyle={{ gap: space.md }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

// ---------- Confirm + toast (global) ----------
type ConfirmOpts = { title: string; message?: string; confirmText?: string; destructive?: boolean };
const UICtx = createContext<{ confirm: (o: ConfirmOpts) => Promise<boolean>; toast: (m: string) => void }>({ confirm: async () => false, toast: () => {} });
export const useUI = () => useContext(UICtx);
export function UIProvider({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);
  const timer = useRef<any>(null);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((res) => { resolver.current = res; setOpts(o); }), []);
  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2400);
  }, []);
  const done = (v: boolean) => { resolver.current?.(v); setOpts(null); };
  return (
    <UICtx.Provider value={{ confirm, toast }}>
      {children}
      <Modal visible={!!opts} transparent animationType="fade" onRequestClose={() => done(false)}>
        <View style={s.dialogWrap}>
          <View style={s.dialog} testID="confirm-dialog">
            <Text style={s.h2}>{opts?.title}</Text>
            {!!opts?.message && <Text style={[s.body, s.muted]}>{opts.message}</Text>}
            <View style={[s.row, { gap: space.sm, marginTop: space.md }]}>
              <SecondaryButton testID="confirm-cancel-button" title="Cancel" onPress={() => done(false)} style={{ flex: 1 }} small />
              <Pressable testID="confirm-ok-button" onPress={() => done(true)} style={[s.btn, s.btnSmall, { flex: 1 }, opts?.destructive && s.btnDanger]}>
                <Text style={[s.btnText, { fontSize: 14 }]}>{opts?.confirmText ?? "Confirm"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {msg && (
        <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="none" style={[s.toast, { bottom: insets.bottom + 96 }]} testID="toast">
          <Text style={s.toastText}>{msg}</Text>
        </Animated.View>
      )}
    </UICtx.Provider>
  );
}
export const ConfirmationDialog = UIProvider;

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm, backgroundColor: c.surface },
  backBtn: { width: 36, height: 44, justifyContent: "center", marginLeft: -8 },
  title: { fontSize: 22, fontWeight: "800", color: c.onSurface, letterSpacing: -0.3 },
  titleLarge: { fontSize: 30, fontWeight: "900", color: c.onSurface, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: space.sm },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", ...shadow(c.shadow, 0.06) },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: c.surface },
  h2: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  body: { fontSize: 15, color: c.onSurface, lineHeight: 21 },
  muted: { color: c.muted },
  caption: { fontSize: 12.5, color: c.muted },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: space.lg, ...shadow(c.shadow, 0.07) },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  btn: { minHeight: 52, borderRadius: radius.pill, backgroundColor: c.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, paddingHorizontal: space.xl, ...shadow(c.brandDeep, 0.25) },
  btnSmall: { minHeight: 44, paddingHorizontal: space.lg },
  btn2: { backgroundColor: c.brandSecondary, shadowOpacity: 0, elevation: 0 },
  btnDanger: { backgroundColor: c.error },
  btnText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 16 },
  ringBig: { fontSize: 26, fontWeight: "900", color: c.onSurface },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: "flex-start" },
  pillText: { fontSize: 12, fontWeight: "700", color: c.onBrandTertiary },
  macroLabel: { fontSize: 13, fontWeight: "600", color: c.onSurface },
  macroVal: { fontSize: 12, color: c.muted, fontWeight: "600" },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: c.border },
  chipOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontSize: 14, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTextOn: { color: c.onBrandPrimary },
  seg: { flexDirection: "row", backgroundColor: c.surfaceSecondary, borderRadius: radius.pill, padding: 4, ...shadow(c.shadow, 0.05) },
  segItem: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: c.brandPrimary },
  segText: { fontSize: 14, fontWeight: "600", color: c.onSurfaceTertiary },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: c.onSurface },
  input: { flexDirection: "row", alignItems: "center", minHeight: 50, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, paddingHorizontal: space.md, borderWidth: 1, borderColor: c.border, gap: space.sm },
  inputText: { flex: 1, fontSize: 16, color: c.onSurface, paddingVertical: 10, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },
  error: { fontSize: 12, color: c.error },
  listRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingVertical: space.sm, paddingHorizontal: space.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, ...shadow(c.shadow, 0.05) },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15.5, fontWeight: "700", color: c.onSurface },
  rowValue: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  statRow: { flexDirection: "row", paddingVertical: space.md, paddingHorizontal: space.sm },
  statCell: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: c.divider },
  statVal: { fontSize: 17, fontWeight: "800", color: c.onSurface },
  empty: { alignItems: "center", gap: space.sm, padding: space.xl },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: space.xs, height: 48, ...shadow(c.shadow, 0.05) },
  dateBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: c.overlay },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, paddingTop: space.sm },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderStrong, marginBottom: space.md },
  dialogWrap: { flex: 1, backgroundColor: c.overlay, justifyContent: "center", padding: space.xl },
  dialog: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  toast: { position: "absolute", left: space.lg, right: space.lg, backgroundColor: c.surfaceInverse, borderRadius: radius.md, padding: space.md, alignItems: "center" },
  toastText: { color: c.onSurfaceInverse, fontWeight: "600" },
}));

function shadow(color: string, opacity: number) {
  return { shadowColor: color, shadowOpacity: opacity, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: opacity > 0.1 ? 4 : 2 };
}
export { useStyles as useUIStyles };
