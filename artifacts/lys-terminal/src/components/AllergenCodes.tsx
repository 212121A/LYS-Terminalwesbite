/** Zeigt dezent die Allergen-/Zusatzstoff-Codes eines Gerichts. Leer → nichts. */
export function AllergenCodes({
  allergens,
  additives,
}: {
  allergens?: string[];
  additives?: string[];
}) {
  const a = allergens ?? [];
  const z = additives ?? [];
  if (a.length === 0 && z.length === 0) return null;
  const parts = [a.join(", "), z.join(", ")].filter(Boolean).join(" · ");
  return (
    <p className="text-[11px] text-muted-foreground/70 mt-0.5 font-mono" aria-label="Allergene und Zusatzstoffe">
      {parts}
    </p>
  );
}
