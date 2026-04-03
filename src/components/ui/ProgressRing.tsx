interface ProgressRingProps {
  percentage: number;
}

export function ProgressRing({ percentage }: ProgressRingProps) {
  const r = 34;
  const C = 2 * Math.PI * r;
  const offset = C - (percentage / 100 * C);

  return (
    <div className="ring-wrap">
      <svg className="ring-svg" width="80" height="80" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b0000" />
            <stop offset="100%" stopColor="#c9a84c" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="40" cy="40" r={r} />
        <circle className="ring-fill" cx="40" cy="40" r={r} strokeDasharray={C} strokeDashoffset={offset} />
      </svg>
      <div className="ring-txt">{percentage}%</div>
    </div>
  );
}
