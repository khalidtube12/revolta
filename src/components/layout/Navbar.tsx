import { useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationsStore } from '../../stores/notificationsStore';
import { timeAgo } from '../../utils/date';
import './Navbar.css';

interface NavbarProps {
  onToggleMobile: () => void;
  onOpenProfile: () => void;
}

export function Navbar({ onToggleMobile, onOpenProfile }: NavbarProps) {
  const { profile, logout } = useAuthStore();
  const { notifications, panelOpen, togglePanel, closePanel, markAllRead, hasUnread } = useNotificationsStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelOpen && panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('.notif-btn')) {
        closePanel();
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [panelOpen, closePanel]);

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <button className="mobile-menu-btn" onClick={onToggleMobile} aria-label="القائمة">☰</button>
          <img className="nav-logo-img" src="/assets/revolta-logo.png" alt="REVOLTA" />
          <span className="nav-brand">REVOLTA</span>
        </div>
        <div className="nav-right">
          <div className="nav-user" onClick={onOpenProfile} title="تعديل الملف الشخصي">
            <span className="nav-avatar" style={{
              background: profile?.photoURL ? undefined : (profile?.color || 'var(--border2)'),
            }}>
              {profile?.photoURL
                ? <img src={profile.photoURL} alt="" />
                : profile?.name?.charAt(0) || '?'
              }
            </span>
            <span>مرحباً، <strong>{profile?.name || ''}</strong></span>
          </div>
          <div className="nav-divider" />
          <div>
            {profile?.isAdmin
              ? <span className="badge badge-red">أدمن</span>
              : <span className="badge badge-gold">{profile?.jobRole || ''}</span>
            }
          </div>
          <button className="notif-btn" onClick={togglePanel}>
            🔔
            <div className="notif-dot" style={{ display: hasUnread() ? 'block' : 'none' }} />
          </button>
          <button className="btn btn-sm btn-ghost" onClick={logout}>خروج</button>
        </div>
      </nav>
      <div ref={panelRef} className={`notif-panel ${panelOpen ? 'open' : ''}`}>
        <div className="notif-hdr">
          <span>الإشعارات</span>
          <button className="btn btn-xs btn-ghost" onClick={markAllRead}>تحديد كمقروء</button>
        </div>
        <div>
          {notifications.length > 0
            ? notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                  <div className="notif-t">{n.title}</div>
                  <div className="notif-b">{n.body}</div>
                  <div className="notif-time">{timeAgo(n.createdAt)}</div>
                </div>
              ))
            : <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                لا توجد إشعارات
              </div>
          }
        </div>
      </div>
    </>
  );
}
