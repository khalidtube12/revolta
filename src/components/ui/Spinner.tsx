interface SpinnerProps {
  size?: number;
}

export function Spinner({ size = 32 }: SpinnerProps) {
  return (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <div
        className="spinner"
        style={{ width: size, height: size, borderWidth: 3, display: 'inline-block' }}
      />
    </div>
  );
}
