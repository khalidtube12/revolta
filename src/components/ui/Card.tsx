import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Card({ title, action, children }: CardProps) {
  return (
    <div className="card">
      {title && (
        <div className="card-hdr">
          <span className="card-title">{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
