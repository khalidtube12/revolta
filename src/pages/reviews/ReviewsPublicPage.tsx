import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllShows } from '../../services/shows.service';
import { getAllMatches } from '../../services/matches.service';
import { getAllShowReviews } from '../../services/showReviews.service';
import { fetchPublicProfiles } from '../../services/users.service';
import type { PublicProfile } from '../../services/users.service';
import type { Show, ShowReview, Match } from '../../types';
import './ReviewsPublicPage.css';

const IS_REVIEWS_SITE = import.meta.env.VITE_IS_REVIEWS_SITE === 'true' || window.location.hostname === 'reviews.teamrevolta.com';

interface ShowCard {
  show: Show;
  matchCount: number;
  reviewCount: number;
  avgRating: number;
}

interface MemberStat {
  profile: PublicProfile;
  reviewCount: number;
  showIds: Set<string>;
}

interface GroupedReviews {
  show: Show;
  items: { match: Match; review: ShowReview }[];
}

const MARQUEE_TEXT = 'REVOLTA REVIEWS • تقييمات ريفولتا • ';

export function ReviewsPublicPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<ShowCard[]>([]);
  const [members, setMembers] = useState<MemberStat[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'reviews'>('date');

  // raw data for member reviews view
  const [rawReviews, setRawReviews] = useState<ShowReview[]>([]);
  const [rawMatches, setRawMatches] = useState<Match[]>([]);
  const [rawShows, setRawShows] = useState<Show[]>([]);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([getAllShows(), getAllMatches(), getAllShowReviews(), fetchPublicProfiles()]).then(
      ([allShows, allMatches, allReviews, profiles]) => {
        setRawShows(allShows);
        setRawMatches(allMatches);
        setRawReviews(allReviews);

        const result: ShowCard[] = allShows
          .filter(s => s.published)
          .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
          .map(show => {
            const showReviews = allReviews.filter(r => r.showId === show.id);
            return {
              show,
              matchCount: allMatches.filter(m => m.showId === show.id).length,
              reviewCount: showReviews.length,
              avgRating: showReviews.length ? showReviews.reduce((s, r) => s + r.rating, 0) / showReviews.length : 0,
            };
          });
        setCards(result);
        setTotalReviews(allReviews.length);

        const memberMap = new Map<string, MemberStat>();
        for (const review of allReviews) {
          if (!memberMap.has(review.authorId)) {
            const profile = profiles.find(p => p.id === review.authorId);
            if (!profile) continue;
            memberMap.set(review.authorId, { profile, reviewCount: 0, showIds: new Set() });
          }
          const ms = memberMap.get(review.authorId)!;
          ms.reviewCount++;
          if (review.showId) ms.showIds.add(review.showId);
        }
        setMembers(Array.from(memberMap.values()).sort((a, b) => b.reviewCount - a.reviewCount));
        setLoading(false);
      }
    );
  }, []);

  // Compute selected member's reviews grouped by show
  const memberGrouped = useMemo<GroupedReviews[]>(() => {
    if (!selectedMemberId) return [];
    const myReviews = rawReviews.filter(r => r.authorId === selectedMemberId);
    const showMap = new Map<string, GroupedReviews>();
    for (const review of myReviews) {
      const show = rawShows.find(s => s.id === review.showId);
      const match = rawMatches.find(m => m.id === review.matchId);
      if (!show || !match) continue;
      if (!showMap.has(review.showId)) {
        showMap.set(review.showId, { show, items: [] });
      }
      showMap.get(review.showId)!.items.push({ match, review });
    }
    const result: GroupedReviews[] = [];
    showMap.forEach(g => {
      g.items.sort((a, b) => a.match.order - b.match.order);
      result.push(g);
    });
    result.sort((a, b) => (b.show.date ?? '').localeCompare(a.show.date ?? ''));
    return result;
  }, [selectedMemberId, rawReviews, rawShows, rawMatches]);

  const handleMemberClick = (memberId: string) => {
    if (selectedMemberId === memberId) {
      navigate(`/m/${memberId}`);
    } else {
      setSelectedMemberId(memberId);
      setExpandedReviews(new Set());
      setDrawerOpen(false);
    }
  };

  const toggleReview = (reviewId: string) => {
    setExpandedReviews(prev => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };

  const selectedMember = members.find(m => m.profile.id === selectedMemberId) ?? null;

  const sortedCards = useMemo(() => {
    const sorted = [...cards];
    if (sortBy === 'rating') sorted.sort((a, b) => b.avgRating - a.avgRating);
    else if (sortBy === 'reviews') sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    return sorted;
  }, [cards, sortBy]);

  const featuredCard = sortedCards[0] ?? null;
  const restCards = sortedCards.slice(1);

  return (
    <div className="rp-page">

      {/* Navbar */}
      <nav className="rp-nav">
        {!IS_REVIEWS_SITE && (
          <button className="rp-back" onClick={() => navigate('/')}>← الرئيسية</button>
        )}
        <div className="rp-nav-brand">
          <img src="/assets/RevoltaLogoWithoutBack.png" className="rp-nav-team-logo" alt="Revolta" />
          <span className="rp-nav-wordmark">REVOLTA REVIEWS</span>
        </div>
        <div className="rp-nav-end">
          <button className="rp-members-btn" onClick={() => navigate('/top')}>
            🏆 أفضل النزالات
          </button>
          {members.length > 0 && (
            <button className="rp-members-btn" onClick={() => setDrawerOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              الأعضاء
            </button>
          )}
        </div>
      </nav>

      {/* Filter Banner */}
      {selectedMember && (
        <div className="rp-filter-banner">
          <div className="rp-filter-banner-inner">
            <div className="rp-filter-banner-av">
              {selectedMember.profile.photoURL
                ? <img src={selectedMember.profile.photoURL} alt={selectedMember.profile.name} />
                : selectedMember.profile.name.charAt(0).toUpperCase()}
            </div>
            <span className="rp-filter-banner-text">
              تقييمات <strong>{selectedMember.profile.name}</strong>
            </span>
            <button
              className="rp-filter-banner-profile"
              onClick={() => navigate(`/m/${selectedMemberId}`)}
            >
              الملف الشخصي
            </button>
            <button className="rp-filter-banner-close" onClick={() => setSelectedMemberId(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Hero: Marquee + Stats */}
      <section className="rp-hero">
        <div className="rp-marquee-wrap">
          <div className="rp-marquee-inner">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="rp-marquee-text">{MARQUEE_TEXT}</span>
            ))}
          </div>
        </div>

        {!loading && (
          <div className="rp-stats-row">
            <div className="rp-stat-box">
              <span className="rp-stat-num accent">{cards.length}</span>
              <span className="rp-stat-lbl">عرض</span>
            </div>
            <div className="rp-stat-box">
              <span className="rp-stat-num">{members.length}</span>
              <span className="rp-stat-lbl">عضو</span>
            </div>
            <div className="rp-stat-box">
              <span className="rp-stat-num cyan">{totalReviews}</span>
              <span className="rp-stat-lbl">تقييم</span>
            </div>
          </div>
        )}
      </section>

      {/* Main */}
      <main className="rp-main">
        {loading ? (
          <div className="rp-loading">جارٍ التحميل…</div>
        ) : selectedMemberId ? (
          /* ── Member reviews view ── */
          <div className="rp-member-reviews">
            {memberGrouped.length === 0 ? (
              <div className="rp-empty">لا توجد تقييمات</div>
            ) : memberGrouped.map(g => (
              <div key={g.show.id} className="rp-mr-show">
                {/* Show header */}
                <div
                  className="rp-mr-show-header"
                  onClick={() => navigate(IS_REVIEWS_SITE ? '/' + g.show.id : '/show-reviews/' + g.show.id)}
                >
                  <div className="rp-mr-show-poster">
                    {g.show.posterUrl
                      ? <img src={g.show.posterUrl} alt={g.show.name} />
                      : <span>🏆</span>}
                  </div>
                  <div className="rp-mr-show-info">
                    <div className="rp-mr-show-name">{g.show.name}</div>
                    {g.show.subtitle && <div className="rp-mr-show-sub">{g.show.subtitle}</div>}
                    <div className="rp-mr-show-meta">
                      {g.show.date && <span>{g.show.date}</span>}
                      <span>{g.items.length} تقييم</span>
                    </div>
                  </div>
                  <span className="rp-mr-show-arrow">←</span>
                </div>

                {/* Reviews list */}
                <div className="rp-mr-list">
                  {g.items.map(({ match, review }) => {
                    const isOpen = expandedReviews.has(review.id);
                    const stars = Array.from({ length: 5 }, (_, i) => ({
                      filled: review.rating >= i + 1,
                      half: review.rating >= i + 0.5 && review.rating < i + 1,
                    }));
                    return (
                      <div key={review.id} className="rp-mr-item">
                        {/* Match row — clickable to toggle */}
                        <div className="rp-mr-match-row" onClick={() => toggleReview(review.id)}>
                          <div className="rp-mr-match-img">
                            {match.imageUrl
                              ? <img src={match.imageUrl} alt={match.title} />
                              : <span>🥊</span>}
                          </div>
                          <span className="rp-mr-match-order">#{match.order}</span>
                          <span className="rp-mr-match-title">{match.title}</span>
                          <span className="rp-mr-match-rating">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#e5ff00" stroke="#e5ff00" strokeWidth="1.5">
                              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </svg>
                            {review.rating}
                          </span>
                          <span className="rp-mr-chevron">{isOpen ? '▲' : '▼'}</span>
                        </div>

                        {/* Review content — collapsible */}
                        {isOpen && <div className="rp-mr-review">
                          <div className="rp-mr-review-top">
                            <div className="rp-mr-stars">
                              {stars.map((s, i) => (
                                <svg key={i} width="14" height="14" viewBox="0 0 24 24"
                                  fill={s.filled ? '#e5ff00' : s.half ? 'url(#rp-half)' : 'none'}
                                  stroke="#e5ff00" strokeWidth="1.5">
                                  {s.half && (
                                    <defs>
                                      <linearGradient id="rp-half">
                                        <stop offset="50%" stopColor="#e5ff00" />
                                        <stop offset="50%" stopColor="transparent" />
                                      </linearGradient>
                                    </defs>
                                  )}
                                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                </svg>
                              ))}
                              <span className="rp-mr-rating">{review.rating}</span>
                            </div>
                            {review.verdict && (
                              <span className="rp-mr-verdict">{review.verdict}</span>
                            )}
                          </div>

                          {review.points && review.points.length > 0 && (
                            <div className="rp-mr-points">
                              {review.points.filter(p => p.positive).map((pt, i) => (
                                <div key={`p${i}`} className="rp-mr-point">
                                  <div className="rp-mr-point-icon pos">✓</div>
                                  <span>{pt.text}</span>
                                </div>
                              ))}
                              {review.points.filter(p => !p.positive).map((pt, i) => (
                                <div key={`n${i}`} className="rp-mr-point">
                                  <div className="rp-mr-point-icon neg">−</div>
                                  <span>{pt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {review.description && (
                            <div className="rp-mr-desc">{review.description}</div>
                          )}
                        </div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="rp-empty">لا توجد عروض منشورة حتى الآن</div>
        ) : (
          <>
            {/* Featured show */}
            {featuredCard && (
              <div
                className="rp-featured"
                onClick={() => navigate(IS_REVIEWS_SITE ? '/' + featuredCard.show.id : '/show-reviews/' + featuredCard.show.id)}
              >
                {featuredCard.show.posterUrl
                  ? <img className="rp-featured-img" src={featuredCard.show.posterUrl} alt={featuredCard.show.name} />
                  : <div className="rp-featured-placeholder">🏆</div>}
                <div className="rp-featured-overlay" />
                <div className="rp-featured-content">
                  <div className="rp-featured-badges">
                    <span className="rp-badge-accent">مميز</span>
                    {featuredCard.show.date && <span className="rp-badge-glass">{featuredCard.show.date}</span>}
                  </div>
                  <h2 className="rp-featured-name">{featuredCard.show.name}</h2>
                  {featuredCard.show.subtitle && <p className="rp-featured-sub">{featuredCard.show.subtitle}</p>}
                  <div className="rp-featured-meta">
                    <span>{featuredCard.matchCount} نزال</span>
                    <span>{featuredCard.reviewCount} تقييم</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section header + sort */}
            {restCards.length > 0 && (
              <div className="rp-section-header">
                <h2 className="rp-section-title">جميع العروض</h2>
                <div className="rp-sort-btns">
                  {(['date', 'rating', 'reviews'] as const).map(opt => (
                    <button
                      key={opt}
                      className={`rp-sort-btn${sortBy === opt ? ' active' : ''}`}
                      onClick={() => setSortBy(opt)}
                    >
                      {opt === 'date' ? 'الأحدث' : opt === 'rating' ? '⭐ الأعلى' : '💬 الأكثر'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="rp-shows-grid">
              {restCards.map(({ show, matchCount, reviewCount }) => (
                <div
                  key={show.id}
                  className="rp-show-card"
                  onClick={() => navigate(IS_REVIEWS_SITE ? '/' + show.id : '/show-reviews/' + show.id)}
                >
                  <div className="rp-card-img-wrap">
                    {show.posterUrl
                      ? <img src={show.posterUrl} alt={show.name} className="rp-card-img" />
                      : <div className="rp-card-placeholder">🏆</div>}
                    <div className="rp-card-gradient" />
                    {show.date && (
                      <div className="rp-card-date-badge">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {show.date}
                      </div>
                    )}
                    <div className="rp-card-arrow">←</div>
                  </div>
                  <div className="rp-card-body">
                    <h3 className="rp-card-name">{show.name}</h3>
                    {show.subtitle && <p className="rp-card-sub">{show.subtitle}</p>}
                    <div className="rp-card-meta">
                      <span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                        {matchCount}
                      </span>
                      <span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {reviewCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="rp-footer">
        <span className="rp-footer-brand">REVOLTA</span>
        <span className="rp-footer-sep">·</span>
        <a href="https://teamrevolta.com" className="rp-footer-link" target="_blank" rel="noopener noreferrer">
          teamrevolta.com
        </a>
      </footer>

      {/* Members Drawer */}
      {drawerOpen && (
        <>
          <div className="rp-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="rp-drawer">
            <div className="rp-drawer-header">
              <div>
                <h2 className="rp-drawer-title">الأعضاء</h2>
                <p className="rp-drawer-subtitle">{members.length} عضو نشط</p>
              </div>
              <button className="rp-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="rp-drawer-list">
              {members.map((ms, index) => {
                const isSelected = selectedMemberId === ms.profile.id;
                const gradients = [
                  'linear-gradient(135deg,#e5ff00,#00d4ff)',
                  'linear-gradient(135deg,#ff6b6b,#feca57)',
                  'linear-gradient(135deg,#a55eea,#fd79a8)',
                  'linear-gradient(135deg,#00d4ff,#0984e3)',
                  'linear-gradient(135deg,#feca57,#ff9ff3)',
                ];
                const gradient = gradients[index % gradients.length];
                return (
                  <div
                    key={ms.profile.id}
                    className={`rp-drawer-row${isSelected ? ' selected' : ''}`}
                    onClick={() => handleMemberClick(ms.profile.id!)}
                  >
                    <div
                      className="rp-drawer-av"
                      style={isSelected ? { background: '#000', color: '#e5ff00' } : { background: gradient }}
                    >
                      {ms.profile.photoURL
                        ? <img src={ms.profile.photoURL} alt={ms.profile.name} />
                        : ms.profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="rp-drawer-info">
                      <div className={`rp-drawer-name${isSelected ? ' selected' : ''}`}>{ms.profile.name}</div>
                      {ms.profile.jobRole && (
                        <div className={`rp-drawer-role${isSelected ? ' selected' : ''}`}>{ms.profile.jobRole}</div>
                      )}
                    </div>
                    <div className={`rp-drawer-cnt-wrap${isSelected ? ' selected' : ''}`}>
                      <span className="rp-drawer-cnt">{ms.reviewCount}</span>
                      <span className="rp-drawer-cnt-lbl">تقييم</span>
                    </div>
                    {isSelected && (
                      <div className="rp-drawer-selected-hint">اضغط مرة أخرى للملف الشخصي ←</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
