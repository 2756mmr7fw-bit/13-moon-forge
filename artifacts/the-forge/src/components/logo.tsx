interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 36, className = "" }: LogoMarkProps) {
  const r = size / 2;
  const dotR = size * 0.045;
  const orbitR = r * 0.88;
  const count = 13;

  const dots = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return {
      x: r + orbitR * Math.cos(angle),
      y: r + orbitR * Math.sin(angle),
      opacity: 0.35 + ((i % 4) * 0.2),
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="moonGlow" cx="42%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0.6" />
        </radialGradient>
        <filter id="emberBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
        </filter>
        <filter id="coreBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" />
        </filter>
      </defs>

      {/* Outer glow ring */}
      <circle cx={r} cy={r} r={orbitR} stroke="url(#moonGlow)" strokeWidth={size * 0.06} fill="none" />

      {/* 13 ember dots in orbit */}
      {dots.map((dot, i) => (
        <g key={i}>
          {/* Glow halo behind each dot */}
          <circle
            cx={dot.x}
            cy={dot.y}
            r={dotR * 2.2}
            fill="#fb923c"
            opacity={dot.opacity * 0.35}
            filter="url(#emberBlur)"
          />
          {/* Core dot */}
          <circle
            cx={dot.x}
            cy={dot.y}
            r={dotR}
            fill="url(#dotGlow)"
            opacity={dot.opacity}
          />
        </g>
      ))}

      {/* Crescent moon — two overlapping circles */}
      <circle cx={r} cy={r} r={r * 0.46} fill="#fb923c" opacity="0.9" />
      <circle cx={r + r * 0.22} cy={r - r * 0.06} r={r * 0.38} fill="#0f0a09" />

      {/* Subtle ember core glow on the crescent */}
      <circle cx={r - r * 0.08} cy={r} r={r * 0.14} fill="#fbbf24" opacity="0.15" filter="url(#coreBlur)" />
    </svg>
  );
}

export function LogoWordmark({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div className="flex flex-col leading-none">
        <span
          className="font-black tracking-widest text-foreground uppercase"
          style={{ fontSize: size * 0.36, letterSpacing: "0.12em" }}
        >
          13 Moon
        </span>
        <span
          className="font-black tracking-widest uppercase"
          style={{
            fontSize: size * 0.36,
            letterSpacing: "0.12em",
            background: "linear-gradient(90deg, #fb923c, #fbbf24)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Forge
        </span>
      </div>
    </div>
  );
}
