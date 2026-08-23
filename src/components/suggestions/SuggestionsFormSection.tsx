import { useState, useCallback } from 'react';
import { submitSuggestion } from '../../services/suggestions.service';

const SCRIPT_PATTERN = /<[^>]*>|javascript:|on\w+\s*=/i;

export function SuggestionsFormSection() {
  const [name,      setName]      = useState('');
  const [social,    setSocial]    = useState('');
  const [text,      setText]      = useState('');
  const [honeypot,  setHoneypot]  = useState('');
  const [error,     setError]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (honeypot) return;

    if (!name.trim())                            { setError('يرجى إدخال اسمك'); return; }
    if (name.trim().length > 100)                { setError('الاسم طويل جداً'); return; }
    if (SCRIPT_PATTERN.test(name))               { setError('لا يُسمح بإدخال أكواد في هذا الحقل'); return; }

    if (!social.trim())                          { setError('يرجى إدخال حسابك في السوشيال ميديا'); return; }
    if (social.trim().length > 100)              { setError('الحساب طويل جداً'); return; }
    if (SCRIPT_PATTERN.test(social))             { setError('لا يُسمح بإدخال أكواد في هذا الحقل'); return; }

    if (!text.trim() || text.trim().length < 10) { setError('يرجى كتابة اقتراحك (١٠ أحرف على الأقل)'); return; }
    if (text.trim().length > 500)                { setError('الاقتراح طويل جداً (الحد الأقصى ٥٠٠ حرف)'); return; }
    if (SCRIPT_PATTERN.test(text))               { setError('لا يُسمح بإدخال أكواد أو روابط في هذا الحقل'); return; }

    setSending(true);
    setError('');
    try {
      await submitSuggestion({
        name:         name.trim(),
        socialHandle: social.trim(),
        text:         text.trim(),
      });
      setSubmitted(true);
    } catch {
      setError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setSending(false);
    }
  }, [name, social, text, honeypot]);

  return (
    <section id="wp-suggestions">
      <div className="wp-noise" />
      <div className="wp-apply-glow" />
      <div className="wp-apply-inner">

        <div className="wp-sec-head wp-reveal visible">
          <div className="wp-eyebrow">SUGGESTIONS</div>
          <div className="wp-sec-title">اقتراحاتك <span className="hl">تهمنا</span></div>
          <div className="wp-sec-sub">شاركنا أفكارك وما تودّ أن يقدمه الفريق</div>
        </div>

        {submitted ? (
          <div className="wp-apply-success">
            <div className="wp-apply-success-icon">✓</div>
            <div className="wp-apply-success-title">شكراً على اقتراحك!</div>
            <div className="wp-apply-success-sub">وصلنا اقتراحك وسنأخذه بعين الاعتبار</div>
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
                  placeholder="اسمك أو لقبك"
                  maxLength={100} disabled={sending}
                />
              </div>
              <div className="wp-apply-field">
                <label>حسابك في السوشيال ميديا *</label>
                <input
                  value={social} onChange={e => setSocial(e.target.value)}
                  placeholder="مثال: @username في X"
                  maxLength={100} disabled={sending}
                />
              </div>
            </div>

            <div className="wp-apply-field">
              <label>اقتراحك *</label>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder="اكتب اقتراحك هنا..."
                rows={5} disabled={sending} maxLength={500}
              />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'left', display: 'block', marginTop: 4 }}>
                {text.length} / 500
              </span>
            </div>

            {error && <div className="wp-apply-err">{error}</div>}

            <button className="wp-apply-submit" onClick={handleSubmit} disabled={sending}>
              {sending ? '⏳ جاري الإرسال...' : 'إرسال الاقتراح ←'}
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
