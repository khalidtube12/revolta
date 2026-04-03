import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicProfiles } from '../../services/users.service';
import type { PublicProfile } from '../../services/users.service';
import { fetchPublicWorks } from '../../services/works.service';
import type { PublicWork } from '../../services/works.service';
import { getAllPolls } from '../../services/polls.service';
import type { Poll } from '../../services/polls.service';
import './WelcomePage.css';

export function WelcomePage() {
  const navigate = useNavigate();
  const navbarRef = useRef<HTMLElement>(null);
  const [members, setMembers] = useState<PublicProfile[]>([]);
  const [works, setWorks] = useState<PublicWork[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchPublicWorks().then(setWorks);
    getAllPolls().then(setPolls);
  }, []);

  useEffect(() => {
    fetchPublicProfiles().then((all) => {
      const sorted = [...all].sort((a, b) => {
        if (a.isLeader && !b.isLeader) return -1;
        if (!a.isLeader && b.isLeader) return 1;
        return 0;
      });
      setMembers(sorted);
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      navbarRef.current?.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.wp-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [members]);

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", background: '#050505', color: '#fff', overflowX: 'hidden' }}>

      {/* NAVBAR */}
      <nav className="wp-navbar" ref={navbarRef}>
        <div className="wp-nav-logo">
          <img src="/assets/RevoltaLogoWithoutBack.png" alt="" className="wp-nav-logo-img" />
        </div>
        <ul className={`wp-nav-links${menuOpen ? ' open' : ''}`}>
          <li><button onClick={() => goTo('wp-about')}>من نحن</button></li>
          <li><button onClick={() => goTo('wp-members')}>الفريق</button></li>
          <li><button onClick={() => goTo('wp-social')}>تواصل اجتماعي</button></li>
          <li><button onClick={() => goTo('wp-works')}>أعمالنا</button></li>
          {polls.length > 0 && <li><button onClick={() => goTo('wp-polls')}>التصويتات</button></li>}
        </ul>
        <div className="wp-nav-right">
          <button className="wp-hamburger" onClick={() => setMenuOpen(o => !o)}>
            <span className={menuOpen ? 'open' : ''} />
            <span className={menuOpen ? 'open' : ''} />
            <span className={menuOpen ? 'open' : ''} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section id="wp-hero">
        <div className="wp-noise" />
        <div className="wp-hero-scan" />
        <div className="wp-hero-particles">
          <span /><span /><span /><span /><span />
          <span /><span /><span /><span /><span />
        </div>
        <div className="wp-hero-glow" />
        <div className="wp-hero-bg-text">REVOLTA</div>
        <div className="wp-hero-top-line" />
        <div className="wp-hero-edge left" />
        <div className="wp-hero-edge right" />

        <div className="wp-hero-content">
          <img src="/assets/RevoltaLogoWithoutBack.png" alt="Revolta" className="wp-hero-img" />
          <div className="wp-hero-eyebrow">
            <div className="wp-hero-eyebrow-line" />
            WRESTLING TEAM
            <div className="wp-hero-eyebrow-line" />
          </div>
          <div className="wp-hero-logo">REV<span className="r-accent">O</span>LTA</div>
          <div className="wp-hero-divider" />
          <div className="wp-hero-tagline">
            صناعة محتوى <strong>المصارعة الحرة</strong> بأفضل جودة
          </div>
          <button className="wp-hero-cta" onClick={() => goTo('wp-about')}>اكتشف الفريق ↓</button>
        </div>

        <button className="wp-hero-scroll" onClick={() => goTo('wp-about')}>
          <div className="wp-hero-scroll-line" />
          <div className="wp-hero-scroll-text">SCROLL</div>
        </button>
      </section>

      {/* ABOUT */}
      <section id="wp-about">
        <div className="wp-noise" />
        <div className="wp-about-glow1" />
        <div className="wp-about-glow2" />
        <div className="wp-about-inner">

          <div className="wp-sec-head wp-reveal">
            <div className="wp-eyebrow">WHO WE ARE</div>
            <div className="wp-sec-title">تعريف <span className="hl">بالفريق</span></div>
            <div className="wp-sec-sub">فريق طموح يسعى لتقديم محتوى المصارعة الحرة بأسلوب مختلف ومميز</div>
          </div>

          <div className="wp-about-content">
            <div className="wp-reveal wp-d1">
              <div className="wp-about-text">
                <strong>فريق ريفولتا</strong> فريق طموح يسعى لتقديم محتوى <em>المصارعة الحرة</em> بأسلوب مختلف ومميز.
                يضم الفريق مجموعة من صنّاع المحتوى، الكتّاب، المصممين،
                حيث يساهم كل عضو بطاقته وخبرته في صناعة تجربة متكاملة تُشعل حماس الفريق بأكمله.
                <br /><br />
                هدفنا هو الوصول إلى جمهور <strong>المصارعة</strong> وتقديم محتوى <strong>عالي الجودة</strong> يليق بشغفهم… لأنهم يستحقون الأفضل.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* MEMBERS */}
      <section id="wp-members">
        <div className="wp-noise" />
        <div className="wp-members-glow" />
        <div className="wp-members-inner">

          <div className="wp-sec-head wp-reveal">
            <div className="wp-eyebrow">THE TEAM</div>
            <div className="wp-sec-title">أعضاء <span className="hl">الفريق</span></div>
            <div className="wp-sec-sub">الأشخاص الذين يجعلون ريفولتا ما هي عليه كل يوم</div>
          </div>

          <div className="wp-members-grid">
            {members.map((m, i) => {
              const delays = ['wp-d1', 'wp-d2', 'wp-d3', 'wp-d4'];
              const delay = delays[i % 4];
              return (
                <a key={i} className={`wp-member-card${m.isLeader ? ' leader' : ''} wp-reveal ${delay}`}
                  href={m.twitterHandle ? `https://x.com/${m.twitterHandle}` : undefined}
                  target={m.twitterHandle ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', cursor: m.twitterHandle ? 'pointer' : 'default' }}
                >
                  <div className="wp-member-card-bar" />
                  {m.isLeader && <div className="wp-member-badge">LEADER</div>}
                  <div className="wp-member-avatar">
                    {m.photoURL
                      ? <img src={m.photoURL} alt={m.name} />
                      : m.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="wp-member-name">{m.name.toUpperCase()}</div>
                  <div className="wp-member-role">{m.isLeader ? 'قائد الفريق' : m.jobRole}</div>
                  {m.twitterHandle && (
                    <div className="wp-member-twitter">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      @{m.twitterHandle}
                    </div>
                  )}
                </a>
              );
            })}
          </div>

        </div>
      </section>

      {/* SOCIAL */}
      <section id="wp-social">
        <div className="wp-noise" />
        <div className="wp-social-glow" />
        <div className="wp-social-inner">

          <div className="wp-sec-head wp-reveal">
            <div className="wp-eyebrow">FOLLOW US</div>
            <div className="wp-sec-title"><span className="hl">تابعونا</span></div>
            <div className="wp-sec-sub">تابعونا على منصاتنا وكونوا أول من يشاهد محتوانا</div>
          </div>

          <div className="wp-social-grid">
            <a className="wp-social-card yt wp-reveal wp-d1" href="https://youtube.com/@team_revolta" target="_blank" rel="noreferrer">
              <div className="wp-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28, color: '#ff0000' }}>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div className="wp-social-platform">YouTube</div>
              <div className="wp-social-handle">@team_revolta</div>
              <div className="wp-social-btn">اشترك الآن</div>
            </a>
            <a className="wp-social-card ig wp-reveal wp-d2" href="https://www.instagram.com/team.revolta" target="_blank" rel="noreferrer">
              <div className="wp-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28, color: '#e1306c' }}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="wp-social-platform">Instagram</div>
              <div className="wp-social-handle">@team.revolta</div>
              <div className="wp-social-btn">تابعنا</div>
            </a>
            <a className="wp-social-card tw wp-reveal wp-d3" href="https://x.com/Revolta_1" target="_blank" rel="noreferrer">
              <div className="wp-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28, color: '#fff' }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                </svg>
              </div>
              <div className="wp-social-platform">X</div>
              <div className="wp-social-handle">@Revolta_1</div>
              <div className="wp-social-btn">تابعنا</div>
            </a>
            <a className="wp-social-card tt wp-reveal wp-d4" href="https://www.tiktok.com/@revolta_1" target="_blank" rel="noreferrer">
              <div className="wp-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28, color: '#69c9d0' }}>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/>
                </svg>
              </div>
              <div className="wp-social-platform">TikTok</div>
              <div className="wp-social-handle">@revolta_1</div>
              <div className="wp-social-btn">تابعنا</div>
            </a>
          </div>

        </div>
      </section>

      {/* LATEST WORKS */}
      <section id="wp-works">
        <div className="wp-noise" />
        <div className="wp-works-glow" />
        <div className="wp-works-inner">

          <div className="wp-sec-head wp-reveal">
            <div className="wp-eyebrow">LATEST CONTENT</div>
            <div className="wp-sec-title">أخر <span className="hl">أعمالنا</span></div>
            <div className="wp-sec-sub">شاهد أحدث ما أنتجه فريق ريفولتا</div>
          </div>

          <div className="wp-works-grid">
            {works.length === 0 ? (
              ['wp-d1', 'wp-d2', 'wp-d3'].map((d, i) => (
                <div key={i} className={`wp-work-card wp-reveal ${d}`}>
                  <div className="wp-work-thumb wp-work-thumb-placeholder">
                    <div className="wp-work-placeholder-icon">▶</div>
                  </div>
                  <div className="wp-work-info">
                    <div className="wp-work-platform">▶ YouTube</div>
                    <div className="wp-work-title">قريباً...</div>
                  </div>
                </div>
              ))
            ) : (
              works.map((w, i) => {
                const delays = ['wp-d1', 'wp-d2', 'wp-d3', 'wp-d4'];
                return (
                  <div key={w.id} className={`wp-work-card wp-reveal ${delays[i % 4]}`}>
                    <div className="wp-work-thumb">
                      <iframe
                        src={w.embedUrl}
                        title={w.title}
                        frameBorder="0"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="wp-work-info">
                      <div className="wp-work-platform">▶ YouTube</div>
                      <div className="wp-work-title">{w.title}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </section>

      {/* POLLS */}
      {polls.length > 0 && (
        <section id="wp-polls">
          <div className="wp-noise" />
          <div className="wp-polls-glow" />
          <div className="wp-polls-inner">

            <div className="wp-sec-head wp-reveal">
              <div className="wp-eyebrow">VOTE NOW</div>
              <div className="wp-sec-title"><span className="hl">التصويتات</span></div>
              <div className="wp-sec-sub">شارك برأيك وصوّت الآن</div>
            </div>

            <div className="wp-polls-grid">
              {polls.map((poll, i) => {
                const delays = ['wp-d1', 'wp-d2', 'wp-d3', 'wp-d4'];
                const expired = poll.expiresAt < Date.now();
                const optionsList = Object.values(poll.options || {});
                return (
                  <a
                    key={poll.id}
                    className={`wp-poll-card wp-reveal ${delays[i % 4]}${expired ? ' expired' : ''}`}
                    href={`/vote/${poll.id}`}
                  >
                    <div className="wp-poll-card-bar" />
                    {expired && <div className="wp-poll-expired-badge">منتهي</div>}
                    <div className="wp-poll-title">{poll.title}</div>
                    {poll.description && <div className="wp-poll-desc">{poll.description}</div>}
                    {optionsList.length > 0 && (
                      <div className="wp-poll-options-preview">
                        {optionsList.slice(0, 4).map((opt, j) => (
                          <div key={j} className="wp-poll-opt-img">
                            {opt.imageUrl
                              ? <img src={opt.imageUrl} alt={opt.name} />
                              : <div className="wp-poll-opt-placeholder">{opt.name.charAt(0)}</div>
                            }
                            <div className="wp-poll-opt-name">{opt.name}</div>
                          </div>
                        ))}
                        {optionsList.length > 4 && (
                          <div className="wp-poll-opt-more">+{optionsList.length - 4}</div>
                        )}
                      </div>
                    )}
                    <div className={`wp-poll-cta${expired ? ' expired' : ''}`}>
                      {expired ? 'عرض النتائج' : 'صوّت الآن ←'}
                    </div>
                  </a>
                );
              })}
            </div>

          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="wp-footer">
        <div className="wp-footer-made">
          <img src="/assets/nightmare-avatar.png" alt="Nightmare" className="wp-footer-avatar" />
          <span>تطوير Nightmare | خالد 🤍</span>
        </div>
      </footer>

    </div>
  );
}
