import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useIdeasStore } from '../../stores/ideasStore';
import './Sidebar.css';
import type { UserPermissions } from '../../types';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
  onOpenProfile?: () => void;
}

export function Sidebar({ isMobile, onClose, onOpenProfile }: SidebarProps) {
  const { profile, can } = useAuthStore();
  const { pendingCount } = useMembersStore();
  const { newIdeasCount } = useIdeasStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = profile?.isAdmin;

  const adminItems = [
    { path: '/dashboard', icon: '📊', label: 'لوحة التحكم' },
    { path: '/my-tasks', icon: '✅', label: 'مهامي' },
    { path: '/members', icon: '👥', label: 'الأعضاء' },
    { path: '/tasks', icon: '📋', label: 'جميع المهام' },
    { path: '/ideas', icon: '💡', label: 'أفكار المقاطع', badgeCount: newIdeasCount },
    { path: '/polls', icon: '🗳', label: 'التصويتات' },
    { path: '/approvals', icon: '📩', label: 'طلبات التسجيل', badgeCount: pendingCount },
    { path: '/sync', icon: '🔄', label: 'مزامنة البيانات' },
  ];

  const memberItems: { path: string; icon: string; label: string; permission?: keyof UserPermissions; badgeCount?: number }[] = [
    { path: '/dashboard', icon: '🏠', label: 'الرئيسية' },
    { path: '/my-tasks', icon: '✅', label: 'مهامي' },
    { path: '/members', icon: '👥', label: 'الأعضاء', permission: 'viewMembers' },
    { path: '/tasks', icon: '📋', label: 'جميع المهام', permission: 'viewAllTasks' },
    { path: '/ideas', icon: '💡', label: 'أفكار المقاطع', badgeCount: newIdeasCount },
    { path: '/polls', icon: '🗳', label: 'التصويتات', permission: 'managePolls' },
  ];

  const items = isAdmin
    ? adminItems
    : memberItems.filter(item => !item.permission || can(item.permission));

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={isMobile ? undefined : 'sidebar'}>
      <div>
        <div className="sidebar-label">القائمة</div>
        {items.map(item => (
          <button
            key={item.path}
            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNav(item.path)}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.badgeCount ? <span className="sidebar-badge">{item.badgeCount}</span> : null}
          </button>
        ))}
        <div className="sidebar-label" style={{ marginTop: 16 }}>الحساب</div>
        <button className="sidebar-link" onClick={() => { onOpenProfile?.(); onClose?.(); }}>
          <span>👤</span>ملفي
        </button>
      </div>
    </div>
  );
}
