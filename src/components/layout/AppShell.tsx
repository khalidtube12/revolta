import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ProfileModal } from '../modals/ProfileModal';
import './AppShell.css';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleMobile = useCallback(() => {
    setMobileOpen(v => !v);
    document.body.style.overflow = mobileOpen ? '' : 'hidden';
  }, [mobileOpen]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    document.body.style.overflow = '';
  }, []);

  return (
    <div className="page">
      <Navbar onToggleMobile={toggleMobile} onOpenProfile={() => setProfileOpen(true)} />

      <div className={`mobile-sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={closeMobile} />
      <div className={`mobile-sidebar ${mobileOpen ? 'open' : ''}`}>
        <Sidebar isMobile onClose={closeMobile} onOpenProfile={() => setProfileOpen(true)} />
      </div>

      <div className="layout">
        <Sidebar onOpenProfile={() => setProfileOpen(true)} />
        <div className="content">
          <Outlet />
        </div>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
