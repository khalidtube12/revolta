import { useState, useCallback } from 'react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { submitAudition } from '../../services/auditions.service';

const PLATFORMS = [
  { value: 'x',         label: '𝕏  (X / تويتر)' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube',   label: 'YouTube' },
] as const;

interface Props {
  closed?: boolean;
}

export function AuditionFormSection({ closed = false }: Props) {
  const [name,      setName]      = useState('');
  const [age,       setAge]       = useState('');
  const [platform,  setPlatform]  = useState('');
  const [handle,    setHandle]    = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [honeypot,  setHoneypot]  = useState('');
  const [error,     setError]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (honeypot) return;

    if (!name.trim())                                          { setError('يرجى إدخال اسمك'); return; }
    if (name.trim().length > 100)                              { setError('الاسم طويل جداً'); return; }

    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 17 || ageNum > 60)  { setError('يشترط أن يكون عمرك 17 سنة أو أكثر'); return; }

    if (!platform)                                             { setError('يرجى اختيار المنصة'); return; }

    if (!handle.trim())                                        { setError('يرجى إدخال رابط حسابك أو معرّفك'); return; }
    if (handle.trim().length > 200)                            { setError('الرابط طويل جداً'); return; }

    if (!videoLink.trim())                                     { setError('يرجى إدخال رابط الفيديو'); return; }
    if (!videoLink.trim().startsWith('http'))                  { setError('رابط الفيديو يجب أن يبدأ بـ http'); return; }

    setSending(true);
    setError('');
    try {
      await submitAudition({
        name:      name.trim(),
        age:       ageNum,
        platform:  platform as 'x' | 'tiktok' | 'instagram' | 'youtube',
        handle:    handle.trim(),
        videoLink: videoLink.trim(),
      });
      setSubmitted(true);
    } catch {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSending(false);
    }
  }, [name, age, platform, handle, videoLink, honeypot]);

  /* ── Closed ── */
  if (closed) {
    return (
      <section id="form" className="aud-form-section">
        <div className="aud-form-inner-v2">
          <div className="aud-form-head-v2">
            <div className="aud-form-badge">AUDITION</div>
            <h2>التقديم على <span className="hl">ريفولتا</span></h2>
          </div>
          <div className="aud-form-state">
            <div className="aud-form-state-icon">🔒</div>
            <div className="aud-form-state-title">الأودشن مغلق حالياً</div>
            <div className="aud-form-state-sub">
              طلبات الأودشن متوقفة مؤقتاً.<br />
              تابعنا على منصات التواصل الاجتماعي لمعرفة موعد الفتح.
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Success ── */
  if (submitted) {
    return (
      <section id="form" className="aud-form-section">
        <div className="aud-form-inner-v2">
          <div className="aud-form-state">
            <div className="aud-form-state-icon">✅</div>
            <div className="aud-form-state-title">تم إرسال تقديمك!</div>
            <div className="aud-form-state-sub">
              سنراجع الفيديو ونتواصل معك في أقرب وقت
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Form ── */
  return (
    <section id="form" className="aud-form-section">
      <div className="aud-form-inner-v2">

        <div className="aud-form-head-v2">
          <div className="aud-form-badge">Submission</div>
          <h2>قدّم <span className="hl">الآن</span></h2>
          <p>خلصت خطوات التحدي؟ ارفع بياناتك المطلوبة و رابط المقطع</p>
        </div>

        <div className="aud-form-box-v2">
          <div className="aud-form-box-glow" />

          {/* Honeypot */}
          <input
            type="text"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />

          {/* Row 1: name + age */}
          <div className="aud-form-row-2">
            <div className="aud-form-field">
              <label>الاسم الكامل *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="اسمك أو اللقب"
                maxLength={100}
                disabled={sending}
              />
            </div>
            <div className="aud-form-field">
              <label>العمر *</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="17 سنة فما فوق"
                min={17}
                max={60}
                disabled={sending}
              />
            </div>
          </div>

          {/* Row 2: platform + handle */}
          <div className="aud-form-row-2">
            <div className="aud-form-field">
              <label>المنصة الأساسية للتواصل *</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                disabled={sending}
              >
                <option value="">اختر المنصة</option>
                {PLATFORMS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="aud-form-field">
              <label>رابط حسابك *</label>
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@username أو رابط"
                maxLength={200}
                disabled={sending}
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Video link */}
          <div className="aud-form-field-full">
            <label>رابط الفيديو النهائي *</label>
            <input
              type="text"
              value={videoLink}
              onChange={e => setVideoLink(e.target.value)}
              placeholder="https://youtube.com/... أو https://vm.tiktok.com/..."
              maxLength={500}
              disabled={sending}
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
            <div className="aud-form-hint">⚠️ تأكد أن الرابط متاح للجميع — إذا كان على Drive افتح المشاركة لـ "أي شخص لديه الرابط"</div>
          </div>

          {error && <div className="aud-form-err">{error}</div>}

          <div className="aud-form-footer-v2">
            <button
              className={`aud-form-submit-v2${submitted ? ' is-success' : ''}`}
              onClick={handleSubmit}
              disabled={sending}
            >
              {sending ? (
                '⏳ جاري الإرسال...'
              ) : (
                <>
                  إرسال التقديم النهائي
                  <ChevronLeft size={18} />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
