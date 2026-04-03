import type { User } from '../../types';

interface AvatarProps {
  user?: User | null;
  size?: number;
}

export function Avatar({ user, size = 42 }: AvatarProps) {
  const fontSize = size >= 64 ? 28 : size >= 40 ? 18 : 14;

  if (!user) {
    return (
      <div className="avatar" style={{ width: size, height: size, background: 'var(--border2)' }}>
        ?
      </div>
    );
  }

  if (user.photoURL) {
    return (
      <div className="avatar" style={{ width: size, height: size }}>
        <img src={user.photoURL} alt="" />
      </div>
    );
  }

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize, background: user.color || 'var(--border2)' }}
    >
      {user.name?.charAt(0) || '?'}
    </div>
  );
}
