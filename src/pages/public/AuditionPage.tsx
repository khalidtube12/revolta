import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Download, ExternalLink, Film, Mic, Play, Upload } from 'lucide-react';
import { getAuditionOpen } from '../../services/auditions.service';
import { AuditionFormSection } from '../../components/audition/AuditionFormSection';
import './AuditionPage.css';

// ── ملفات ثابتة — يُعدَّلان مباشرة هنا ──
const SCRIPT_URL  = '/challenge/script.html';
const ASSETS_URL  = 'https://drive.google.com/drive/folders/1pwC4_ChZHd5rNTxsQsqJ_aunV9i2MgdG?usp=sharing';

// ── Countdown ──
const DEADLINE = new Date('2026-06-10T23:59:59');

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  / 60_000),
      seconds: Math.floor((diff % 60_000)     / 1_000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const STEPS = [
  { num: '01', title: 'حمّل النص اللي راح تقرأه',  desc: 'اقرأ النص المرفق واستوعب القصة جيداً قبل التسجيل.',              Icon: Download, link: SCRIPT_URL,  linkLabel: 'تحميل السكربت' },
  { num: '02', title: 'حمّل مقاطع المونتاج',        desc: 'الملف يحتوي على المقاطع اللي راح تقصقصها وتمنتجها',             Icon: Film,     link: ASSETS_URL,  linkLabel: 'فتح مجلد Drive' },
  { num: '03', title: 'سجّل صوتك',                  desc: 'سجل صوتك واقرأ النص',                                           Icon: Mic,      link: null,        linkLabel: null },
  { num: '04', title: 'منتج الفيديو',               desc: 'ادمج صوتك بمقاطع الفيديو اللي قصقصتها وعدلها باسلوبك وطريقتك', Icon: Play,     link: null,        linkLabel: null },
  { num: '05', title: 'أرسل رابط الفيديو',          desc: 'ارسل لنا رابط الفيديو عبر Drive',                               Icon: Upload,   link: null,        linkLabel: null },
];

export function AuditionPage() {
  const [auditionOpen, setAuditionOpen] = useState<boolean | null>(null);
  const countdown = useCountdown(DEADLINE);

  useEffect(() => {
    getAuditionOpen().then(open => setAuditionOpen(open));
  }, []);

  return (
    <div className="aud-page">

      {/* ── Navbar ── */}
      <nav className="aud-nav">
        <Link to="/" className="aud-nav-back">
          <div className="aud-nav-back-circle">
            <ChevronLeft size={16} />
          </div>
          الرئيسية
        </Link>
        <div className="aud-nav-brand-wrap">
          <Link to="/" className="aud-nav-brand">REVOLTA</Link>
        </div>
        <div className="aud-nav-spacer" />
      </nav>

      {/* ── Hero ── */}
      <section className="aud-hero">
        <div className="aud-hero-glow" />
        <div className="aud-hero-watermark">AUDITION</div>

        <div className="aud-hero-content">
          <h1 className="aud-hero-title">
            ودك تكون جزء من<br />
            <span className="hl">ريفولتا؟</span>
          </h1>

          <p className="aud-hero-sub">
            تحدي ريفولتا هو تحدي بسيط يقيس مقدرتك على صناعة المحتوى والمونتاج
          </p>

          {/* ── Countdown ── */}
          <div className="aud-countdown">
            <div className="aud-countdown-label">ينتهي التحدي خلال</div>
            <div className="aud-countdown-boxes">
              {([
                { v: countdown.days,    l: 'يوم'   },
                { v: countdown.hours,   l: 'ساعة'  },
                { v: countdown.minutes, l: 'دقيقة' },
                { v: countdown.seconds, l: 'ثانية' },
              ] as const).map(({ v, l }) => (
                <div key={l} className="aud-countdown-box">
                  <span className="aud-countdown-num">{String(v).padStart(2, '0')}</span>
                  <span className="aud-countdown-unit">{l}</span>
                </div>
              ))}
            </div>
          </div>

          <a href="#steps" className="aud-hero-cta">
            <div className="aud-hero-cta-bg" />
            <div className="aud-hero-cta-shine" />
            <span className="aud-hero-cta-text">
              ابدأ التحدي
              <ChevronLeft size={20} />
            </span>
          </a>
        </div>

        <div className="aud-hero-fade" />
      </section>

      {/* ── Loading ── */}
      {auditionOpen === null ? (
        <div className="aud-spinner-wrap">
          <div className="aud-spinner" />
        </div>
      ) : (
        <>
          {auditionOpen && (
            <>
              {/* ── Steps ── */}
              <section id="steps" className="aud-steps-section">
                <div className="aud-steps-wrap">

                  <div className="aud-steps-sidebar">
                    <h2 className="aud-steps-sidebar-title">
                      خطوات<br /><span className="hl">التحدي</span>
                    </h2>
                    <p className="aud-steps-sidebar-sub">
                      خمس خطوات بسيطة نفذها وننتظرك في الفرييييق
                    </p>
                    <div className="aud-steps-sidebar-line" />
                  </div>

                  <div className="aud-steps-cards">
                    {STEPS.map(({ num, title, desc, Icon, link, linkLabel }) => (
                      <div key={num} className="aud-step-card-v2">
                        <div className="aud-step-watermark">{num}</div>
                        <div className="aud-step-accent-line" />
                        <div className="aud-step-icon-wrap">
                          <Icon size={24} />
                        </div>
                        <div className="aud-step-body-v2">
                          <div className="aud-step-meta-row">
                            <span className="aud-step-num-gold">{num}</span>
                            <span className="aud-step-title-v2">{title}</span>
                          </div>
                          <p className="aud-step-desc-v2">{desc}</p>
                          {link && (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="aud-step-link">
                              <Download size={13} />
                              {linkLabel}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </section>

              {/* ── Conditions ── */}
              <section className="aud-cond-section">
                <div className="aud-cond-inner">
                  <div className="aud-cond-header">
                    <div className="aud-cond-eyebrow">REQUIREMENTS</div>
                    <h2 className="aud-cond-title">شروط <span className="hl">التحدي</span></h2>
                  </div>
                  <div className="aud-cond-list">
                    <div className="aud-cond-item">
                      <div className="aud-cond-text">عمرك أكبر من <strong>17 سنة</strong></div>
                    </div>
                    <div className="aud-cond-item">
                      <div className="aud-cond-text">عندك قابلية <strong>تطلع بصورتك في مقاطع الفريق</strong></div>
                    </div>
                    <div className="aud-cond-item">
                      <div className="aud-cond-text"><strong>متعاون</strong> وسهل التعامل</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Downloads ── */}
              <section className="aud-dl-section-v2">
                <div className="aud-dl-inner-v2">
                  <div className="aud-dl-head-v2">
                    <h2>ملفات <span className="hl">التحدي</span></h2>
                    <p>قم بتحميل الموارد الأساسية للبدء في مشروعك</p>
                  </div>

                  <div className="aud-dl-grid-v2">
                    <a href={SCRIPT_URL} target="_blank" rel="noopener noreferrer" className="aud-dl-card-v2 gold-card">
                      <div className="aud-dl-card-top" />
                      <div className="aud-dl-icon-box-v2"><Download size={36} /></div>
                      <div className="aud-dl-card-v2-label">السكربت النصي</div>
                      <div className="aud-dl-card-v2-sub">ملف يحتوي على النص الكامل للتحدي</div>
                      <div className="aud-dl-card-v2-cta">
                        تحميل الملف <Download size={15} />
                      </div>
                    </a>

                    <a href={ASSETS_URL} target="_blank" rel="noopener noreferrer" className="aud-dl-card-v2 red-card">
                      <div className="aud-dl-card-top" />
                      <div className="aud-dl-icon-box-v2"><ExternalLink size={36} /></div>
                      <div className="aud-dl-card-v2-label">مقاطع المونتاج</div>
                      <div className="aud-dl-card-v2-sub">مجلد Google Drive يحتوي على جميع المواد</div>
                      <div className="aud-dl-card-v2-cta">
                        فتح المجلد <ExternalLink size={15} />
                      </div>
                    </a>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ── Form ── */}
          <AuditionFormSection closed={!auditionOpen} />

          {/* ── Notes ── */}
          <section className="aud-notes-section">
            <div className="aud-notes-inner">
              <div className="aud-notes-eyebrow">نقاط مهمة</div>
              <ul className="aud-notes-list">
                <li>ستتم مراجعة المقاطع من قبل الفريق بعد انتهاء فترة التقديم</li>
                <li>سيتم التواصل مع المتقدم في حال القبول</li>
                <li>هناك عدد محدد للمقبولين</li>
              </ul>
            </div>
          </section>
        </>
      )}

    </div>
  );
}
