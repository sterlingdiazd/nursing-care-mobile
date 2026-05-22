import Svg, { Defs, LinearGradient as SvgGradient, Path, Polyline, Stop } from "react-native-svg";
import { financeTheme } from "./financeTheme";

/** Tiny inline area+line chart for KPI trends. SVG-based for predictable sizing. */
export function Sparkline({
  values,
  width = 120,
  height = 40,
  color = financeTheme.accent,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2] as const);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area =
    `M ${pts[0][0].toFixed(1)},${height} ` +
    pts.map((p) => `L ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") +
    ` L ${pts[pts.length - 1][0].toFixed(1)},${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={area} fill="url(#sparkFill)" />
      <Polyline points={line} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
