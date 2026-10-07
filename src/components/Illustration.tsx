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
  // Flat, no outlines (2026-10-07, modelled on a photo the team chose): a dark bowl of rice and tikka
  // masala, steaming, on the green doormat in front of a blue front door.
  "tikka-door": {
    label: "A steaming bowl of chicken tikka masala with rice, on the doormat in front of a blue front door",
    svg: (
      <>
        {/* Floor, door frame, door with two panels, brass letterbox and knob, threshold. */}
        <rect x={4} y={79} width={112} height={9} rx={2} fill="#dde1e7" />
        <rect x={56} y={4} width={50} height={76} rx={2} fill="#c9ced6" />
        <rect x={60} y={8} width={42} height={72} rx={1.5} fill="#2f5fbf" />
        <rect x={65} y={13} width={32} height={24} rx={1.5} fill="#3b6dd1" />
        <rect x={65} y={42} width={32} height={33} rx={1.5} fill="#3b6dd1" />
        <rect x={73} y={46} width={16} height={3} rx={1.5} fill="#e9b949" />
        <circle cx={96} cy={52} r={2.4} fill="#e9b949" />
        <rect x={54} y={77.5} width={54} height={3} rx={1} fill="#aab1bb" />
        {/* The doormat, green like the napkin in the photo, with a woven stripe. */}
        <path d="M20 79 H108 L113 87 H15 Z" fill="#7aa33a" />
        <path d="M22 82.5 H106" stroke="#5f8a2a" strokeWidth={1.4} />
        {/* Steam and bowl, moved down so the bowl stands on the doormat. */}
        <g transform="translate(0 7)">
        <path
          d="M36 33 q-3 -4 0 -8 q3 -4 0 -8 M46 30 q-3 -4 0 -8 q3 -4 0 -8 M56 33 q-3 -4 0 -8 q3 -4 0 -8"
          fill="none"
          stroke="#aeb4bd"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Bowl seen from above at an angle: the inside first, then rice and curry heaped above the rim, then the
            front of the bowl over their lower edge. */}
        <ellipse cx={46} cy={75.5} rx={24} ry={2.2} fill="#000" opacity={0.2} />
        <ellipse cx={46} cy={54} rx={27} ry={9} fill="#353941" />
        <path d="M21 57 Q21 40 33 38 Q46 37 51 47 L51 66 L23 66 Z" fill="#f6f4ef" />
        {[[28, 50, 20], [33, 45, -15], [39, 48, 10], [43, 43, 30], [30, 55, -25], [41, 54, 15], [36, 51, -5]].map(([cx, cy, r]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={1.8} ry={0.7} fill="#ddd8cd" transform={`rotate(${r} ${cx} ${cy})`} />
        ))}
        <path d="M36 66 Q38 52 46 46 Q53 39 61 40 Q71 42 72 56 L69 66 Z" fill="#de7a22" />
        {[
          [52, 46, 5, 3.6, "#f0973f"],
          [62, 45, 5.2, 3.6, "#c9641b"],
          [57, 52, 5, 3.4, "#e98a30"],
          [67, 51, 4.2, 3.1, "#f0973f"],
          [49, 54, 3.8, 2.8, "#c9641b"],
        ].map(([cx, cy, rx, ry, fill]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill as string} />
        ))}
        <path d="M48 48.5 q5 -2.6 10 0 q5 2.6 10 -0.8" fill="none" stroke="#fbe4c6" strokeWidth={1.5} strokeLinecap="round" />
        {[[56, 41.5, -30], [65, 48, 25], [51, 50, 40], [60, 55, -10]].map(([cx, cy, r]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={2} ry={1} fill="#4f9a3a" transform={`rotate(${r} ${cx} ${cy})`} />
        ))}
        <path d="M19 54 A27 9 0 0 0 73 54 Q71 74 46 75 Q21 74 19 54 Z" fill="#4b4f58" />
        <path d="M19 54 A27 9 0 0 0 73 54" fill="none" stroke="#6b717c" strokeWidth={1.6} />
        <path d="M25 63 Q29 70 38 72" fill="none" stroke="#5d626c" strokeWidth={2} strokeLinecap="round" />
        </g>
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
