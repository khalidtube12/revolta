import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { fetchPublicProfileById } from '../../services/users.service';
import type { PublicProfile } from '../../services/users.service';
import { getAllShowReviews } from '../../services/showReviews.service';
import { getAllShows } from '../../services/shows.service';
import { getAllMatches } from '../../services/matches.service';
import type { ShowReview, Show, Match } from '../../types';
import './MemberProfilePage.css';

const IS_REVIEWS_SITE = import.meta.env.VITE_IS_REVIEWS_SITE === 'true' || window.location.hostname === 'reviews.teamrevolta.com';

interface GroupedData {
  show: Show;
  matches: {
    match: Match;
    review: ShowReview;
  }[];
}

export function MemberProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetReview = searchParams.get('review');

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [grouped, setGrouped] = useState<GroupedData[]>([]);
  const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    Promise.all([
      fetchPublicProfileById(uid),
      getAllShowReviews(),
      getAllShows(),
      getAllMatches(),
    ]).then(([prof, allReviews, allShows, allMatches]) => {
      setProfile(prof);

      const myReviews = allReviews.filter(r => r.authorId === uid);

      // Group: showId → { show, matches: { matchId → { match, review } }[] }
      const showMap = new Map<string, GroupedData>();
      for (const review of myReviews) {
        const show = allShows.find(s => s.id === review.showId);
        const match = allMatches.find(m => m.id === review.matchId);
        if (!show || !match) continue;

        if (!showMap.has(review.showId)) {
          showMap.set(review.showId, { show, matches: [] });
        }
        showMap.get(review.showId)!.matches.push({ match, review });
      }

      // Sort matches by order within each show; sort shows by date descending
      const result: GroupedData[] = [];
      showMap.forEach(g => {
        g.matches.sort((a, b) => a.match.order - b.match.order);
        result.push(g);
      });
      result.sort((a, b) => (b.show.date ?? '').localeCompare(a.show.date ?? ''));

      setGrouped(result);

      // Auto-expand the show that contains the target review
      if (targetReview) {
        for (const g of result) {
          if (g.matches.some(m => m.review.id === targetReview)) {
            setExpandedShows(new Set([g.show.id!]));
            break;
          }
        }
      } else {
        // Default: expand first show
        if (result.length > 0) {
          setExpandedShows(new Set([result[0].show.id!]));
        }
      }

      setLoading(false);
    });
  }, [uid]);

  // Scroll to target review after render
  useEffect(() => {
    if (!targetReview || loading) return;
    const el = document.getElementById(`review-${targetReview}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight');
        highlightTimeout.current = setTimeout(() => {
          el.classList.remove('highlight');
        }, 2500);
      }, 300);
    }
    return () => {
      if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    };
  }, [targetReview, loading]);

  const toggleShow = (showId: string) => {
    setExpandedShows(prev => {
      const next = new Set(prev);
      if (next.has(showId)) next.delete(showId);
      else next.add(showId);
      return next;
    });
  };

  const copyLink = (reviewId: string) => {
    const found = grouped.flatMap(g => g.matches).find(m => m.review.id === reviewId);
    const url = found?.review.showId
      ? `https://reviews.teamrevolta.com/${found.review.showId}?review=${reviewId}`
      : `${window.location.origin}/m/${uid}?review=${reviewId}`;
    navigator.clipboard.writeText(url);
    setCopied(reviewId);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalReviews = grouped.reduce((s, g) => s + g.matches.length, 0);
  const avgRating = totalReviews > 0
    ? (grouped.reduce((s, g) => s + g.matches.reduce((ss, m) => ss + m.review.rating, 0), 0) / totalReviews).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="mp-page">
        <div className="mp-loading">جارٍ التحميل…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mp-page">
        <div className="mp-not-found">العضو غير موجود</div>
      </div>
    );
  }

  return (
    <div className="mp-page">
      {/* Navbar */}
      <nav className="mp-nav">
        <button className="mp-back" onClick={() => navigate('/')}>
          {IS_REVIEWS_SITE ? '← التقييمات' : '← الرئيسية'}
        </button>
        <div className="mp-nav-brand">
          <img src="/assets/RevoltaLogoWithoutBack.png" className="mp-nav-team-logo" alt="Revolta" />
          <span className="mp-nav-wordmark">REVOLTA REVIEWS</span>
        </div>
      </nav>

      {/* Hero header */}
      <div className="mp-hero">
        <div className="mp-hero-glow" />
        <div className="mp-hero-inner">
          <div className="mp-avatar">
            {profile.photoURL
              ? <img src={profile.photoURL} alt={profile.name} />
              : profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="mp-hero-info">
            <div className="mp-name">{profile.name}</div>
            <div className="mp-role">{profile.jobRole}</div>
            {profile.twitterHandle && (
              <a
                className="mp-twitter"
                href={`https://x.com/${profile.twitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @{profile.twitterHandle}
              </a>
            )}
          </div>
          {totalReviews > 0 && (
            <div className="mp-stats">
              <div className="mp-stat">
                <span className="mp-stat-num">{totalReviews}</span>
                <span className="mp-stat-lbl">تقييم</span>
              </div>
              {avgRating && (
                <div className="mp-stat">
                  <span className="mp-stat-num">{avgRating}</span>
                  <span className="mp-stat-lbl">متوسط</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mp-content">
        {grouped.length === 0 ? (
          <div className="mp-empty">لا يوجد تقييمات بعد</div>
        ) : (
          <div className="mp-shows-list">
            {grouped.map(g => {
              const isOpen = expandedShows.has(g.show.id!);
              return (
                <div key={g.show.id} className="mp-show-card">
                  <div className="mp-show-header" onClick={() => toggleShow(g.show.id!)}>
                    <div className="mp-show-poster">
                      {g.show.posterUrl
                        ? <img src={g.show.posterUrl} alt={g.show.name} />
                        : <span>🏆</span>}
                    </div>
                    <div className="mp-show-info">
                      <div className="mp-show-name">{g.show.name}</div>
                      {g.show.subtitle && <div className="mp-show-sub">{g.show.subtitle}</div>}
                      <div className="mp-show-meta">
                        {g.show.date && <span>{g.show.date}</span>}
                        <span>{g.matches.length} تقييم</span>
                      </div>
                    </div>
                    <span className="mp-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div className="mp-matches-list">
                      {g.matches.map(({ match, review }) => {
                        const stars = Array.from({ length: 5 }, (_, i) => ({
                          filled: review.rating >= i + 1,
                          half: review.rating >= i + 0.5 && review.rating < i + 1,
                        }));
                        return (
                          <div key={review.id} className="mp-match-block">
                            <div className="mp-match-header">
                              <div className="mp-match-img">
                                {match.imageUrl
                                  ? <img src={match.imageUrl} alt={match.title} />
                                  : <span>🥊</span>}
                              </div>
                              <div className="mp-match-info">
                                <span className="mp-match-order">#{match.order}</span>
                                <span className="mp-match-title">{match.title}</span>
                              </div>
                            </div>

                            <div id={`review-${review.id}`} className="mp-review-card">
                              <div className="mp-review-top">
                                <div className="mp-stars">
                                  {stars.map((s, i) => (
                                    <svg key={i} width="15" height="15" viewBox="0 0 24 24"
                                      fill={s.filled ? '#e5ff00' : s.half ? 'url(#mp-half)' : 'none'}
                                      stroke="#e5ff00" strokeWidth="1.5">
                                      {s.half && (
                                        <defs>
                                          <linearGradient id="mp-half">
                                            <stop offset="50%" stopColor="#e5ff00" />
                                            <stop offset="50%" stopColor="transparent" />
                                          </linearGradient>
                                        </defs>
                                      )}
                                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                    </svg>
                                  ))}
                                  <span className="mp-rating-num">{review.rating}</span>
                                </div>
                                {review.verdict && (
                                  <span className="mp-verdict">{review.verdict}</span>
                                )}
                                <button
                                  className={`mp-copy-btn${copied === review.id ? ' copied' : ''}`}
                                  onClick={() => copyLink(review.id)}
                                  title="نسخ رابط التقييم"
                                >
                                  {copied === review.id ? '✓ تم النسخ' : '🔗 نسخ الرابط'}
                                </button>
                              </div>

                              {review.points && review.points.length > 0 && (
                                <div className="mp-points">
                                  {review.points.filter(p => p.positive).map((pt, i) => (
                                    <div key={`p${i}`} className="mp-point pos">
                                      <div className="mp-point-icon pos">✓</div>
                                      <span>{pt.text}</span>
                                    </div>
                                  ))}
                                  {review.points.filter(p => !p.positive).map((pt, i) => (
                                    <div key={`n${i}`} className="mp-point neg">
                                      <div className="mp-point-icon neg">−</div>
                                      <span>{pt.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {review.description && (
                                <div className="mp-desc">{review.description}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
