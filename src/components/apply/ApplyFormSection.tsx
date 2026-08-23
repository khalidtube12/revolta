import { useState, useCallback } from 'react';
import { submitApplication } from '../../services/applications.service';

const CONTENT_TYPES = [
  'صانع محتوى',
  'مونتج',
  'كاتب',
  'مصمم',
  'مسؤول حسابات تواصل اجتماعي',
];

interface Props {
  closed?: boolean;
}

export function ApplyFormSection({ closed = false }: Props) {
  const [name,      setName]      = useState('');
  const [twitter,   setTwitter]   = useState('');
  const [type,      setType]      = useState('');
  const [age,       setAge]       = useState('');
  const [reason,    setReason]    = useState('');
  const [honeypot,  setHoneypot]  = useState('');
  const [error,     setError]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (honeypot) return;
    if (!name.trim())                                          { setError('يرجى إدخال اسمك'); return; }
    if (name.trim().length > 100)                             { setError('الاسم طويل جداً'); return; }
    if (!twitter.trim())                                       { setError('يرجى إدخال حسابك في X'); return; }
    if (twitter.trim().length > 50)                           { setError('اسم الحساب طويل جداً'); return; }
    if (!type)                                                 { setError('يرجى اختيار تصنيفك'); return; }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 60) { setError('يرجى إدخال عمر صحيح (١٣-٦٠)'); return; }
    if (!reason.trim() || reason.trim().length < 10)          { setError('يرجى كتابة سبب رغبتك في الانضمام (١٠ أحرف على الأقل)'); return; }
    if (reason.trim().length > 1000)                          { setError('السبب طويل جداً (الحد الأقصى ١٠٠٠ حرف)'); return; }
    if (/<[^>]*>|javascript:|on\w+\s*=/i.test(reason))       { setError('لا يُسمح بإدخال أكواد أو روابط في هذا الحقل'); return; }

    setSending(true);
    setError('');
    try {
      await submitApplication({
        name:          name.trim(),
        twitterHandle: twitter.trim().replace('@', ''),
        contentType:   type,
        age:           ageNum,
        reason:        reason.trim(),
      });
      setSubmitted(true);
    } catch {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSending(false);
    }
  }, [name, twitter, type, age, reason, honeypot]);

  return (
    <section id="wp-apply">
      <div className="wp-noise" />
      <div className="wp-apply-glow" />
      <div className="wp-apply-inner">

        <div className="wp-sec-head wp-reveal visible">
          <div className="wp-eyebrow">JOIN US</div>
          <div className="wp-sec-title">انضم إلى <span className="hl">ريفولتا</span></div>
          <div className="wp-sec-sub">هل لديك شغف بالمصارعة وصناعة المحتوى؟ قدّم الآن وكن جزءاً من الفريق</div>
        </div>

        {closed ? (
          <div className="wp-apply-success" style={{ borderTopColor: 'rgba(139,0,0,0.6)', background: 'rgba(139,0,0,0.04)' }}>
            <div className="wp-apply-success-icon" style={{ background: 'rgba(139,0,0,0.1)', border: '2px solid rgba(139,0,0,0.4)', color: '#8b0000', fontSize: 32 }}>
              🔒
            </div>
            <div className="wp-apply-success-title">الباب مغلق حالياً</div>
            <div className="wp-apply-success-sub">
              طلبات الانضمام متوقفة مؤقتاً.<br />
              تابعنا على منصة X لمعرفة موعد فتحها من جديد.
            </div>
          </div>
        ) : submitted ? (
          <div className="wp-apply-success">
            <div className="wp-apply-success-icon">✓</div>
            <div className="wp-apply-success-title">تم إرسال بياناتك</div>
            <div className="wp-apply-success-sub">بنتواصل معك في حال القبول</div>
          </div>
        ) : (
          <div className="wp-apply-form wp-reveal visible">
            <input
              type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)}
              tabIndex={-1} aria-hidden="true" autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
            <div className="wp-apply-row">
              <div className="wp-apply-field">
                <label>الاسم *</label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="اسمك الكامل أو اللقب"
                  maxLength={100} disabled={sending}
                />
              </div>
              <div className="wp-apply-field">
                <label>حسابك في X *</label>
                <input
                  value={twitter} onChange={e => setTwitter(e.target.value)}
                  placeholder="@username"
                  maxLength={50} disabled={sending}
                />
              </div>
              <div className="wp-apply-field">
                <label>العمر *</label>
                <input
                  type="number" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="مثال: 22"
                  min={13} max={60} disabled={sending}
                />
              </div>
              <div className="wp-apply-field">
                <label>تصنيفك في صناعة المحتوى *</label>
                <select value={type} onChange={e => setType(e.target.value)} disabled={sending}>
                  <option value="">التصنيف</option>
                  {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="wp-apply-field">
              <label>ليش تبي تنضم لريفولتا؟ *</label>
              <textarea
                value={reason} onChange={e => setReason(e.target.value)}
                placeholder="اكتب هنا دوافعك وما تقدر تضيفه للفريق..."
                rows={5} disabled={sending} maxLength={1000}
              />
            </div>

            {error && <div className="wp-apply-err">{error}</div>}

            <button className="wp-apply-submit" onClick={handleSubmit} disabled={sending}>
              {sending ? '⏳ جاري الإرسال...' : 'إرسال الطلب ←'}
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
