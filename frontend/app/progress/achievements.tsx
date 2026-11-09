import { useState } from "react";
import { Text, View } from "react-native";

import { Chips, Icon, LoadingIndicator, ScreenContainer, ThreeDIllustration } from "@/src/components/ui";
import { evaluateAchievements } from "@/src/db/repo/body";
import { useQ } from "@/src/lib/useQ";
import { radius, space, useTheme } from "@/src/theme";

export default function Achievements() {
  const { colors } = useTheme();
  const [cat, setCat] = useState("All");
  const { data } = useQ(evaluateAchievements);
  if (!data) return <ScreenContainer back><LoadingIndicator /></ScreenContainer>;
  const n = data.filter((a) => a.unlocked_at).length;
  const list = data.filter((a) => cat === "All" || a.cat === cat);
  return (
    <ScreenContainer back title="Achievements" testID="achievements-screen">
      <View style={{ alignItems: "center" }}>
        <ThreeDIllustration name="badge" size={100} />
        <Text style={{ fontSize: 30, fontWeight: "900", color: colors.onSurface }} testID="achievements-count">{n}</Text>
        <Text style={{ color: colors.muted }}>of {data.length} unlocked</Text>
      </View>
      <Chips testID="achievements-cat" value={cat} onChange={setCat} options={["All", "Nutrition", "Workout", "Progress"].map((x) => ({ key: x, label: x }))} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {list.map((a) => (
          <View key={a.key} testID={`achievement-${a.key}`} style={{ width: "31.5%", alignItems: "center", gap: 4, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, opacity: a.unlocked_at ? 1 : 0.5 }}>
            {a.unlocked_at ? <ThreeDIllustration name={a.cat === "Workout" ? "medal" : a.cat === "Nutrition" ? "food_bowl" : "trophy"} size={44} /> : <Icon name="lock-outline" size={36} color={colors.muted} />}
            <Text style={{ fontWeight: "800", fontSize: 12.5, color: colors.onSurface, textAlign: "center" }}>{a.title}</Text>
            <Text style={{ fontSize: 10.5, color: colors.muted, textAlign: "center" }}>{a.unlocked_at ? new Date(a.unlocked_at).toLocaleDateString() : a.desc}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}
