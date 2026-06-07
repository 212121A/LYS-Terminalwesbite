import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentBusinessDay, isSoldOut, type AvailabilityRow } from "@/lib/availability";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const POLL_MS = 15_000;

async function fetchAvailability(): Promise<AvailabilityRow[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const url =
    `${SUPABASE_URL}/rest/v1/item_availability` +
    `?select=item_id,mode,sold_out_date`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as AvailabilityRow[];
  return Array.isArray(rows) ? rows : [];
}

interface AvailabilityContextValue {
  isItemSoldOut: (availabilityId: string) => boolean;
  refetch: () => Promise<void>;
}

const AvailabilityContext = createContext<AvailabilityContextValue | null>(null);

export function AvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Map<string, AvailabilityRow>>(new Map());
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    const next = await fetchAvailability();
    if (!mounted.current) return;
    setRows(new Map(next.map((r) => [r.item_id, r])));
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refetch();
    const interval = window.setInterval(() => void refetch(), POLL_MS);
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refetch]);

  const isItemSoldOut = useCallback(
    (availabilityId: string) => isSoldOut(rows.get(availabilityId), currentBusinessDay()),
    [rows],
  );

  const value = useMemo<AvailabilityContextValue>(
    () => ({ isItemSoldOut, refetch }),
    [isItemSoldOut, refetch],
  );

  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>;
}

export function useAvailability(): AvailabilityContextValue {
  const ctx = useContext(AvailabilityContext);
  if (!ctx) throw new Error("useAvailability muss innerhalb von AvailabilityProvider verwendet werden");
  return ctx;
}
