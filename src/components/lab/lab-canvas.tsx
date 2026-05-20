"use client";

/* Pure SVG ambient rings — replaces R3F which conflicts with React 18.3.x internals.
   Achieves the same atmospheric effect: thin wire rings rotating slowly at low opacity. */
export default function LabCanvas() {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
      aria-hidden
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1000 560"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        {/* Instrumentation blue ring — right quadrant */}
        <ellipse
          cx="780" cy="210" rx="205" ry="205"
          fill="none"
          stroke="#7FB7C9"
          strokeWidth="0.9"
          opacity="0.13"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "ambient-rotate 52s linear infinite",
          }}
        />

        {/* Steel ring — left, tilted (rx ≠ ry = perspective illusion) */}
        <ellipse
          cx="155" cy="390" rx="290" ry="155"
          fill="none"
          stroke="#7A848E"
          strokeWidth="0.65"
          opacity="0.07"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "ambient-rotate 74s linear infinite reverse",
          }}
        />

        {/* Sensor-glow outer ring — top-center, wide */}
        <ellipse
          cx="500" cy="80" rx="370" ry="125"
          fill="none"
          stroke="#A8D8E8"
          strokeWidth="0.5"
          opacity="0.05"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "ambient-rotate 95s linear infinite",
          }}
        />

        {/* Extra fine ring — lower right */}
        <ellipse
          cx="870" cy="460" rx="130" ry="130"
          fill="none"
          stroke="#7FB7C9"
          strokeWidth="0.5"
          opacity="0.07"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "ambient-rotate 38s linear infinite reverse",
          }}
        />
      </svg>
    </div>
  );
}
