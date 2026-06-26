import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { assetUrl } from "@/lib/asset";

interface ProductImageProps {
  /** Pfad relativ zu `public/` (z. B. „product-images/gn1.jpg"). Wird über
   *  `assetUrl` aufgelöst. Fehlt die Quelle oder lädt sie nicht, greift der
   *  einheitliche LYS-Fallback. Bildquellen sind später leicht austauschbar:
   *  einfach `image` am Menü-Item setzen. */
  src?: string | null;
  alt: string;
  /** Tailwind-Aspect-Utility, default 4:5 (kompaktes Hochformat — füllt die
   *  Becher-/Produktfotos randlos bei nur minimalem Beschnitt, hält die Cards
   *  niedriger als 3:4). */
  aspect?: string;
  className?: string;
}

/** Einheitliches Produktbild: randlos, `object-cover`, fixes Seitenverhältnis,
 *  konsistenter Fallback. Vereinheitlicht die Bildsprache über alle Cards. */
export function ProductImage({ src, alt, aspect = "aspect-[4/5]", className = "" }: ProductImageProps) {
  const [errored, setErrored] = useState(false);
  const resolved = assetUrl(src);
  const showImage = resolved && !errored;

  return (
    <div className={`relative w-full ${aspect} overflow-hidden lys-img-fallback ${className}`}>
      {showImage ? (
        <img
          src={resolved}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <UtensilsCrossed className="w-[22%] h-[22%] text-primary/25" strokeWidth={1.2} />
        </div>
      )}
    </div>
  );
}
