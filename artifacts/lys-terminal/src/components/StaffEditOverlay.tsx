import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { menuData } from "@/data/menu";
import { BOX_SAUCES } from "@/data/boxSauces";
import {
  dishAvailabilityId,
  boxAvailabilityId,
  sauceAvailabilityId,
} from "@/lib/availability";
import { useAvailability } from "@/availability/AvailabilityContext";

type Action = "available" | "sold_out_today" | "sold_out_permanent";

interface Entry {
  availabilityId: string;
  label: string;
}
interface Group {
  title: string;
  entries: Entry[];
}

function buildGroups(): Group[] {
  const groups: Group[] = [];
  for (const category of menuData) {
    if (category.boxItems) {
      groups.push({
        title: category.name,
        entries: category.boxItems.map((b) => ({
          availabilityId: boxAvailabilityId(b),
          label: b.name,
        })),
      });
    } else {
      groups.push({
        title: category.name,
        entries: category.items.map((i) => ({
          availabilityId: dishAvailabilityId(i),
          label: `${i.number} ${i.name}`,
        })),
      });
    }
  }
  groups.push({
    title: "Soßen",
    entries: BOX_SAUCES.map((s) => ({
      availabilityId: sauceAvailabilityId(s),
      label: s.label,
    })),
  });
  return groups;
}

export function StaffEditOverlay({ onClose }: { onClose: () => void }) {
  const { isItemSoldOut, refetch } = useAvailability();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const groups = useMemo(buildGroups, []);

  async function verifyPin() {
    setError(null);
    const res = await fetch("/api/availability/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) setAuthed(true);
    else setError("Falsche PIN");
  }

  async function setAvailability(availabilityId: string, action: Action) {
    setBusy(availabilityId);
    setError(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, itemId: availabilityId, action }),
    });
    if (!res.ok) setError("Speichern fehlgeschlagen");
    await refetch();
    setBusy(null);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-[20px] font-semibold text-foreground">Verfügbarkeit bearbeiten</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground active:scale-95">
            <X size={18} />
          </button>
        </div>

        {!authed ? (
          <div className="p-6 flex flex-col gap-4">
            <label className="text-[14px] text-muted-foreground">PIN eingeben</label>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void verifyPin(); }}
              className="h-12 rounded-xl border-2 border-border bg-card px-4 text-[18px] tracking-widest text-foreground"
            />
            {error && <p className="text-[13px] text-red-600">{error}</p>}
            <button onClick={() => void verifyPin()} className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold active:scale-[0.98]">
              Weiter
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-4">
            {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}
            {groups.map((group) => (
              <div key={group.title} className="mb-6">
                <h3 className="font-serif text-[16px] font-semibold text-primary mb-2">{group.title}</h3>
                <div className="space-y-1.5">
                  {group.entries.map((entry) => {
                    const soldOut = isItemSoldOut(entry.availabilityId);
                    const isBusy = busy === entry.availabilityId;
                    return (
                      <div key={entry.availabilityId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                        <span className={`text-[14px] ${soldOut ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {entry.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {soldOut ? (
                            <button
                              disabled={isBusy}
                              onClick={() => void setAvailability(entry.availabilityId, "available")}
                              className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[13px] font-medium active:scale-95 disabled:opacity-50"
                            >
                              Verfügbar
                            </button>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => void setAvailability(entry.availabilityId, "sold_out_today")}
                              className="h-8 px-3 rounded-lg bg-muted text-foreground text-[13px] font-medium active:scale-95 disabled:opacity-50"
                            >
                              Heute aus
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
