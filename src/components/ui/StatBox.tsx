interface StatBoxProps {
  value: number;
  label: string;
  color?: string;
  green?: boolean;
  onClick?: () => void;
}

export function StatBox({ value, label, color, green, onClick }: StatBoxProps) {
  return (
    <div className={`stat-box${green ? ' stat-box-green' : ''}`} onClick={onClick}>
      <div className="stat-num" style={color ? { color } : undefined}>{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}
