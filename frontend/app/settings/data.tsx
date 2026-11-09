import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Text } from "react-native";

import { Chips, ScreenContainer, SecondaryButton, SettingsRow, useUI } from "@/src/components/ui";
import { getMeta, setMeta } from "@/src/db/repo/settings";
import { buildBackup, clearHistory, exportCsv, resetApp, restoreBackup, writeExportFile } from "@/src/lib/backup";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

export default function DataScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const [busy, setBusy] = useState<string | null>(null);
  const [clearKind, setClearKind] = useState<"food" | "workouts" | "measurements" | "activity">("food");
  const { data: last } = useQ(() => getMeta("last_backup"));
  const web = Platform.OS === "web";

  const share = async (name: string, content: string, mime: string) => {
    if (web) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([content], { type: mime }));
      a.download = name; a.click();
      return;
    }
    const uri = await writeExportFile(name, content);
    if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device");
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: name });
  };
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e: any) { toast(e?.message ?? String(e)); } finally { setBusy(null); }
  };
  const stamp = new Date().toISOString().slice(0, 10);
  return (
    <ScreenContainer back title="Backup & Data" testID="data-screen">
      <Text style={{ color: colors.muted }}>All data lives only on this device. Backups exclude your Gemini key and AI model files.</Text>
      <SettingsRow testID="data-export-backup" icon="cloud-download-outline" title={busy === "b" ? "Preparing backup…" : "Export full backup"} subtitle={`Includes photos · last: ${last ? new Date(last).toLocaleString() : "never"}`}
        onPress={() => run("b", async () => { await share(`recomp-backup-${stamp}.json`, await buildBackup(), "application/json"); await setMeta("last_backup", new Date().toISOString()); toast("Backup exported"); })} />
      <SettingsRow testID="data-restore-backup" icon="backup-restore" title={busy === "r" ? "Restoring…" : "Restore from backup"} subtitle="Validates the file, then replaces all data atomically"
        onPress={() => run("r", async () => {
          const r = await DocumentPicker.getDocumentAsync({ type: ["application/json", "*/*"], copyToCacheDirectory: true });
          if (r.canceled || !r.assets[0]) return;
          if (!(await confirm({ title: "Replace all data?", message: "Your current data will be replaced by the backup. If validation fails nothing changes.", destructive: true, confirmText: "Restore" }))) return;
          const text = web ? await (await fetch(r.assets[0].uri)).text() : await new File(r.assets[0].uri).text();
          await restoreBackup(text);
          toast("Backup restored");
          router.replace("/");
        })} />
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface, marginTop: space.sm }}>CSV export</Text>
      {(["food", "workouts", "measurements"] as const).map((k) => (
        <SettingsRow key={k} testID={`data-csv-${k}`} icon="file-delimited-outline" title={`Export ${k} CSV`}
          onPress={() => run(k, async () => { const c = await exportCsv(k); if (!c) return toast("Nothing to export yet"); await share(`recomp-${k}-${stamp}.csv`, c, "text/csv"); })} />
      ))}
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface, marginTop: space.sm }}>Clear history</Text>
      <Chips testID="data-clear-kind" value={clearKind} onChange={setClearKind} options={[{ key: "food", label: "Food & water" }, { key: "workouts", label: "Workouts" }, { key: "measurements", label: "Measurements & photos" }, { key: "activity", label: "Steps & sleep" }]} />
      <SecondaryButton testID="data-clear-button" danger icon="delete-sweep-outline" title="Clear selected history" onPress={async () => {
        if (await confirm({ title: "Clear history?", message: `This permanently deletes ${clearKind} records.`, destructive: true, confirmText: "Delete" })) { await clearHistory(clearKind); toast("History cleared"); }
      }} />
      <SecondaryButton testID="data-reset-button" danger icon="restart-alert" title="Reset application" onPress={async () => {
        if (await confirm({ title: "Reset RECOMP?", message: "Deletes your profile and every record. Export a backup first if you might need it.", destructive: true, confirmText: "Reset" })) {
          await resetApp(); router.replace("/onboarding");
        }
      }} />
    </ScreenContainer>
  );
}
