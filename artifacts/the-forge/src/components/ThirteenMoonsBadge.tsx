interface ThirteenMoonsBadgeProps {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}

export function ThirteenMoonsBadge({ size = 48, tone = "dark", className }: ThirteenMoonsBadgeProps) {
  const isDark = tone === "dark";

  const ringColor     = isDark ? "#1a1006" : "#ffffff";
  const outerRing     = isDark ? "#f97316" : "rgba(255,255,255,0.9)";
  const innerRing     = isDark ? "#7c3400" : "rgba(255,255,255,0.45)";
  const textColor     = isDark ? "#f97316" : "#ffffff";
  const accentColor   = isDark ? "#f97316" : "#fbbf24";
  const moonFill      = isDark ? "#f97316" : "#ffffff";
  const moonShadow    = isDark ? "#1a1006" : "rgba(255,180,60,0.55)";
  const dotColor      = isDark ? "#f97316" : "rgba(255,255,255,0.7)";

  const cx = 60;
  const cy = 60;
  const r  = 60;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="13 Moon Forge seal"
    >
      {/* Background disc */}
      <circle cx={cx} cy={cy} r={r} fill={ringColor} />

      {/* Outer border ring */}
      <circle cx={cx} cy={cy} r={57} stroke={outerRing} strokeWidth="1.5" fill="none" />

      {/* Inner decorative ring */}
      <circle cx={cx} cy={cy} r={50} stroke={innerRing} strokeWidth="0.75" fill="none" strokeDasharray="2 3" />

      {/* Circular text path — top arc: "THIRTEEN MOONS" */}
      <defs>
        <path
          id="topArc"
          d={`M ${cx - 44},${cy} A 44,44 0 0,1 ${cx + 44},${cy}`}
        />
        <path
          id="bottomArc"
          d={`M ${cx - 40},${cy + 4} A 40,40 0 0,0 ${cx + 40},${cy + 4}`}
        />
      </defs>

      <text fontSize="8.5" fontFamily="serif" fontWeight="700" letterSpacing="2.8" fill={textColor}>
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          THIRTEEN MOONS
        </textPath>
      </text>

      <text fontSize="7" fontFamily="serif" fontWeight="600" letterSpacing="2.4" fill={textColor} opacity="0.85">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
          SOVEREIGN DIGITAL
        </textPath>
      </text>

      {/* Dot separators */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * 90 - 45) * (Math.PI / 180);
        const rx = cx + 44 * Math.cos(angle);
        const ry = cy + 44 * Math.sin(angle);
        return <circle key={i} cx={rx} cy={ry} r="1.2" fill={dotColor} />;
      })}

      {/* Central crescent moon */}
      <circle cx={cx} cy={cy - 4} r="14" fill={moonFill} />
      <circle cx={cx + 6} cy={cy - 7} r="11" fill={moonShadow} />

      {/* "13" numeral below moon */}
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        fontSize="10"
        fontFamily="serif"
        fontWeight="800"
        fill={accentColor}
        letterSpacing="1"
      >
        13
      </text>

      {/* Small accent line under 13 */}
      <line x1={cx - 8} y1={cy + 23} x2={cx + 8} y2={cy + 23} stroke={accentColor} strokeWidth="0.75" opacity="0.6" />
    </svg>
  );
}
