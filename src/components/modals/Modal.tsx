import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
  zIndex?: number;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 500, zIndex }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="overlay open"
      style={zIndex ? { zIndex } : undefined}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-title">{title}</div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
