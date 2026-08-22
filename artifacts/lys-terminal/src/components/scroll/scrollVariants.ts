import type { Variants } from "framer-motion";

/** Karten-Choreografie bekommt Index + Spaltenzahl, damit Wellen/Ecken-Effekte
 *  die Rasterposition kennen. */
export interface CardCustom {
  i: number;
  cols: number;
}

/** Scroll-gescrubbte Section-Transformation: [Wert beim Eintritt, Wert in Ruhe].
 *  Nur Compositor-freundliche Properties — kein Filter/Blur auf ganzen Sections. */
export interface ScrubSpec {
  scale?: [number, number];
  y?: [number, number];
  rotate?: [number, number];
  rotateX?: [number, number];
  skewY?: [number, number];
  opacity?: [number, number];
}

export interface ScrollVariantSpec {
  /** Perspektive auf dem Grid, falls die Karten 3D drehen. */
  perspective?: number;
  /** Nur setzen, wenn die Überschrift wirklich in 3D kippt — der 3D-Kontext
   *  zwingt jedes Zeichen in eine eigene Compositor-Ebene. */
  heading3d?: boolean;
  scrub: ScrubSpec;
  /** custom = Zeichen-Index der Überschrift. */
  heading: Variants;
  /** custom = CardCustom. */
  card: Variants;
}

const snap = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;
const bouncy = { type: "spring", stiffness: 300, damping: 14, mass: 0.9 } as const;
const glide = { duration: 0.75, ease: [0.16, 1, 0.3, 1] } as const;

/** Vertikale Welle: mittlere Spalten starten früher als die Ränder. */
const waveDelay = ({ i, cols }: CardCustom) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  return (col + row) * 0.07;
};

