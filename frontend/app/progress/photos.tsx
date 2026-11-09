// Progress photos: stored in private app storage (documentDirectory/photos). Never uploaded.
import { File, Directory, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Linking, Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chips, EmptyState, Field, Icon, LoadingIndicator, PrimaryButton, ScreenContainer, SecondaryButton, Segmented, Sheet, ThreeDIllustration, useUI } from "@/src/components/ui";
import { addPhoto, deletePhoto, listPhotos, type Photo } from "@/src/db/repo/body";
import { dayKey, fmtShort } from "@/src/lib/calc";
import { useQ } from "@/src/lib/useQ";
import { space, useTheme } from "@/src/theme";

type Pose = "front" | "side" | "back";
async function persistLocal(uri: string) {
  if (Platform.OS === "web") return uri;
  const dir = new Directory(Paths.document, "photos");
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `p_${Date.now()}.jpg`);
  await new File(uri).copy(dest);
  return dest.uri;
}

export default function Photos() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { confirm, toast } = useUI();
  const [pose, setPose] = useState<Pose>("front");
  const { data } = useQ(() => listPhotos(pose), [pose]);
  const [sel, setSel] = useState<number[]>([]);
  const [full, setFull] = useState<Photo | null>(null);
  const [add, setAdd] = useState(false);
  const [perm, setPerm] = useState<{ kind: "camera" | "library"; blocked: boolean } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [newPose, setNewPose] = useState<Pose>("front");
  const [day, setDay] = useState(dayKey());
  const [notes, setNotes] = useState("");

  const pick = async (kind: "camera" | "library") => {
    const get = kind === "camera" ? ImagePicker.getCameraPermissionsAsync : ImagePicker.getMediaLibraryPermissionsAsync;
    const req = kind === "camera" ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
    let st = await get();
    if (!st.granted) {
      if (!st.canAskAgain) return setPerm({ kind, blocked: true });
      st = await req();
      if (!st.granted) return setPerm({ kind, blocked: !st.canAskAgain });
    }
    setPerm(null);
    const r = kind === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ["images"] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
    if (!r.canceled && r.assets[0]) { setPending(r.assets[0].uri); setNewPose(pose); }
  };
  const savePending = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return toast("Date must be YYYY-MM-DD");
    try {
      const uri = await persistLocal(pending!);
      await addPhoto({ day, pose: newPose, uri, notes: notes || null });
      setPending(null); setAdd(false); setNotes(""); toast("Photo saved privately on device");
    } catch (e: any) { toast(`Could not save photo: ${e?.message ?? e}`); }
  };
  const toggle = (id: number) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel.slice(-1), id]);
  const cmp = (data ?? []).filter((p) => sel.includes(p.id)).sort((a, b) => a.day.localeCompare(b.day));

  return (
    <ScreenContainer back title="Transformation" testID="photos-screen"
      footer={<PrimaryButton testID="photos-add-button" icon="plus" title="Add Progress Photo" onPress={() => { setAdd(true); setDay(dayKey()); }} />}>
      <Segmented testID="photos-pose" value={pose} onChange={(v) => { setPose(v); setSel([]); }} options={[{ key: "front", label: "Front" }, { key: "side", label: "Side" }, { key: "back", label: "Back" }]} />
      {!data ? <LoadingIndicator /> : data.length === 0 ? (
        <EmptyState illus="camera" title={`No ${pose} photos yet`} text="Photos stay on this device. Select two to compare." />
      ) : (
        <>
          {cmp.length === 2 && (
            <View style={{ flexDirection: "row", gap: space.sm }} testID="photos-compare">
              {cmp.map((p, i) => (
                <View key={p.id} style={{ flex: 1, gap: 4, alignItems: "center" }}>
                  <Image source={{ uri: p.uri }} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 16 }} contentFit="cover" />
                  <Text style={{ fontWeight: "800", color: colors.onSurface }}>{i === 0 ? "Before" : "After"}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{fmtShort(p.day)} {p.day.slice(0, 4)}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={{ color: colors.muted, fontSize: 12 }}>Tap to select two photos for side-by-side comparison. Long-press to view fullscreen.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {data.map((p) => (
              <Pressable key={p.id} testID={`photo-${p.id}`} onPress={() => toggle(p.id)} onLongPress={() => setFull(p)} style={{ width: "31%", borderRadius: 12, overflow: "hidden", borderWidth: 3, borderColor: sel.includes(p.id) ? colors.brand : "transparent" }}>
                <Image source={{ uri: p.uri }} style={{ width: "100%", aspectRatio: 3 / 4 }} contentFit="cover" />
                <Text style={{ position: "absolute", bottom: 4, left: 6, color: "#FFFFFF", fontWeight: "800", fontSize: 11 }}>{fmtShort(p.day)}</Text>
                <Pressable testID={`photo-view-${p.id}`} onPress={() => setFull(p)} hitSlop={6} style={{ position: "absolute", top: 4, right: 4 }}><Icon name="arrow-expand" size={18} color="#FFFFFF" /></Pressable>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Sheet visible={add} onClose={() => { setAdd(false); setPending(null); }} title="Add progress photo" testID="photo-add-sheet">
        {!pending ? (
          <>
            <View style={{ alignItems: "center" }}><ThreeDIllustration name="camera" size={90} /></View>
            <Text style={{ color: colors.muted, textAlign: "center" }}>Take a photo or choose one from your gallery. It&apos;s saved only in RECOMP&apos;s private storage.</Text>
            {perm && (
              <View style={{ gap: space.sm }} testID="photo-permission-msg">
                <Text style={{ color: colors.warning }}>{perm.kind === "camera" ? "Camera" : "Photo library"} access is needed to add progress photos.</Text>
                {perm.blocked ? <SecondaryButton testID="photo-open-settings" title="Open Settings" onPress={() => Linking.openSettings()} /> : <SecondaryButton testID="photo-retry-permission" title="Allow access" onPress={() => pick(perm.kind)} />}
              </View>
            )}
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <PrimaryButton testID="photo-camera" icon="camera" title="Camera" style={{ flex: 1 }} onPress={() => pick("camera")} />
              <SecondaryButton testID="photo-gallery" icon="image" title="Gallery" style={{ flex: 1 }} onPress={() => pick("library")} />
            </View>
          </>
        ) : (
          <>
            <Image source={{ uri: pending }} style={{ width: "100%", height: 220, borderRadius: 16 }} contentFit="cover" />
            <Chips testID="photo-new-pose" value={newPose} onChange={setNewPose} options={[{ key: "front", label: "Front" }, { key: "side", label: "Side" }, { key: "back", label: "Back" }]} />
            <Field testID="photo-date-input" label="Date (YYYY-MM-DD)" value={day} onChangeText={setDay} />
            <Field testID="photo-notes-input" label="Notes (optional)" value={notes} onChangeText={setNotes} />
            <PrimaryButton testID="photo-save" title="Save Photo" onPress={savePending} />
          </>
        )}
      </Sheet>
      <Modal visible={!!full} onRequestClose={() => setFull(null)} animationType="fade">
        <View style={{ flex: 1, backgroundColor: "#000000", paddingTop: insets.top, paddingBottom: insets.bottom + space.md }} testID="photo-fullscreen">
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: space.md }}>
            <Pressable testID="photo-fullscreen-close" onPress={() => setFull(null)} hitSlop={8}><Icon name="close" color="#FFFFFF" size={28} /></Pressable>
            <Pressable testID="photo-delete" hitSlop={8} onPress={async () => {
              const p = full!; setFull(null);
              if (await confirm({ title: "Delete photo?", destructive: true, confirmText: "Delete" })) {
                if (Platform.OS !== "web") { try { new File(p.uri).delete(); } catch {} }
                await deletePhoto(p.id); setSel(sel.filter((x) => x !== p.id));
              }
            }}><Icon name="delete-outline" color="#FFFFFF" size={28} /></Pressable>
          </View>
          {full && <Image source={{ uri: full.uri }} style={{ flex: 1 }} contentFit="contain" />}
          {full && <Text style={{ color: "#FFFFFF", textAlign: "center", marginTop: space.sm }}>{full.day} · {full.pose}{full.notes ? ` · ${full.notes}` : ""}</Text>}
        </View>
      </Modal>
    </ScreenContainer>
  );
}
