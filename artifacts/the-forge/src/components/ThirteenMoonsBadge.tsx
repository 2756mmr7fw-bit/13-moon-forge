interface ThirteenMoonsBadgeProps {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}

export function ThirteenMoonsBadge({ size = 48, tone = "dark", className }: ThirteenMoonsBadgeProps) {
  const isDark = tone === "dark";

  // dark = oxblood/cream wax seal (for light backgrounds)
  // light = cream/soft variant (for dark backgrounds)
  const discFill      = isDark ? "#5c1a1a" : "#f5ede0";
  const rimColor      = isDark ? "#8b3a3a" : "#c8a97e";
  const rimInner      = isDark ? "#3d0f0f" : "#e8d5b7";
  const textColor     = isDark ? "#f5ede0" : "#5c1a1a";
  const MColor        = isDark ? "#f5ede0" : "#5c1a1a";
  const XIIIColor     = isDark ? "#c8a97e" : "#8b3a3a";
  const crescentFill  = isDark ? "#f5ede0" : "#5c1a1a";
  const dotColor      = isDark ? "#c8a97e" : "#8b3a3a";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Thirteen Moons Sovereign Seal"
    >
      <defs>
        {/* Circular text path for rim label */}
        <path
          id="rimPath"
          d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
        />
      </defs>

      {/* Outer wax-seal disc */}
      <circle cx="60" cy="60" r="58" fill={rimColor} />

      {/* Main disc */}
      <circle cx="60" cy="60" r="54" fill={discFill} />

      {/* Inner rim ring */}
      <circle cx="60" cy="60" r="49" stroke={rimInner} strokeWidth="1" fill="none" />
      <circle cx="60" cy="60" r="46" stroke={rimColor} strokeWidth="0.5" fill="none" strokeDasharray="1.5 2.5" />

      {/* Rim text: "THIRTEEN MOONS · SOVEREIGN DIGITAL" */}
      <text
        fontSize="7"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        letterSpacing="2.6"
        fill={textColor}
      >
        <textPath href="#rimPath" startOffset="4%">
          THIRTEEN MOONS · SOVEREIGN DIGITAL ·
        </textPath>
      </text>

      {/* Left crescent flank */}
      <g transform="translate(18, 52)">
        <circle cx="0" cy="8" r="6" fill={crescentFill} />
        <circle cx="3" cy="6" r="4.8" fill={discFill} />
      </g>

      {/* Right crescent flank */}
      <g transform="translate(102, 52) scale(-1,1)">
        <circle cx="0" cy="8" r="6" fill={crescentFill} />
        <circle cx="3" cy="6" r="4.8" fill={discFill} />
      </g>

      {/* Central serif M */}
      <text
        x="60"
        y="67"
        textAnchor="middle"
        fontSize="38"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fill={MColor}
        letterSpacing="-1"
      >
        M
      </text>

      {/* XIII below M */}
      <text
        x="60"
        y="81"
        textAnchor="middle"
        fontSize="9.5"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="600"
        fill={XIIIColor}
        letterSpacing="3"
      >
        XIII
      </text>

      {/* Thin rule above M */}
      <line x1="34" y1="34" x2="86" y2="34" stroke={dotColor} strokeWidth="0.75" opacity="0.7" />

      {/* Dot accents on rule */}
      <circle cx="60" cy="34" r="1.5" fill={dotColor} opacity="0.9" />
      <circle cx="34" cy="34" r="1.2" fill={dotColor} opacity="0.6" />
      <circle cx="86" cy="34" r="1.2" fill={dotColor} opacity="0.6" />

      {/* Thin rule below XIII */}
      <line x1="38" y1="86" x2="82" y2="86" stroke={dotColor} strokeWidth="0.75" opacity="0.7" />
    </svg>
  );
}