export const SCROLL_VARIANTS = {
  /** Kino-Zoom: das Raster schiebt sich als Block aus der Tiefe nach vorn. */
  cinemaZoom: {
    scrub: { scale: [1.22, 1], y: [70, 0] },
    heading: {
      hidden: { opacity: 0, scale: 2.4, y: 24 },
      visible: (c: number) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { ...glide, delay: c * 0.035 },
      }),
    },
    card: {
      hidden: { opacity: 0, scale: 1.6, y: 90 },
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { ...snap, delay: i * 0.045 },
      }),
    },
  },

  /** Kartendeck: aufgefächert und schräg gestapelt, klappt ins Raster. */
  deckFan: {
    scrub: { rotate: [-3.5, 0], y: [60, 0] },
    heading: {
      hidden: { opacity: 0, rotate: -18, y: 60 },
      visible: (c: number) => ({
        opacity: 1,
        rotate: 0,
        y: 0,
        transition: { ...bouncy, delay: c * 0.04 },
      }),
    },
    card: {
      hidden: ({ i, cols }: CardCustom) => ({
        opacity: 0,
        rotate: (i % cols) * 14 - 14,
        x: (i % cols) * 90 - 90,
        y: 140,
        scale: 0.82,
      }),
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        rotate: 0,
        x: 0,
        y: 0,
        scale: 1,
        transition: { ...bouncy, delay: i * 0.06 },
      }),
    },
  },

  /** Flipboard: die Karten klappen wie Anzeigetafel-Lamellen nach oben. */
  flipDeck: {
    perspective: 1400,
    heading3d: true,
    scrub: { rotateX: [10, 0], y: [50, 0] },
    heading: {
      hidden: { opacity: 0, rotateX: -95, y: 30 },
      visible: (c: number) => ({
        opacity: 1,
        rotateX: 0,
        y: 0,
        transition: { ...snap, delay: c * 0.045 },
      }),
    },
    card: {
      hidden: { opacity: 0, rotateX: -92, y: 60, transformOrigin: "50% 0%" },
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        rotateX: 0,
        y: 0,
        transition: { ...snap, delay: i * 0.07 },
      }),
    },
  },

  /** Reißverschluss: Karten schießen abwechselnd von links und rechts rein. */
  splitSwipe: {
    scrub: { skewY: [2.5, 0], y: [55, 0] },
    heading: {
      hidden: (c: number) => ({ opacity: 0, x: c % 2 ? 120 : -120, skewX: -22 }),
      visible: (c: number) => ({
        opacity: 1,
        x: 0,
        skewX: 0,
        transition: { ...snap, delay: c * 0.03 },
      }),
    },
    card: {
      hidden: ({ i }: CardCustom) => ({
        opacity: 0,
        x: i % 2 ? 520 : -520,
        skewX: i % 2 ? -16 : 16,
      }),
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        x: 0,
        skewX: 0,
        transition: { ...snap, delay: i * 0.05 },
      }),
    },
  },

  /** Wirbel: jede Karte dreht sich aus dem Nichts ins Raster. */
  spiralIn: {
    scrub: { rotate: [5, 0], scale: [0.9, 1] },
    heading: {
      hidden: { opacity: 0, rotate: 200, scale: 0 },
      visible: (c: number) => ({
        opacity: 1,
        rotate: 0,
        scale: 1,
        transition: { ...bouncy, delay: c * 0.05 },
      }),
    },
    card: {
      hidden: ({ i }: CardCustom) => ({
        opacity: 0,
        rotate: i % 2 ? 220 : -220,
        scale: 0.15,
      }),
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        rotate: 0,
        scale: 1,
        transition: { ...bouncy, delay: i * 0.055 },
      }),
    },
  },

  /** Fallobst: die Karten stürzen von oben rein und federn nach. */
  elasticDrop: {
    scrub: { y: [-40, 0], scale: [1.06, 1] },
    heading: {
      hidden: { opacity: 0, y: -160, scaleY: 2.2 },
      visible: (c: number) => ({
        opacity: 1,
        y: 0,
        scaleY: 1,
        transition: { type: "spring", stiffness: 340, damping: 11, delay: c * 0.04 },
      }),
    },
    card: {
      hidden: { opacity: 0, y: -320, rotate: -8 },
      visible: ({ i, cols }: CardCustom) => ({
        opacity: 1,
        y: 0,
        rotate: 0,
        transition: {
          type: "spring",
          stiffness: 320,
          damping: 12,
          delay: (i % cols) * 0.08 + Math.floor(i / cols) * 0.04,
        },
      }),
    },
  },

  /** Vorhang: das Raster öffnet sich aus der Mitte nach außen. */
  curtainWipe: {
    scrub: { scale: [1.1, 1] },
    heading: {
      hidden: (c: number) => ({ opacity: 0, x: (c - 4) * 34, scaleX: 0.15 }),
      visible: (c: number) => ({
        opacity: 1,
        x: 0,
        scaleX: 1,
        transition: { ...glide, delay: c * 0.03 },
      }),
    },
    card: {
      hidden: ({ i, cols }: CardCustom) => ({
        opacity: 0,
        scaleX: 0.02,
        x: ((i % cols) - (cols - 1) / 2) * 180,
        scaleY: 0.9,
      }),
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        scaleX: 1,
        x: 0,
        scaleY: 1,
        transition: { ...glide, delay: i * 0.05 },
      }),
    },
  },

  /** Tunnel: die Karten kommen einzeln aus großer Tiefe angeflogen. */
  depthTunnel: {
    perspective: 1100,
    scrub: { scale: [0.82, 1] },
    heading: {
      hidden: { opacity: 0, z: -900, scale: 0.2 },
      visible: (c: number) => ({
        opacity: 1,
        z: 0,
        scale: 1,
        transition: { ...glide, delay: c * 0.045 },
      }),
    },
    card: {
      hidden: { opacity: 0, z: -1000, rotateY: 45 },
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        z: 0,
        rotateY: 0,
        transition: { ...glide, delay: i * 0.08 },
      }),
    },
  },

  /** Welle: eine Diagonale läuft durchs Raster, jede Karte dreht sich auf. */
  waveRoll: {
    perspective: 1300,
    heading3d: true,
    scrub: { rotateX: [14, 0], y: [70, 0] },
    heading: {
      hidden: (c: number) => ({ opacity: 0, y: 70, rotateY: -90 + c * 4 }),
      visible: (c: number) => ({
        opacity: 1,
        y: 0,
        rotateY: 0,
        transition: { ...snap, delay: c * 0.05 },
      }),
    },
    card: {
      hidden: { opacity: 0, rotateY: -85, y: 120, transformOrigin: "0% 50%" },
      visible: (c: CardCustom) => ({
        opacity: 1,
        rotateY: 0,
        y: 0,
        transition: { ...snap, delay: waveDelay(c) },
      }),
    },
  },

  /** Glitch: harter Versatz mit Nachschlägen, bevor alles einrastet. */
  glitchSlice: {
    scrub: { skewY: [-2, 0], scale: [1.04, 1] },
    heading: {
      hidden: { opacity: 0, x: -60, skewX: 30 },
      visible: (c: number) => ({
        opacity: [0, 1, 0.2, 1],
        x: [-60, 26, -10, 0],
        skewX: [30, -18, 6, 0],
        transition: { duration: 0.5, times: [0, 0.4, 0.7, 1], delay: c * 0.025 },
      }),
    },
    card: {
      hidden: { opacity: 0, x: 0, scaleY: 0.08 },
      visible: ({ i }: CardCustom) => ({
        opacity: [0, 1, 0.35, 1],
        x: [i % 2 ? 90 : -90, i % 2 ? -34 : 34, 14, 0],
        scaleY: [0.08, 0.6, 1.06, 1],
        transition: { duration: 0.55, times: [0, 0.35, 0.7, 1], delay: i * 0.04 },
      }),
    },
  },

  /** Magnet: die Karten werden aus den vier Bildschirmecken eingesammelt. */
  cornerMagnet: {
    scrub: { scale: [0.88, 1], rotate: [-2, 0] },
    heading: {
      hidden: { opacity: 0, scale: 0.3, x: -200, y: -120 },
      visible: (c: number) => ({
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        transition: { ...snap, delay: c * 0.035 },
      }),
    },
    card: {
      hidden: ({ i }: CardCustom) => ({
        opacity: 0,
        x: i % 4 < 2 ? -700 : 700,
        y: i % 2 === 0 ? -480 : 480,
        rotate: i % 4 < 2 ? -35 : 35,
        scale: 0.5,
      }),
      visible: ({ i }: CardCustom) => ({
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        transition: { ...snap, delay: i * 0.05 },
      }),
    },
  },

  /** Flut: das Raster wird von unten nach oben freigespült. */
  liquidRise: {
    scrub: { y: [90, 0], scale: [1.05, 1] },
    heading: {
      hidden: { opacity: 0, scaleY: 0.05, y: 50, transformOrigin: "50% 100%" },
      visible: (c: number) => ({
        opacity: 1,
        scaleY: 1,
        y: 0,
        transition: { ...glide, delay: c * 0.04 },
      }),
    },
    card: {
      hidden: { opacity: 0, scaleY: 0.04, y: 180, scaleX: 1.12, transformOrigin: "50% 100%" },
      visible: (c: CardCustom) => ({
        opacity: 1,
        scaleY: 1,
        y: 0,
        scaleX: 1,
        transition: { ...glide, delay: waveDelay(c) },
      }),
    },
  },
} satisfies Record<string, ScrollVariantSpec>;

