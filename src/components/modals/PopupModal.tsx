interface PopupModalProps {
  open: boolean;
  onClose: () => void;
  icon: string;
  title: string;
  message: string;
}

export function PopupModal({ open, onClose, icon, title, message }: PopupModalProps) {
  if (!open) return null;

  return (
    <div className="overlay open" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 24 }}>{message}</div>
        <button className="btn" onClick={onClose}>حسناً</button>
      </div>
    </div>
  );
}
