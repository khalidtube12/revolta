import { useState, useEffect } from 'react';
import './IOSInstallBanner.css';

export function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (isIOS && !isStandalone && !dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="ios-banner">
      <div className="ios-banner-icon">📲</div>
      <div className="ios-banner-text">
        <strong>أضف التطبيق لشاشتك الرئيسية</strong>
        <span>اضغط <strong>□↑</strong> ثم اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong></span>
      </div>
      <button className="ios-banner-close" onClick={dismiss}>✕</button>
    </div>
  );
}
