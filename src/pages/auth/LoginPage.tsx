import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { PopupModal } from '../../components/modals/PopupModal';
import { dbGet } from '../../services/db.service';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, resetPassword, pendingApproval } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [lEmail, setLEmail] = useState('');
  const [lPass, setLPass] = useState('');
  const [lErr, setLErr] = useState('');
  const [lErrColor, setLErrColor] = useState('');
  const [lLoading, setLLoading] = useState(false);

  const [rName, setRName] = useState('');
  const [rRole, setRRole] = useState('صانع محتوى');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [rSetupKey, setRSetupKey] = useState('');
  const [rErr, setRErr] = useState('');
  const [rLoading, setRLoading] = useState(false);

  const [popup, setPopup] = useState<{ icon: string; title: string; msg: string } | null>(null);
  const [adminExists, setAdminExists] = useState(true);

  useEffect(() => {
    dbGet<{ hasAdmin?: boolean }>('meta').then(meta => {
      setAdminExists(meta?.hasAdmin === true);
    }).catch(() => {});
  }, []);

  const doLogin = async () => {
    setLErr(''); setLErrColor('');
    if (!lEmail) { setLErr('يرجى إدخال البريد الإلكتروني'); return; }
    if (!lEmail.includes('@') || !lEmail.includes('.')) { setLErr('البريد الإلكتروني غير صحيح'); return; }
    if (!lPass) { setLErr('يرجى إدخال كلمة المرور'); return; }
    if (lPass.length < 8) { setLErr('كلمة المرور على الأقل 8 أحرف'); return; }
    setLLoading(true);
    try {
      await login(lEmail, lPass);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      setLErr(err.code === 'auth/invalid-credential' ? 'البريد أو كلمة المرور غلط' : (err.message || ''));
    }
    setLLoading(false);
  };

  const doReset = async () => {
    setLErr(''); setLErrColor('');
    if (!lEmail) { setLErr('أدخل بريدك الإلكتروني أولاً'); return; }
    try {
      await resetPassword(lEmail);
      setLErrColor('var(--green)');
      setLErr('تم إرسال رابط استعادة كلمة المرور إلى بريدك');
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'auth/user-not-found') setLErr('هذا البريد غير مسجل');
      else if (err.code === 'auth/invalid-email') setLErr('البريد الإلكتروني غير صحيح');
      else if (err.code === 'auth/too-many-requests') setLErr('طلبات كثيرة، حاول بعد شوي');
      else setLErr(err.message || '');
    }
  };

  const doRegister = async () => {
    setRErr('');
    if (!rName || !rRole || !rEmail || !rPass) { setRErr('يرجى ملء جميع الحقول'); return; }
    if (rPass.length < 8) { setRErr('كلمة المرور على الأقل 8 أحرف'); return; }
    if (!/[A-Z]/.test(rPass)) { setRErr('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل'); return; }
    if (!/[0-9]/.test(rPass)) { setRErr('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'); return; }
    setRLoading(true);
    try {
      const result = await register(rName, rRole, rEmail, rPass, rSetupKey || undefined);
      if (!result.isAdmin) {
        setPopup({ icon: '📩', title: 'تم إرسال طلب التسجيل', msg: 'طلبك قيد المراجعة من قبل الأدمن. سيتم تفعيل حسابك بعد الموافقة.' });
      }
    } catch (e: unknown) {
      setRErr((e as { message?: string }).message || '');
    }
    setRLoading(false);
  };

  return (
    <div id="auth-page" className="page" style={{ display: 'flex' }}>
      {/* P3 Immersive Background */}
      <div className="auth-bg-noise" />
      <div className="auth-bg-accent" />
      <div className="auth-bg-watermark">REVOLTA</div>

      <button className="auth-back-btn" onClick={() => navigate('/')}>
        ← الرئيسية
      </button>

      <div className="auth-wrap">
        <div className="auth-form-logo">
          <img src="/assets/RevoltaLogoWithoutBack.png" alt="TEAM REVOLTA" />
          <div className="auth-logo-sub">Content Team Platform</div>
          <div className="auth-logo-divider" />
        </div>
        <div className="auth-form-side">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setLErr(''); setRErr(''); }}>دخول</button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setLErr(''); setRErr(''); }}>تسجيل</button>
          </div>

          {tab === 'login' ? (
            <div>
              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" value={lEmail} onChange={e => setLEmail(e.target.value)} placeholder="you@revolta.com" />
              </div>
              <div className="form-group">
                <label>كلمة المرور</label>
                <input type="password" value={lPass} onChange={e => setLPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && doLogin()} />
              </div>
              <button className="btn btn-full" disabled={lLoading} onClick={doLogin}>
                {lLoading ? <div className="spinner" /> : 'دخول'}
              </button>
              {(lErr || pendingApproval) && (
                <div className="err" style={lErrColor ? { color: lErrColor } : undefined}>
                  {pendingApproval ? 'حسابك قيد المراجعة من الأدمن. يرجى الانتظار.' : lErr}
                </div>
              )}
              <button
                type="button"
                className="reset-pass-btn"
                onClick={doReset}
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label>الاسم الكامل</label>
                <input type="text" value={rName} onChange={e => setRName(e.target.value)} placeholder="اسمك في الفريق" />
              </div>
              <div className="form-group">
                <label>دورك في الفريق</label>
                <select value={rRole} onChange={e => setRRole(e.target.value)}>
                  <option value="صانع محتوى">صانع محتوى</option>
                  <option value="كاتب">كاتب</option>
                  <option value="مصمم">مصمم</option>
                  <option value="ممنتج">ممنتج</option>
                </select>
              </div>
              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="you@revolta.com" />
              </div>
              <div className="form-group">
                <label>كلمة المرور</label>
                <input type="password" value={rPass} onChange={e => setRPass(e.target.value)} placeholder="8+ أحرف، حرف كبير، ورقم" onKeyDown={e => e.key === 'Enter' && doRegister()} />
              </div>
              {!adminExists && (
                <div className="form-group">
                  <label style={{ color: 'var(--muted)', fontSize: 12 }}>كود الإعداد (للأدمن فقط)</label>
                  <input type="password" value={rSetupKey} onChange={e => setRSetupKey(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && doRegister()} />
                </div>
              )}
              <button className="btn btn-full" disabled={rLoading} onClick={doRegister}>
                {rLoading ? <div className="spinner" /> : 'إنشاء الحساب'}
              </button>
              {rErr && <div className="err">{rErr}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="dev-footer">
        <img src="/assets/nightmare-avatar.png" alt="Nightmare" />
        <span>تطوير Nightmare | خالد 🤍</span>
      </div>
      {popup && <PopupModal open={!!popup} onClose={() => { setPopup(null); setTab('login'); }} icon={popup.icon} title={popup.title} message={popup.msg} />}
    </div>
  );
}