export type ScrollVariantId = keyof typeof SCROLL_VARIANTS;

/** Feste Zuordnung Kategorie → Animation. Benachbarte Sections bekommen bewusst
 *  unterschiedliche Choreografien, damit sich beim Durchscrollen nichts wiederholt. */
const CATEGORY_VARIANTS: Record<string, ScrollVariantId> = {
  // Speisen (Reihenfolge im Food-Tab)
  "nudel-reisboxen": "cinemaZoom",
  vorspeisen: "deckFan",
  "thai-curry": "flipDeck",
  "süss-sauer": "splitSwipe",
  "soja-sosse": "spiralIn",
  "erdnuss-sosse": "elasticDrop",
  "mango-sosse": "curtainWipe",
  "gebratener-reis": "depthTunnel",
  bowls: "waveRoll",
  kem: "glitchSlice",
  kids: "cornerMagnet",
  // Getränke (Reihenfolge im Drinks-Tab)
  "matcha-getraenke": "liquidRise",
  "ca-phe": "depthTunnel",
  "tra-eistee": "waveRoll",
  soda: "glitchSlice",
  smoothies: "spiralIn",
  softgetraenke: "cornerMagnet",
};

const FALLBACK_ORDER: ScrollVariantId[] = [
  "cinemaZoom", "deckFan", "flipDeck", "splitSwipe", "spiralIn", "elasticDrop",
  "curtainWipe", "depthTunnel", "waveRoll", "glitchSlice", "cornerMagnet", "liquidRise",
];

export function variantForCategory(categoryId: string, index: number): ScrollVariantSpec {
  const id = CATEGORY_VARIANTS[categoryId] ?? FALLBACK_ORDER[index % FALLBACK_ORDER.length];
  return SCROLL_VARIANTS[id];
}
