type ThirteenMoonsBadgeProps = {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
  title?: string;
};
export function ThirteenMoonsBadge({
  size = 64,
  tone = "dark",
  className,
  title = "Sealed by 13 Moons — Sovereign Digital",
}: ThirteenMoonsBadgeProps) {
  const ink = tone === "dark" ? "#1a0f08" : "#f7ecd2";
  const seal = tone === "dark" ? "#7a1f1f" : "#3a1010";
  const sealLight = tone === "dark" ? "#a73838" : "#5a1a1a";
  const cream = tone === "dark" ? "#f7ecd2" : "#1a0f08";
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <defs>
        <radialGradient id="tmb-bevel" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={sealLight} />
          <stop offset="100%" stopColor={seal} />
        </radialGradient>
        <path id="tmb-arc-top" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" />
        <path id="tmb-arc-bot" d="M 32 105 A 68 68 0 0 0 168 105" fill="none" />
      </defs>
      <circle cx={100} cy={100} r={92} fill={ink} />
      <circle cx={100} cy={100} r={84} fill="url(#tmb-bevel)" />
      <circle cx={100} cy={100} r={62} fill="none" stroke={cream} strokeWidth={1.2} opacity={0.55} />
      <circle cx={100} cy={100} r={66} fill="none" stroke={cream} strokeWidth={0.6} opacity={0.4} />
      <text fill={cream} fontFamily="Cinzel, Georgia, serif" fontWeight={600} fontSize={10} letterSpacing={4}>
        <textPath href="#tmb-arc-top" startOffset="50%" textAnchor="middle">· THIRTEEN MOONS ·</textPath>
      </text>
      <text fill={cream} fontFamily="Cinzel, Georgia, serif" fontWeight={600} fontSize={9} letterSpacing={5} opacity={0.85}>
        <textPath href="#tmb-arc-bot" startOffset="50%" textAnchor="middle" side="right">· SOVEREIGN DIGITAL ·</textPath>
      </text>
      <g opacity={0.85}>
        <path d="M 38 100 a 8 8 0 1 0 6 0 a 6 6 0 1 1 -6 0" fill={cream} />
        <path d="M 162 100 a 8 8 0 1 1 -6 0 a 6 6 0 1 0 6 0" fill={cream} />
      </g>
      <text x={100} y={120} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight={700} fontSize={64} fill={cream} letterSpacing={-2}>M</text>
      <text x={100} y={138} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight={600} fontSize={9} fill={cream} letterSpacing={3} opacity={0.85}>XIII</text>
    </svg>
  );
}
export default ThirteenMoonsBadge;
