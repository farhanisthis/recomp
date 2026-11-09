import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Card, EmptyState, FadeInView, HeaderIcon, Icon, LoadingIndicator, PrimaryButton, ScreenContainer, Segmented, SettingsRow, ThreeDIllustration } from "@/src/components/ui";
import { getActiveSession, listHistory, listPlans, startSession } from "@/src/db/repo/workout";
import { fmtDay, fmtDuration, WEEKDAYS } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { makeStyles, space, useTheme } from "@/src/theme";

export default function WorkoutTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<"plans" | "history">("plans");
  const { data } = useQ(async () => ({ plans: await listPlans(), active: await getActiveSession(), history: await listHistory(5) }));
  const go = async (planId: number | null) => {
    const r = await startSession(planId);
    router.push(`/workout/active?id=${r.id}`);
  };
  return (
    <ScreenContainer tab large title="Workout" subtitle="Build strength & stay consistent" testID="workout-screen"
      right={<HeaderIcon testID="workout-history-button" icon="history" onPress={() => router.push("/workout/history")} />}>
      <FadeInView>
        <Card style={s.hero}>
          <View style={{ flex: 1, gap: space.sm }}>
            {data?.active ? (
              <>
                <Text style={s.h2}>{data.active.name}</Text>
                <Text style={s.cap}>In progress since {new Date(data.active.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                <PrimaryButton small testID="workout-resume-button" icon="play" title="Resume Workout" onPress={() => router.push(`/workout/active?id=${data.active!.id}`)} />
              </>
            ) : (
              <>
                <Text style={s.h2}>Ready to train?</Text>
                <Text style={s.cap}>Start a plan below or an empty session.</Text>
                <PrimaryButton small testID="workout-quick-start-button" icon="play" title="Quick Start" onPress={() => go(null)} />
              </>
            )}
          </View>
          <ThreeDIllustration name="gym_gear" size={140} />
        </Card>
      </FadeInView>
      <Segmented testID="workout-tabs" value={tab} onChange={setTab} options={[{ key: "plans", label: "My Plans" }, { key: "history", label: "Recent" }]} />
      {!data ? <LoadingIndicator /> : tab === "plans" ? (
        <View style={{ gap: space.sm }}>
          {data.plans.length === 0 && <EmptyState illus="dumbbell_plus" title="No plans yet" text="Create your first workout plan — any split you like." />}
          {data.plans.map((p) => (
            <SettingsRow key={p.id} testID={`workout-plan-${p.id}`} icon="dumbbell" title={p.name}
              subtitle={`${p.count} exercises · ${p.total_sets} sets${p.schedule_days ? " · " + p.schedule_days.split(",").map((d) => WEEKDAYS[+d]).join(", ") : ""}`}
              onPress={() => router.push(`/workout/plan/${p.id}`)} />
          ))}
          <PrimaryButton testID="workout-create-plan-button" icon="plus" title="Create Workout" onPress={() => router.push("/workout/plan-edit")} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {data.history.length === 0 && <EmptyState illus="summary" title="No workouts yet" text="Completed sessions will appear here." />}
          {data.history.map((h) => (
            <SettingsRow key={h.id} testID={`workout-recent-${h.id}`} icon="check-circle" color={colors.success} title={h.name} subtitle={`${fmtDay(h.day)} · ${fmtDuration(h.duration_sec ?? 0)} · ${Math.round(h.volume ?? 0)} kg vol`} onPress={() => router.push(`/workout/session/${h.id}`)} />
          ))}
        </View>
      )}
      <View style={{ gap: space.sm }}>
        <SettingsRow testID="workout-library-link" illus="bench_press" title="Exercise Library" subtitle="Browse and create exercises" onPress={() => router.push("/workout/exercises")} />
        <SettingsRow testID="workout-records-link" illus="medal" title="Personal Records" subtitle="Best lifts and strength progress" onPress={() => router.push("/workout/records")} />
        <SettingsRow testID="workout-history-link" illus="calendar" title="Workout History" subtitle="Calendar and all past sessions" onPress={() => router.push("/workout/history")} right={<Icon name="chevron-right" color={colors.muted} />} />
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { flexDirection: "row", alignItems: "center", gap: space.sm },
  h2: { fontSize: 19, fontWeight: "800", color: c.onSurface },
  cap: { fontSize: 13, color: c.muted },
}));
