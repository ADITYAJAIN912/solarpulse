/**
 * SolarIllustration — premium animated SVG hero graphic.
 *
 * Layers:
 *  1. Sun with pulsing glow + rotating rays
 *  2. Solar-panel array (3×5 cells) with a diagonal shimmer sweep
 *  3. Animated energy-flow dots descending from the panel
 *  4. Ambient gradient cloud below the panel
 *
 * All animations are pure CSS inside a <style> block so the component
 * has zero extra runtime dependencies.
 */

export default function SolarIllustration({
  className = '',
}: {
  className?: string
}) {
  /* ── cell geometry ───────────────────────────────────────────────── */
  const cols = 5
  const rows = 3
  const cw = 30   // cell width
  const ch = 22   // cell height
  const cg = 4    // gap between cells
  const px = 14   // panel padding x
  const py = 14   // panel padding y
  const panelW = cols * (cw + cg) - cg + px * 2   // 208
  const panelH = rows * (ch + cg) - cg + py * 2   // 110

  /* panel top-left corner inside a 260×320 viewport */
  const panelX = (260 - panelW) / 2   // ≈ 26
  const panelY = 110

  const cells: { x: number; y: number; idx: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: panelX + px + c * (cw + cg),
        y: panelY + py + r * (ch + cg),
        idx: r * cols + c,
      })
    }
  }

  /* energy-dot positions (3 dots travelling the same path) */
  const dotOffsets = [0, 33, 66]  // % stagger

  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 260 320"
        width="260"
        height="320"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* ── Panel cell gradient ──────────────────────────────────── */}
          <linearGradient id="cellGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#1e3a8a" />
            <stop offset="60%"  stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* ── Shimmer sweep gradient ───────────────────────────────── */}
          <linearGradient id="shimmerGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="white" stopOpacity="0" />
            <stop offset="40%"  stopColor="white" stopOpacity="0.18" />
            <stop offset="60%"  stopColor="white" stopOpacity="0.28" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* ── Clip for the panel area ──────────────────────────────── */}
          <clipPath id="panelClip">
            <rect
              x={panelX} y={panelY}
              width={panelW} height={panelH}
              rx="10"
            />
          </clipPath>

          {/* ── Sun glow radial ─────────────────────────────────────── */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#fde68a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>

          {/* ── Ground ambient glow ──────────────────────────────────── */}
          <radialGradient id="groundGlow" cx="50%" cy="0%" r="50%">
            <stop offset="0%"   stopColor="#16a34a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* ── Energy dot gradient ──────────────────────────────────── */}
          <radialGradient id="dotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
          </radialGradient>
        </defs>

        {/* ── CSS animations ───────────────────────────────────────── */}
        <style>{`
          @keyframes sun-pulse {
            0%, 100% { r: 30; opacity: 0.35; }
            50%       { r: 42; opacity: 0.12; }
          }
          @keyframes sun-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes shimmer-sweep {
            0%   { transform: translateX(-${panelW + 40}px); }
            60%  { transform: translateX(${panelW + 40}px); }
            100% { transform: translateX(${panelW + 40}px); }
          }
          @keyframes cell-breathe {
            0%, 100% { opacity: 0.82; }
            50%       { opacity: 1; }
          }
          @keyframes ray-blink {
            0%, 100% { opacity: 0.55; stroke-dashoffset: 0; }
            50%       { opacity: 1;    stroke-dashoffset: -6; }
          }
          @keyframes dot-fall {
            0%   { cy: ${panelY + panelH}; opacity: 0; }
            8%   { opacity: 1; }
            85%  { opacity: 1; }
            100% { cy: 300; opacity: 0; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-7px); }
          }
          @keyframes panel-glow {
            0%, 100% { opacity: 0; }
            50%       { opacity: 1; }
          }

          .solar-float { animation: float 4s ease-in-out infinite; }
          .sun-glow-ring { animation: sun-pulse 2.8s ease-in-out infinite; }
          .rays-group { transform-origin: 130px 58px; animation: sun-spin 20s linear infinite; }
          .shimmer-rect { animation: shimmer-sweep 3.5s ease-in-out 1.2s infinite; }
          .panel-ambient { animation: panel-glow 3s ease-in-out infinite; }
        `}</style>

        {/* ════ FLOATING GROUP ════════════════════════════════════════ */}
        <g className="solar-float">

          {/* ── Ground ambient glow ──────────────────────────────────── */}
          <ellipse
            cx="130" cy="295" rx="100" ry="22"
            fill="url(#groundGlow)"
          />

          {/* ── Sun glow ring ────────────────────────────────────────── */}
          <circle
            className="sun-glow-ring"
            cx="130" cy="58"
            r="30"
            fill="url(#sunGlow)"
          />

          {/* ── Sun body ─────────────────────────────────────────────── */}
          <circle cx="130" cy="58" r="16" fill="#fde68a" />
          <circle cx="130" cy="58" r="13" fill="#fbbf24" />
          <circle cx="130" cy="58" r="10" fill="#f59e0b" opacity="0.9" />

          {/* ── Rays ─────────────────────────────────────────────────── */}
          <g className="rays-group">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
              const rad = (deg * Math.PI) / 180
              const x1 = 130 + 20 * Math.cos(rad)
              const y1 = 58  + 20 * Math.sin(rad)
              const x2 = 130 + 30 * Math.cos(rad)
              const y2 = 58  + 30 * Math.sin(rad)
              return (
                <line
                  key={deg}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#fcd34d"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.85"
                  style={{
                    animation: `ray-blink 2s ease-in-out ${i * 0.22}s infinite`,
                  }}
                />
              )
            })}
          </g>

          {/* ── Panel body ────────────────────────────────────────────── */}
          <rect
            x={panelX} y={panelY}
            width={panelW} height={panelH}
            rx="10"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* ── Panel cells ───────────────────────────────────────────── */}
          {cells.map(({ x, y, idx }) => (
            <g key={idx}>
              <rect
                x={x} y={y} width={cw} height={ch}
                rx="3"
                fill="url(#cellGrad)"
                stroke="#3b82f6"
                strokeWidth="0.6"
                style={{
                  animation: `cell-breathe 2.5s ease-in-out ${(idx * 0.12) % 2}s infinite`,
                }}
              />
              {/* Cell mini reflection dot */}
              <rect
                x={x + 3} y={y + 3}
                width={4} height={2}
                rx="1"
                fill="white"
                opacity="0.18"
              />
            </g>
          ))}

          {/* ── Shimmer sweep overlay ────────────────────────────────── */}
          <g clipPath="url(#panelClip)">
            <rect
              className="shimmer-rect"
              x={panelX - 60} y={panelY}
              width={80} height={panelH}
              fill="url(#shimmerGrad)"
            />
          </g>

          {/* ── Panel top border highlight ────────────────────────────── */}
          <rect
            x={panelX} y={panelY}
            width={panelW} height="2"
            rx="10"
            fill="white"
            opacity="0.08"
          />

          {/* ── Energy flow line (center-bottom of panel → bottom) ────── */}
          <line
            x1="130" y1={panelY + panelH}
            x2="130" y2="292"
            stroke="#4ade80"
            strokeWidth="1.5"
            strokeDasharray="4 5"
            opacity="0.5"
          />

          {/* ── Energy dots ───────────────────────────────────────────── */}
          {dotOffsets.map((offset, i) => (
            <circle
              key={i}
              cx="130"
              cy={panelY + panelH}
              r="3.5"
              fill="url(#dotGrad)"
              filter="url(#dotBlur)"
              style={{
                animation: `dot-fall 2.4s ease-in ${(offset / 100) * 2.4}s infinite`,
              }}
            />
          ))}

          {/* ── Status badge ──────────────────────────────────────────── */}
          <rect
            x="95" y="282"
            width="70" height="22"
            rx="11"
            fill="#f0fdf4"
            stroke="#86efac"
            strokeWidth="1"
          />
          <circle cx="110" cy="293" r="3.5" fill="#22c55e">
            <animate
              attributeName="r"
              values="3.5;5;3.5"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.4;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <text
            x="130" y="297.5"
            textAnchor="middle"
            fill="#15803d"
            fontSize="9.5"
            fontWeight="700"
            fontFamily="'Space Grotesk', sans-serif"
            letterSpacing="0.04em"
          >
            LIVE · GENERATING
          </text>

        </g>
        {/* ════ end floating group ════ */}
      </svg>
    </div>
  )
}
