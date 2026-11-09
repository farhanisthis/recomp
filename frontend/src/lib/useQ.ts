// Tiny reactive layer over SQLite: writes call bump(); screens using useQ re-read.
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

let version = 0;
const subs = new Set<() => void>();
export function bump() {
  version++;
  subs.forEach((f) => f());
}
function subscribe(f: () => void) {
  subs.add(f);
  return () => subs.delete(f);
}
export function useDataVersion() {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

export function useQ<T>(fn: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; loading: boolean; error: string | null; reload: () => void } {
  const v = useDataVersion();
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    fnRef
      .current()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, tick, ...deps]);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));
  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}
