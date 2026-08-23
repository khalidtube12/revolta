import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useIdeasStore } from '../../stores/ideasStore';
import './Sidebar.css';
import type { UserPermissions } from '../../types';
import { DEFAULT_PERMISSIONS } from '../../types';

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

  // strict: true = يتجاوز isAdmin ويتحقق من الصلاحية مباشرة
  const strictPerm = (key: keyof UserPermissions) =>
    !!(profile?.permissions?.[key] ?? DEFAULT_PERMISSIONS[key]);

  const adminItems: { path: string; icon: string; label: string; permission?: keyof UserPermissions; strict?: boolean; badgeCount?: number }[] = [
    { path: '/dashboard', icon: '📊', label: 'لوحة التحكم' },
    { path: '/my-tasks', icon: '✅', label: 'مهامي' },
    { path: '/members', icon: '👥', label: 'الأعضاء' },
    { path: '/tasks', icon: '📋', label: 'جميع المهام', permission: 'viewAllTasks', strict: true },
    { path: '/ideas', icon: '💡', label: 'أفكار المقاطع', permission: 'viewIdeas', strict: true, badgeCount: newIdeasCount },
    { path: '/shows', icon: '🏆', label: 'العروض' },
    { path: '/shows/manage', icon: '🎬', label: 'إدارة العروض', permission: 'manageShows' },
    { path: '/leaderboard', icon: '🥇', label: 'الترتيب الشهري' },
    { path: '/meetings', icon: '🗓', label: 'الاجتماعات' },
    { path: '/polls', icon: '🗳', label: 'التصويتات' },
    { path: '/approvals', icon: '📩', label: 'طلبات التسجيل', badgeCount: pendingCount },
    { path: '/applications', icon: '📝', label: 'طلبات الانضمام' },
    { path: '/auditions', icon: '🎙️', label: 'الأودشن' },
    { path: '/suggestions-inbox', icon: '💬', label: 'الاقتراحات' },
    { path: '/sync', icon: '🔄', label: 'مزامنة البيانات' },
  ];

  const memberItems: { path: string; icon: string; label: string; permission?: keyof UserPermissions; strict?: boolean; badgeCount?: number }[] = [
    { path: '/dashboard', icon: '🏠', label: 'الرئيسية' },
    { path: '/my-tasks', icon: '✅', label: 'مهامي' },
    { path: '/members', icon: '👥', label: 'الأعضاء', permission: 'viewMembers' },
    { path: '/tasks', icon: '📋', label: 'جميع المهام', permission: 'viewAllTasks' },
    { path: '/ideas', icon: '💡', label: 'أفكار المقاطع', permission: 'viewIdeas', badgeCount: newIdeasCount },
    { path: '/shows', icon: '🏆', label: 'العروض' },
    { path: '/shows/manage', icon: '🎬', label: 'إدارة العروض', permission: 'manageShows' },
    { path: '/leaderboard', icon: '🥇', label: 'الترتيب الشهري' },
    { path: '/meetings', icon: '🗓', label: 'الاجتماعات' },
    { path: '/polls', icon: '🗳', label: 'التصويتات', permission: 'managePolls' },
  ];

  const items = (isAdmin ? adminItems : memberItems)
    .filter(item => {
      if (!item.permission) return true;
      if (item.strict) return strictPerm(item.permission);
      return can(item.permission);
    });

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
