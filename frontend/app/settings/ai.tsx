import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, Chips, Field, Icon, PrimaryButton, ScreenContainer, SecondaryButton, ThreeDIllustration, useUI } from "@/src/components/ui";
import { getMeta, setMeta } from "@/src/db/repo/settings";
import { GEMINI_KEY, GEMINI_MODELS, interpret, testGemini } from "@/src/lib/ai";
import { storage } from "@/src/utils/storage";
import { radius, space, useTheme } from "@/src/theme";

export default function AiSettings() {
  const { colors } = useTheme();
  const { confirm, toast } = useUI();
  const [provider, setProvider] = useState("manual");
  const [model, setModel] = useState(GEMINI_MODELS[0]);
  const [hasKey, setHasKey] = useState(false);
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState("2 roti, ek katori dal, 150g rice");
  const [out, setOut] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setProvider((await getMeta("ai_provider")) ?? "manual");
      setModel((await getMeta("gemini_model")) ?? GEMINI_MODELS[0]);
      setHasKey(!!(await storage.secureGet(GEMINI_KEY, null)));
      const st = await getMeta("gemini_status");
      if (st) setStatus(JSON.parse(st));
    })();
  }, []);

  const chooseProvider = async (p: string) => {
    if (p === "gemini" && !hasKey) return toast("Save and test a Gemini API key first");
    setProvider(p);
    await setMeta("ai_provider", p);
  };
  const saveKey = async () => {
    const ok = await storage.secureSet(GEMINI_KEY, key.trim());
    if (!ok) return toast("Could not save key to secure storage");
    setHasKey(true); setKey(""); setShow(false); toast("Key saved securely");
    test();
  };
  const test = async () => {
    setBusy(true);
    try {
      const name = await testGemini(model);
      const st = { ok: true, msg: `Connected · ${name} · ${new Date().toLocaleString()}` };
      setStatus(st); await setMeta("gemini_status", JSON.stringify(st));
    } catch (e: any) {
      const st = { ok: false, msg: e?.message ?? String(e) };
      setStatus(st); await setMeta("gemini_status", JSON.stringify(st));
    } finally { setBusy(false); }
  };
  const del = async () => {
    if (!(await confirm({ title: "Delete Gemini key?", destructive: true, confirmText: "Delete" }))) return;
    await storage.secureRemove(GEMINI_KEY);
    setHasKey(false); setStatus(null); await setMeta("gemini_status", null);
    if (provider === "gemini") await chooseProvider("manual");
    setProvider("manual"); await setMeta("ai_provider", "manual");
  };
  const tryIt = async () => {
    setBusy(true); setOut(null);
    try { const r = await interpret(sample); setOut(`${r.provider}:\n${JSON.stringify({ items: r.items }, null, 2)}`); }
    catch (e: any) { setOut(`Error: ${e?.message ?? e}`); } finally { setBusy(false); }
  };

  return (
    <ScreenContainer back title="AI Configuration" testID="ai-settings-screen">
      <View style={{ alignItems: "center" }}><ThreeDIllustration name="gear" size={90} /></View>
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Food text provider</Text>
      {[
        { k: "manual", t: "Manual / Database", d: "Default. Offline parser + local food database. No key, no internet." },
        { k: "local", t: "Local AI (on-device)", d: "Not available in this build — the on-device runtime (llama.rn) needs a custom native build and was not verified. Manual logging is unaffected." },
        { k: "gemini", t: "Google Gemini", d: "Uses your own API key. Meal text is sent to Google only when this is selected." },
      ].map((o) => (
        <Pressable key={o.k} testID={`ai-provider-${o.k}`} disabled={o.k === "local"} onPress={() => chooseProvider(o.k)}
          style={{ flexDirection: "row", gap: space.md, alignItems: "center", padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: provider === o.k ? colors.brand : "transparent", opacity: o.k === "local" ? 0.55 : 1 }}>
          <Icon name={provider === o.k ? "radiobox-marked" : "radiobox-blank"} color={provider === o.k ? colors.brand : colors.muted} />
          <View style={{ flex: 1 }}><Text style={{ fontWeight: "800", color: colors.onSurface }}>{o.t}</Text><Text style={{ color: colors.muted, fontSize: 12.5 }}>{o.d}</Text></View>
        </Pressable>
      ))}

      <Card style={{ gap: space.md }} testID="gemini-card">
        <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Gemini</Text>
        <Text style={{ color: colors.muted, fontSize: 12.5 }}>Get a key at aistudio.google.com → Get API key. Stored in Android Keystore-backed secure storage, never in the database, logs or backups.</Text>
        <Text style={{ fontWeight: "700", color: hasKey ? colors.success : colors.muted }} testID="gemini-key-status">{hasKey ? "API key saved" : "No API key saved"}</Text>
        <Field testID="gemini-key-input" label={hasKey ? "Change key" : "API key"} value={key} onChangeText={setKey} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} placeholder="AIza…" />
        <Pressable testID="gemini-key-toggle" onPress={() => setShow(!show)}><Text style={{ color: colors.brand, fontWeight: "700" }}>{show ? "Hide key" : "Show key"}</Text></Pressable>
        <PrimaryButton testID="gemini-key-save" title="Save Key" disabled={key.trim().length < 20} onPress={saveKey} />
        <Text style={{ fontWeight: "700", color: colors.onSurface }}>Model</Text>
        <Chips testID="gemini-model" value={model} onChange={async (m) => { setModel(m); await setMeta("gemini_model", m); }} options={GEMINI_MODELS.map((m) => ({ key: m, label: m }))} />
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <SecondaryButton testID="gemini-test" small title={busy ? "Testing…" : "Test connection"} disabled={!hasKey || busy} onPress={test} style={{ flex: 1 }} />
          <SecondaryButton testID="gemini-delete" small danger title="Delete key" disabled={!hasKey} onPress={del} style={{ flex: 1 }} />
        </View>
        {status && <Text testID="gemini-connection-status" style={{ color: status.ok ? colors.success : colors.error }}>{status.ok ? "✓ " : "✕ "}{status.msg}</Text>}
      </Card>

      <Card style={{ gap: space.sm }}>
        <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>Test interpretation</Text>
        <Field testID="ai-test-input" value={sample} onChangeText={setSample} />
        <SecondaryButton testID="ai-test-run" small title="Run with current provider" onPress={tryIt} disabled={busy} />
        {out && <Text testID="ai-test-output" style={{ fontFamily: "monospace", fontSize: 12, color: colors.onSurfaceTertiary }}>{out}</Text>}
      </Card>
    </ScreenContainer>
  );
}
