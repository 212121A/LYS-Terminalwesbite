import { Children, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { ScrollVariantSpec } from "./scrollVariants";

interface ScrollSectionProps {
  categoryId: string;
  title: string;
  spec: ScrollVariantSpec;
  /** Scrollbarer Menü-Container — Bezug für Scroll-Fortschritt und Sichtbarkeit. */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Wird an den Scroll-Spy / die Kategorie-Navigation zurückgemeldet. */
  registerRef: (el: HTMLDivElement | null) => void;
  gridClassName: string;
  cols: number;
  note?: ReactNode;
  children: ReactNode;
}

/** Zerlegt die Überschrift in animierbare Zeichen. Leerzeichen bleiben als
 *  eigene Spans erhalten, damit die Wortabstände nicht kollabieren. */
function chars(title: string) {
  return Array.from(title);
}

export function ScrollSection({
  categoryId,
  title,
  spec,
  containerRef,
  registerRef,
  gridClassName,
  cols,
  note,
  children,
}: ScrollSectionProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: innerRef,
    offset: ["start end", "start 0.75"],
  });

  const { scale, y, rotate, rotateX, skewY } = spec.scrub;
  const scaleV = useTransform(scrollYProgress, [0, 1], scale ?? [1, 1]);
  const yV = useTransform(scrollYProgress, [0, 1], y ?? [0, 0]);
  const rotateV = useTransform(scrollYProgress, [0, 1], rotate ?? [0, 0]);
  const rotateXV = useTransform(scrollYProgress, [0, 1], rotateX ?? [0, 0]);
  const skewYV = useTransform(scrollYProgress, [0, 1], skewY ?? [0, 0]);

  const inView = useInView(innerRef, { root: containerRef, amount: 0.12, once: true });
  const state = inView ? "visible" : "hidden";

  /** Ohne vorab promotete Ebenen rastert Chrome die großen Produktfotos während
   *  der Einflüge jeden Frame neu (p95 ~52ms statt ~17ms). `will-change` fällt
   *  nach der Choreografie wieder weg, damit die Ebenen nicht dauerhaft
   *  GPU-Speicher belegen. */
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = window.setTimeout(() => setSettled(true), 1800);
    return () => window.clearTimeout(t);
  }, [inView]);

  const cards = Children.toArray(children);

  if (reduced) {
    return (
      <div key={categoryId} data-category-id={categoryId} ref={registerRef} className="mb-10 lys-cv-section">
        <div className="flex items-baseline gap-4 mb-5 pt-2">
          <h2 className="lys-display text-[44px] min-[1600px]:text-[88px] font-semibold text-primary shrink-0 leading-tight">
            {title}
          </h2>
          <div className="flex-1 h-px bg-primary/20" />
        </div>
        {note}
        <div className={gridClassName}>{cards}</div>
      </div>
    );
  }

  return (
    <div data-category-id={categoryId} ref={registerRef} className="mb-10">
      <motion.div
        ref={innerRef}
        style={{
          scale: scale ? scaleV : undefined,
          y: y ? yV : undefined,
          rotate: rotate ? rotateV : undefined,
          rotateX: rotateX ? rotateXV : undefined,
          skewY: skewY ? skewYV : undefined,
          ...(rotateX ? { transformPerspective: 1600 } : null),
        }}
      >
        <div className="flex items-baseline gap-4 mb-5 pt-2">
          <motion.h2
            initial="hidden"
            animate={state}
            className="lys-display text-[44px] min-[1600px]:text-[88px] font-semibold text-primary shrink-0 leading-tight flex"
            style={spec.heading3d ? { transformStyle: "preserve-3d", perspective: 800 } : undefined}
          >
            {chars(title).map((ch, i) => (
              <motion.span
                key={`${categoryId}-${i}`}
                custom={i}
                variants={spec.heading}
                className="inline-block whitespace-pre"
              >
                {ch}
              </motion.span>
            ))}
          </motion.h2>
          <motion.div
            className="flex-1 h-px bg-primary/20 origin-left"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </div>

        {note}

        <motion.div
          className={gridClassName}
          initial="hidden"
          animate={state}
          variants={{ hidden: {}, visible: {} }}
          style={spec.perspective ? { perspective: spec.perspective } : undefined}
        >
          {cards.map((card, i) => (
            <motion.div
              key={i}
              custom={{ i, cols }}
              variants={spec.card}
              className="h-full [&>*]:h-full"
              style={settled ? undefined : { willChange: "transform, opacity" }}
            >
              {card}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
