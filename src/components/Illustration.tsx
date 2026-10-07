import type { ReactNode } from "react";
import type { IllustrationName } from "@/lib/types";

const INK = "#2b2118";
const line = { stroke: INK, strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Shoe({ x = 0 }: { x?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M8 80 L8 62 Q8 56 14 56 L28 56 Q32 64 42 65 L52 68 Q58 70 58 76 L58 80 Z" fill="#3b6ea5" {...line} />
      <path d="M34 62 l4 4 M40 64 l3 3.5" stroke="#f2efe8" strokeWidth={1.8} strokeLinecap="round" />
      <rect x={6} y={77} width={54} height={6} rx={3} fill="#f2efe8" stroke={INK} strokeWidth={2.2} />
      <ellipse cx={18} cy={57} rx={8} ry={2.6} fill="#1c3552" stroke={INK} strokeWidth={1.5} />
    </g>
  );
}

/** `tilt` fans a chopstick out (degrees, around its lower end) so a pair reads as a pair. */
function Chopstick({ x = 0, tilt = 0 }: { x?: number; tilt?: number }) {
  return (
    <g transform={`translate(${x} 0) rotate(${tilt} 18 57)`} stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
      <polygon points="16.5,57 19.5,57 33,11 27,10" fill="#f0cf8f" />
      <polygon points="25.3,19 31,19.5 33,11 27,10" fill="#d23c2f" />
    </g>
  );
}

const drawings: Record<IllustrationName, { label: string; svg: ReactNode }> = {
  "tikka-door": {
    label: "A bowl of tikka masala next to a front door",
    svg: (
      <>
        <line x1={4} y1={80} x2={116} y2={80} {...line} />
        <rect x={62} y={10} width={42} height={70} rx={3} fill="#a0612b" {...line} />
        <rect x={68} y={17} width={30} height={22} rx={2} fill="none" stroke="#6e3f17" strokeWidth={2} />
        <rect x={68} y={45} width={30} height={28} rx={2} fill="none" stroke="#6e3f17" strokeWidth={2} />
        <circle cx={97} cy={49} r={2.8} fill="#f2c14e" stroke={INK} strokeWidth={1.5} />
        <path d="M24 38 q-4 -5 0 -10 q4 -5 0 -10 M38 36 q-4 -5 0 -10 q4 -5 0 -10" fill="none" stroke="#9a948a" strokeWidth={2} strokeLinecap="round" />
        <path d="M13 66 Q15 44 32 42 Q49 44 51 66 Z" fill="#e4572e" {...line} />
        {[[25, 56], [36, 51], [42, 60], [31, 62]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.1} fill="#f6c28b" />
        ))}
        <ellipse cx={33} cy={45} rx={4} ry={2} fill="#4caf50" transform="rotate(-20 33 45)" />
        <path d="M9 64 H55 Q53 80 32 80 Q11 80 9 64 Z" fill="#3b6ea5" {...line} />
      </>
    ),
  },
  "shoes-chopsticks": {
    label: "A pair of shoes, with a pair of chopsticks standing in one of them",
    svg: (
      <>
        <line x1={2} y1={84} x2={118} y2={84} {...line} />
        <Shoe />
        <Shoe x={58} />
        <Chopstick x={-2} tilt={-4} />
        <Chopstick x={4} tilt={9} />
        <path d="M44 26 l5 -4 M48 36 h7 M44 46 l5 4" stroke="#e4572e" strokeWidth={2.5} strokeLinecap="round" />
      </>
    ),
  },
  "nigeria-flag": {
    label: "The flag of Nigeria: green, white, green",
    svg: (
      <>
        <line x1={4} y1={84} x2={116} y2={84} {...line} />
        <line x1={24} y1={84} x2={24} y2={8} stroke="#6e3f17" strokeWidth={4} strokeLinecap="round" />
        <circle cx={24} cy={7} r={3.5} fill="#f2c14e" stroke={INK} strokeWidth={1.5} />
        <rect x={26} y={12} width={26} height={39} fill="#008751" />
        <rect x={52} y={12} width={26} height={39} fill="#ffffff" />
        <rect x={78} y={12} width={26} height={39} fill="#008751" />
        <rect x={26} y={12} width={78} height={39} fill="none" {...line} />
      </>
    ),
  },
};

/** The cartoon on its own, without a bubble (the landing page's route preview). */
export function Drawing({ name, className }: { name: IllustrationName; className?: string }) {
  const drawing = drawings[name];
  return (
    <svg viewBox="0 0 120 90" role="img" aria-label={drawing.label} className={className}>
      {drawing.svg}
    </svg>
  );
}

/** A cartoon in a thought bubble that sticks out of the top corner of a card. */
export function ThoughtBubble({ name, side = "right" }: { name: IllustrationName; side?: "left" | "right" }) {
  const drawing = drawings[name];
  return (
    <div className={`bubble bubble-${side}`}>
      <svg viewBox="0 0 120 90" role="img" aria-label={drawing.label}>
        {drawing.svg}
      </svg>
    </div>
  );
}
