import type { TaskStatus } from '../../types';
import { STATUS_MAP } from '../../types';

interface BadgeProps {
  status?: TaskStatus;
  variant?: 'red' | 'green' | 'gray' | 'gold';
  children?: React.ReactNode;
}

export function Badge({ status, variant, children }: BadgeProps) {
  if (status) {
    const info = STATUS_MAP[status];
    return <span className={`badge ${info.badge}`}>{info.label}</span>;
  }

  return <span className={`badge badge-${variant || 'gray'}`}>{children}</span>;
}
