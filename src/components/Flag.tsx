import type { ReactElement } from "react";

// Country flags on a pole, drawn like the Nigerian flag in Illustration.tsx (same pole, knob, ground line
// and ink outline), shown with the answer in revision and the test. A card picks one with `flag: "<code>"`.

const INK = "#2b2118";
const line = { stroke: INK, strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// The cloth fills x 26–104, y 12–51 (78 × 39).
const X = 26;
const Y = 12;
const W = 78;
const H = 39;

/** A five-pointed star centred on (cx, cy). */
function star(cx: number, cy: number, r: number, fill: string, rotate = 0) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2 + (rotate * Math.PI) / 180;
    const radius = i % 2 === 0 ? r : r * 0.4;
    return `${(cx + radius * Math.cos(a)).toFixed(2)},${(cy + radius * Math.sin(a)).toFixed(2)}`;
  });
  return <polygon points={points.join(" ")} fill={fill} />;
}

/** Horizontal bands, top to bottom. */
const bands = (colors: string[]) =>
  colors.map((c, i) => <rect key={c + i} x={X} y={Y + (H / colors.length) * i} width={W} height={H / colors.length} fill={c} />);

export const FLAGS: Record<string, { label: string; cloth: ReactElement }> = {
  india: {
    label: "The flag of India: saffron, white and green, with a blue wheel",
    cloth: (
      <>
        {bands(["#ff9933", "#ffffff", "#138808"])}
        <circle cx={X + W / 2} cy={Y + H / 2} r={5} fill="none" stroke="#000080" strokeWidth={1.6} />
        <circle cx={X + W / 2} cy={Y + H / 2} r={1.2} fill="#000080" />
      </>
    ),
  },
  china: {
    label: "The flag of China: red with yellow stars",
    cloth: (
      <>
        <rect x={X} y={Y} width={W} height={H} fill="#de2910" />
        {star(X + 13, Y + 11, 7, "#ffde00")}
        {star(X + 25, Y + 5, 2.4, "#ffde00", 20)}
        {star(X + 29, Y + 10, 2.4, "#ffde00", 45)}
        {star(X + 29, Y + 16, 2.4, "#ffde00", 0)}
        {star(X + 25, Y + 21, 2.4, "#ffde00", 20)}
      </>
    ),
  },
  "united-states": {
    label: "The flag of the United States: red and white stripes, white stars on blue",
    cloth: (
      <>
        {bands(["#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234"])}
        <rect x={X} y={Y} width={32} height={(H / 7) * 4} fill="#3c3b6e" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => <circle key={`${r}-${c}`} cx={X + 5 + c * 7.5} cy={Y + 4.5 + r * 6.5} r={1.3} fill="#ffffff" />),
        )}
      </>
    ),
  },
  indonesia: {
    label: "The flag of Indonesia: red over white",
    cloth: <>{bands(["#ce1126", "#ffffff"])}</>,
  },
  pakistan: {
    label: "The flag of Pakistan: green with a white crescent and star, white band at the pole",
    cloth: (
      <>
        <rect x={X} y={Y} width={W} height={H} fill="#01411c" />
        <rect x={X} y={Y} width={W / 4} height={H} fill="#ffffff" />
        <circle cx={X + 52} cy={Y + 20} r={11} fill="#ffffff" />
        <circle cx={X + 56} cy={Y + 17} r={9.5} fill="#01411c" />
        {star(X + 60, Y + 14, 4, "#ffffff", 30)}
      </>
    ),
  },
  nigeria: {
    label: "The flag of Nigeria: green, white, green",
    cloth: (
      <>
        <rect x={X} y={Y} width={W / 3} height={H} fill="#008751" />
        <rect x={X + W / 3} y={Y} width={W / 3} height={H} fill="#ffffff" />
        <rect x={X + (W / 3) * 2} y={Y} width={W / 3} height={H} fill="#008751" />
      </>
    ),
  },
  brazil: {
    label: "The flag of Brazil: green with a yellow diamond and a blue globe",
    cloth: (
      <>
        <rect x={X} y={Y} width={W} height={H} fill="#009c3b" />
        <polygon points={`${X + 6},${Y + H / 2} ${X + W / 2},${Y + 5} ${X + W - 6},${Y + H / 2} ${X + W / 2},${Y + H - 5}`} fill="#ffdf00" />
        <circle cx={X + W / 2} cy={Y + H / 2} r={9} fill="#002776" />
        <path d={`M${X + W / 2 - 9} ${Y + H / 2 - 1} q9 -4 18 2`} fill="none" stroke="#ffffff" strokeWidth={1.4} />
      </>
    ),
  },
  bangladesh: {
    label: "The flag of Bangladesh: green with a red circle",
    cloth: (
      <>
        <rect x={X} y={Y} width={W} height={H} fill="#006a4e" />
        <circle cx={X + 35} cy={Y + H / 2} r={11} fill="#f42a41" />
      </>
    ),
  },
  russia: {
    label: "The flag of Russia: white, blue and red",
    cloth: <>{bands(["#ffffff", "#0039a6", "#d52b1e"])}</>,
  },
  ethiopia: {
    label: "The flag of Ethiopia: green, yellow and red, with a blue circle and a yellow star",
    cloth: (
      <>
        {bands(["#078930", "#fcdd09", "#da121a"])}
        <circle cx={X + W / 2} cy={Y + H / 2} r={8.5} fill="#0f47af" />
        {star(X + W / 2, Y + H / 2 + 0.5, 6, "#fcdd09")}
      </>
    ),
  },
};

/** A country's flag on its pole, or nothing for an unknown code. */
export function Flag({ code, className }: { code: string; className?: string }) {
  const flag = FLAGS[code];
  if (!flag) return null;
  return (
    <svg viewBox="0 0 120 90" role="img" aria-label={flag.label} className={className}>
      <line x1={4} y1={84} x2={116} y2={84} {...line} />
      <line x1={24} y1={84} x2={24} y2={8} stroke="#6e3f17" strokeWidth={4} strokeLinecap="round" />
      <circle cx={24} cy={7} r={3.5} fill="#f2c14e" stroke={INK} strokeWidth={1.5} />
      {flag.cloth}
      <rect x={X} y={Y} width={W} height={H} fill="none" {...line} />
    </svg>
  );
}
