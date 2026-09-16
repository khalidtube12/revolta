import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { isPushSupported, getPushPermissionState, enablePushNotifications } from '../../services/push.service';
import './PushPermissionBanner.css';

const DISMISS_KEY = 'push-banner-dismissed';

export function PushPermissionBanner() {
  const { profile } = useAuthStore();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      if (localStorage.getItem(DISMISS_KEY)) return;
      if (getPushPermissionState() !== 'default') return;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (isIOS && !isStandalone) return; // على الآيفون: لازم يثبّت التطبيق أولاً

      if (await isPushSupported()) setShow(true);
    })();
  }, [profile]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  const handleEnable = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const result = await enablePushNotifications(profile.id);
      if (result === 'granted') {
        setShow(false);
        localStorage.setItem(DISMISS_KEY, '1');
      } else if (result === 'denied') {
        setError('رفضت الإذن من إعدادات الجهاز — لازم تفعّله يدوياً من إعدادات الإشعارات');
      } else {
        setError('المتصفح ما يدعم الإشعارات بهذي الطريقة');
      }
    } catch {
      setError('صار خطأ أثناء التفعيل — جرب مرة ثانية');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="push-banner">
      <div className="push-banner-icon">🔔</div>
      <div className="push-banner-text">
        <strong>فعّل إشعارات الجوال</strong>
        <span>{error || 'خلّك أول من يعرف بالمهام والتحديثات الجديدة'}</span>
      </div>
      <button className="btn btn-sm btn-gold" disabled={loading} onClick={handleEnable}>
        {loading ? '...' : 'تفعيل'}
      </button>
      <button className="push-banner-close" onClick={dismiss} aria-label="إغلاق">✕</button>
    </div>
  );
}
