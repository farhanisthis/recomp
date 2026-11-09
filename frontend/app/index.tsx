import { Redirect } from "expo-router";
import { LoadingIndicator } from "@/src/components/ui";
import { getMeta } from "@/src/db/repo/settings";
import { useQ } from "@/src/lib/useQ";

export default function Index() {
  const { data, loading } = useQ(() => getMeta("onboarding_done"));
  if (loading) return <LoadingIndicator />;
  return <Redirect href={data === "1" ? "/(tabs)" : "/onboarding"} />;
}
