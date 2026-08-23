import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getAllShows } from '../../services/shows.service';
import { getMatchesByShow } from '../../services/matches.service';
import { getReviewsByShow } from '../../services/showReviews.service';
import { getOverallReviewsByShow } from '../../services/showOverallReviews.service';
import { subscribeReviewLikes, toggleReviewLike, getReviewLikes } from '../../services/reviewLikes.service';
import { fetchPublicProfiles } from '../../services/users.service';
import type { PublicProfile } from '../../services/users.service';
import type { Show, Match, ShowReview, ShowOverallReview } from '../../types';
import './ShowDetailPage.css';

const IS_REVIEWS_SITE = import.meta.env.VITE_IS_REVIEWS_SITE === 'true' || window.location.hostname === 'reviews.teamrevolta.com';

interface MatchCard {
  match: Match;
  reviews: (ShowReview & { profile?: PublicProfile })[];
  avgRating: number;
}

type ReviewWithProfile = ShowReview & { profile?: PublicProfile };
type OverallReviewWithProfile = ShowOverallReview & { profile?: PublicProfile };

const THREAD_GRADIENTS = [
  'linear-gradient(135deg,#e5ff00,#00d4ff)',
  'linear-gradient(135deg,#ff6b6b,#feca57)',
  'linear-gradient(135deg,#a55eea,#fd79a8)',
  'linear-gradient(135deg,#00d4ff,#0984e3)',
  'linear-gradient(135deg,#feca57,#ff9ff3)',
];

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
  const months = Math.floor(diff / 2592000000);
  if (months < 12) return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
  const years = Math.floor(diff / 31536000000);
  return `منذ ${years} ${years === 1 ? 'سنة' : 'سنوات'}`;
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="sd-stars">
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1);
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <clipPath id={`sd-clip-${i}-${size}`}>
                <rect x="0" y="0" width={`${fill * 100}%`} height="24" />
              </clipPath>
            </defs>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill="#1e1e1e" stroke="none" />
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill="#e5ff00" stroke="none"
              clipPath={`url(#sd-clip-${i}-${size})`} />
          </svg>
        );
      })}
    </div>
  );
}

function LikeButton({ reviewId }: { reviewId: string }) {
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    const unsub = subscribeReviewLikes(reviewId, (count, isLiked) => {
      setLikes(count); setLiked(isLiked);
    });
    return unsub;
  }, [reviewId]);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes(n => wasLiked ? n - 1 : n + 1);
    try { await toggleReviewLike(reviewId); }
    catch { setLiked(wasLiked); setLikes(n => wasLiked ? n + 1 : n - 1); }
    finally { setLiking(false); }
  };

  return (
    <button className={`sd-like-btn${liked ? ' liked' : ''}`} onClick={handleLike} disabled={liking}>
      ❤ {likes > 0 ? likes : ''}
    </button>
  );
}

function ReviewThread({ review, index, isLast, copyLink, copied, goToMember, initialExpanded = false, onShareX }: {
  review: ReviewWithProfile;
  index: number;
  isLast: boolean;
  copyLink: (id: string) => void;
  copied: string | null;
  goToMember: (id: string) => void;
  initialExpanded?: boolean;
  onShareX?: () => void;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const name = review.profile?.name ?? review.authorName;
  const photo = review.profile?.photoURL ?? review.authorPhotoURL;
  const twitter = review.profile?.twitterHandle ?? review.authorTwitter;
  const role = review.profile?.jobRole;
  const gradient = THREAD_GRADIENTS[index % THREAD_GRADIENTS.length];
  const positives = review.points?.filter(p => p.positive) ?? [];
  const negatives = review.points?.filter(p => !p.positive) ?? [];
  const hasPoints = positives.length > 0 || negatives.length > 0;

  return (
    <div className="sd-thread-item">
      {/* Timeline left */}
      <div className="sd-thread-left">
        <div
          className="sd-thread-av"
          style={photo ? {} : { background: gradient }}
          onClick={() => goToMember(review.authorId)}
        >
          {photo ? <img src={photo} alt={name} /> : name.charAt(0).toUpperCase()}
        </div>
        {!isLast && <div className="sd-thread-line" />}
      </div>

      {/* Content */}
      <div className="sd-thread-content">
        {/* Header (always visible, clickable) */}
        <button
          className={`sd-thread-header${expanded ? ' expanded' : ''}`}
          onClick={() => setExpanded(e => !e)}
        >
          <div className="sd-thread-header-info">
            <span className="sd-thread-name">{name}</span>
            {review.verdict && <span className="sd-thread-verdict">{review.verdict}</span>}
            {role && <span className="sd-thread-role">{role}</span>}
            {review.createdAt > 0 && <span className="sd-thread-date">{formatDate(review.createdAt)}</span>}
          </div>
          <div className="sd-thread-header-end">
            <StarRow rating={review.rating} size={11} />
            <span className={`sd-thread-chevron${expanded ? ' up' : ''}`}>▼</span>
          </div>
        </button>

        {/* Preview when collapsed */}
        {!expanded && review.description && (
          <p className="sd-thread-preview">{review.description}</p>
        )}

        {/* Expanded body */}
        {expanded && (
          <div className="sd-thread-body">
            {hasPoints && (
              <div className="sd-thread-points">
                {positives.map((pt, i) => (
                  <div key={`p${i}`} className="sd-thread-point">
                    <div className="sd-thread-pt-icon pos">✓</div>
                    <span>{pt.text}</span>
                  </div>
                ))}
                {negatives.map((pt, i) => (
                  <div key={`n${i}`} className="sd-thread-point">
                    <div className="sd-thread-pt-icon neg">−</div>
                    <span>{pt.text}</span>
                  </div>
                ))}
              </div>
            )}

            {review.description && (
              <div className="sd-thread-desc-wrap">
                <div className="sd-thread-desc-bar" />
                <p className="sd-thread-desc">{review.description}</p>
              </div>
            )}

            <div className="sd-thread-actions">
              <LikeButton reviewId={review.id} />
              <div className="sd-thread-actions-end">
                <button
                  className={`sd-share-btn${copied === review.id ? ' copied' : ''}`}
                  onClick={() => copyLink(review.id)}
                  title="نسخ رابط التقييم"
                >
                  {copied === review.id ? '✓' : '🔗'}
                </button>
                {onShareX && (
                  <button className="sd-share-x-btn" onClick={onShareX} title="شارك على X">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                )}
                {twitter && (
                  <a href={`https://x.com/${twitter}`} target="_blank" rel="noopener noreferrer" className="sd-tw-action">
                    @{twitter}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OverallReviewCard({ review, index, goToMember, onShareX }: {
  review: OverallReviewWithProfile;
  index: number;
  goToMember: (id: string) => void;
  onShareX?: () => void;
}) {
  const name = review.profile?.name ?? review.authorName;
  const photo = review.profile?.photoURL ?? review.authorPhotoURL;
  const twitter = review.profile?.twitterHandle ?? review.authorTwitter;
  const role = review.profile?.jobRole;
  const gradient = THREAD_GRADIENTS[index % THREAD_GRADIENTS.length];
  const positives = review.points?.filter(p => p.positive) ?? [];
  const negatives = review.points?.filter(p => !p.positive) ?? [];
  const hasPoints = positives.length > 0 || negatives.length > 0;

  return (
    <div className="sd-overall-card">
      <div className="sd-overall-card-header">
        <div
          className="sd-thread-av"
          style={photo ? {} : { background: gradient }}
          onClick={() => goToMember(review.authorId)}
        >
          {photo ? <img src={photo} alt={name} /> : name.charAt(0).toUpperCase()}
        </div>
        <div className="sd-overall-card-meta">
          <div className="sd-overall-card-top">
            <button className="sd-author-name" onClick={() => goToMember(review.authorId)}>{name}</button>
            {review.verdict && <span className="sd-thread-verdict">{review.verdict}</span>}
          </div>
          <div className="sd-overall-card-sub-row">
            {role && <span className="sd-overall-card-role">{role}</span>}
            {review.createdAt > 0 && <span className="sd-thread-date">{formatDate(review.createdAt)}</span>}
          </div>
        </div>
        <div className="sd-overall-card-rating">
          <StarRow rating={review.rating} size={13} />
        </div>
      </div>

      {hasPoints && (
        <div className="sd-thread-points sd-overall-points">
          {positives.map((pt, i) => (
            <div key={`p${i}`} className="sd-thread-point">
              <div className="sd-thread-pt-icon pos">✓</div>
              <span>{pt.text}</span>
            </div>
          ))}
          {negatives.map((pt, i) => (
            <div key={`n${i}`} className="sd-thread-point">
              <div className="sd-thread-pt-icon neg">−</div>
              <span>{pt.text}</span>
            </div>
          ))}
        </div>
      )}

      {review.description && (
        <div className="sd-thread-desc-wrap sd-overall-desc-wrap">
          <div className="sd-thread-desc-bar" />
          <p className="sd-thread-desc">{review.description}</p>
        </div>
      )}

      <div className="sd-thread-actions sd-overall-actions">
        <LikeButton reviewId={review.id} />
        <div className="sd-thread-actions-end">
          {onShareX && (
            <button className="sd-share-x-btn" onClick={onShareX} title="شارك على X">
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
          )}
          {twitter && (
            <a href={`https://x.com/${twitter}`} target="_blank" rel="noopener noreferrer" className="sd-tw-action">
              @{twitter}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShowDetailPage() {
  const { showId } = useParams<{ showId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetReview = searchParams.get('review');

  const [show, setShow] = useState<Show | null>(null);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [overallReviews, setOverallReviews] = useState<OverallReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [popupReview, setPopupReview] = useState<{ review: ReviewWithProfile; matchTitle: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showId) return;
    Promise.all([
      getAllShows(),
      getMatchesByShow(showId),
      getReviewsByShow(showId),
      fetchPublicProfiles(),
      getOverallReviewsByShow(showId).catch(() => [] as ShowOverallReview[]),
    ]).then(async ([allShows, matches, reviews, profiles, overalls]) => {
      setShow(allShows.find(s => s.id === showId) ?? null);
      const profileMap = new Map<string, PublicProfile>(profiles.map(p => [p.id!, p]));

      const mappedOveralls: OverallReviewWithProfile[] = overalls.map(r => ({ ...r, profile: profileMap.get(r.authorId) }));

      const matchCards: MatchCard[] = matches.map(match => {
        const matchReviews = reviews
          .filter(r => r.matchId === match.id)
          .map(r => ({ ...r, profile: profileMap.get(r.authorId) }));
        const avgRating = matchReviews.length
          ? matchReviews.reduce((s, r) => s + r.rating, 0) / matchReviews.length : 0;
        return { match, reviews: matchReviews, avgRating };
      }).filter(c => c.reviews.length > 0);

      // Fetch likes for all reviews then sort by count descending
      const allIds = [
        ...matchCards.flatMap(c => c.reviews.map(r => r.id)),
        ...mappedOveralls.map(r => r.id),
      ];
      const likeCounts = await Promise.all(allIds.map(id => getReviewLikes(id).then(r => [id, r.count] as [string, number])));
      const likesMap = new Map<string, number>(likeCounts);

      matchCards.forEach(card => {
        card.reviews.sort((a, b) => (likesMap.get(b.id) ?? 0) - (likesMap.get(a.id) ?? 0));
      });
      mappedOveralls.sort((a, b) => (likesMap.get(b.id) ?? 0) - (likesMap.get(a.id) ?? 0));

      setOverallReviews(mappedOveralls);
      setCards(matchCards);

      if (targetReview) {
        for (const card of matchCards) {
          const found = card.reviews.find(r => r.id === targetReview);
          if (found) { setPopupReview({ review: found, matchTitle: card.match.title }); break; }
        }
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [showId]);

  const selectMatch = (matchId: string) => {
    const isOpening = selectedMatchId !== matchId;
    setSelectedMatchId(prev => prev === matchId ? null : matchId);
    if (isOpening) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  const copyLink = (reviewId: string) => {
    const base = IS_REVIEWS_SITE
      ? `${window.location.origin}/${showId}`
      : `${window.location.origin}/show-reviews/${showId}`;
    navigator.clipboard.writeText(`${base}?review=${reviewId}`);
    setCopied(reviewId);
    setTimeout(() => setCopied(null), 2000);
  };

  const closePopup = () => {
    setPopupReview(null);
    setSearchParams({}, { replace: true });
  };

  const goToMember = (authorId: string) => navigate('/m/' + authorId);

  const activeCard = cards.find(c => c.match.id === selectedMatchId) ?? null;
  const totalReviews = cards.reduce((s, c) => s + c.reviews.length, 0);
  const allReviewsForAvg = [...overallReviews, ...cards.flatMap(c => c.reviews)];
  const overallAvg = allReviewsForAvg.length
    ? allReviewsForAvg.reduce((s, r) => s + r.rating, 0) / allReviewsForAvg.length : 0;

  // Controversial match: highest std-dev with ≥2 reviews
  const controversialMatchId = useMemo(() => {
    let maxStd = 0.5; // minimum threshold
    let result: string | null = null;
    for (const card of cards) {
      if (card.reviews.length < 2) continue;
      const avg = card.avgRating;
      const variance = card.reviews.reduce((s, r) => s + Math.pow(r.rating - avg, 2), 0) / card.reviews.length;
      const std = Math.sqrt(variance);
      if (std > maxStd) { maxStd = std; result = card.match.id; }
    }
    return result;
  }, [cards]);

  const buildShareOnX = (reviewerName: string, subject: string, rating: number, verdict: string, reviewId: string) => () => {
    const text = `رأي ${reviewerName} في "${subject}": ${rating}/5 ⭐${verdict ? ` — "${verdict}"` : ''}`;
    const url = IS_REVIEWS_SITE
      ? `${window.location.origin}/${showId}?review=${reviewId}`
      : `${window.location.origin}/show-reviews/${showId}?review=${reviewId}`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const buildShareOnXOverall = (reviewerName: string, rating: number, verdict: string, reviewId: string) => () => {
    const text = `رأي ${reviewerName} في عرض "${show?.name}": ${rating}/5 ⭐${verdict ? ` — "${verdict}"` : ''}`;
    const url = IS_REVIEWS_SITE
      ? `${window.location.origin}/${showId}`
      : `${window.location.origin}/show-reviews/${showId}`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="sd-page">

      {/* Navbar */}
      <header className="sd-nav">
        <button className="sd-back" onClick={() => navigate(IS_REVIEWS_SITE ? '/' : '/show-reviews')}>
          العروض ←
        </button>
        <div className="sd-nav-brand">
          <img src="/assets/RevoltaLogoWithoutBack.png" className="sd-nav-team-logo" alt="Revolta" />
          <span className="sd-nav-wordmark">REVOLTA REVIEWS</span>
        </div>
      </header>

      {loading ? (
        <div className="sd-loading">جارٍ التحميل…</div>
      ) : !show ? (
        <div className="sd-loading">العرض غير موجود</div>
      ) : (
        <>
          {/* Full-width hero */}
          <section className="sd-hero">
            {show.posterUrl && (
              <img className="sd-hero-bg-img" src={show.posterUrl} alt={show.name} />
            )}
            <div className="sd-hero-overlay" />
            <div className="sd-hero-content">
              <div className="sd-hero-badges">
                {overallAvg > 0 && (
                  <span className="sd-hero-badge-lime">★ {overallAvg.toFixed(1)}</span>
                )}
                {show.date && (
                  <span className="sd-hero-badge-glass">{show.date}</span>
                )}
              </div>
              <h1 className="sd-show-name">{show.name}</h1>
              {show.subtitle && <p className="sd-show-sub">{show.subtitle}</p>}
              <div className="sd-hero-stats">
                <div className="sd-hero-stat">
                  <div className="sd-hero-stat-icon cyan">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                  </div>
                  <div>
                    <span className="sd-hero-stat-num">{cards.length}</span>
                    <span className="sd-hero-stat-lbl">نزال</span>
                  </div>
                </div>
                <div className="sd-hero-stat">
                  <div className="sd-hero-stat-icon lime">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <span className="sd-hero-stat-num">{totalReviews}</span>
                    <span className="sd-hero-stat-lbl">تقييم</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="sd-main">
            {/* Overall reviews */}
            {overallReviews.length > 0 && (
              <section className="sd-overall-section">
                <div className="sd-section-header">
                  <h2 className="sd-section-title">تقييم العرض كامل</h2>
                  <span className="sd-section-badge">{overallReviews.length} تقييم</span>
                </div>
                <div className="sd-overall-container">
                  {overallReviews.map((r, i) => (
                    <OverallReviewCard
                      key={r.id} review={r} index={i} goToMember={goToMember}
                      onShareX={buildShareOnXOverall(r.profile?.name ?? r.authorName, r.rating, r.verdict, r.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Matches */}
            {cards.length > 0 && (
              <section className="sd-matches-section">
                <div className="sd-section-header">
                  <h2 className="sd-section-title">النزالات</h2>
                  <span className="sd-section-count">{cards.length} نزال</span>
                </div>

                <div className="sd-grid">
                  {cards.map(card => {
                    const isActive = selectedMatchId === card.match.id;
                    const isControversial = card.match.id === controversialMatchId;
                    return (
                      <div
                        key={card.match.id}
                        className={`sd-card${isActive ? ' active' : ''}`}
                        onClick={() => selectMatch(card.match.id)}
                      >
                        <div className="sd-card-img">
                          {card.match.imageUrl
                            ? <img src={card.match.imageUrl} alt={card.match.title} />
                            : <div className="sd-card-placeholder">🥊</div>}
                          <div className="sd-card-overlay">
                            <span className={`sd-card-order${isActive ? ' active' : ''}`}>
                              #{card.match.order}
                            </span>
                          </div>
                          {isActive && (
                            <div className="sd-card-active-indicator">
                              <span>★</span>
                            </div>
                          )}
                          {isControversial && !isActive && (
                            <div className="sd-card-controversial">🔥 جدلي</div>
                          )}
                        </div>
                        <div className="sd-card-footer">
                          <span className="sd-card-title">{card.match.title}</span>
                          <div className="sd-card-rating-row">
                            {card.avgRating > 0 && (
                              <>
                                <StarRow rating={card.avgRating} size={11} />
                                <span className="sd-card-avg">{card.avgRating.toFixed(1)}</span>
                              </>
                            )}
                            <span className="sd-card-count">{card.reviews.length} تقييم</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reviews panel */}
                {activeCard && (
                  <div className="sd-panel" ref={panelRef}>
                    {/* Panel header */}
                    <div className="sd-panel-hero">
                      {activeCard.match.imageUrl && (
                        <img className="sd-panel-hero-img" src={activeCard.match.imageUrl} alt={activeCard.match.title} />
                      )}
                      <div className="sd-panel-hero-overlay" />
                      <div className="sd-panel-hero-content">
                        <span className="sd-panel-order">#{activeCard.match.order}</span>
                        <h3 className="sd-panel-title">{activeCard.match.title}</h3>
                        <div className="sd-panel-avg-row">
                          <StarRow rating={activeCard.avgRating} size={14} />
                          <span className="sd-panel-avg-num">{activeCard.avgRating.toFixed(1)}</span>
                          <span className="sd-panel-avg-lbl">· {activeCard.reviews.length} تقييم</span>
                        </div>
                      </div>
                      <button className="sd-panel-close" onClick={() => setSelectedMatchId(null)}>✕</button>
                    </div>

                    {/* Thread reviews */}
                    <div className="sd-thread-list">
                      {activeCard.reviews.length > 0 ? (
                        activeCard.reviews.map((review, index) => (
                          <ReviewThread
                            key={review.id}
                            review={review}
                            index={index}
                            isLast={index === activeCard.reviews.length - 1}
                            copyLink={copyLink}
                            copied={copied}
                            goToMember={goToMember}
                            onShareX={buildShareOnX(review.profile?.name ?? review.authorName, activeCard.match.title, review.rating, review.verdict, review.id)}
                          />
                        ))
                      ) : (
                        <div className="sd-empty">لا توجد تقييمات لهذا النزال بعد</div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {cards.length === 0 && overallReviews.length === 0 && (
              <div className="sd-empty">لا توجد تقييمات لهذا العرض حتى الآن</div>
            )}
          </div>

          <footer className="sd-footer">
            <span className="sd-footer-brand">REVOLTA</span>
            <span className="sd-footer-sep">·</span>
            <a href="https://teamrevolta.com" className="sd-footer-link" target="_blank" rel="noopener noreferrer">
              teamrevolta.com
            </a>
          </footer>
        </>
      )}

      {/* Popup for deep link */}
      {popupReview && show && (
        <div className="sd-popup-overlay" onClick={closePopup}>
          <div className="sd-rp-popup" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sd-rp-popup-header">
              <button className="sd-rp-popup-x" onClick={closePopup}>✕</button>
              <div className="sd-rp-popup-breadcrumb">
                <span className="sd-rp-popup-show-name">{show.name}</span>
                <span className="sd-rp-popup-sep">·</span>
                <span className="sd-rp-popup-match-name">{popupReview.matchTitle}</span>
              </div>
              <div className="sd-rp-popup-reviewer">
                {(() => {
                  const name = popupReview.review.profile?.name ?? popupReview.review.authorName;
                  const photo = popupReview.review.profile?.photoURL ?? popupReview.review.authorPhotoURL;
                  const role = popupReview.review.profile?.jobRole;
                  const gradient = THREAD_GRADIENTS[0];
                  return (
                    <>
                      <div
                        className="sd-rp-popup-av"
                        style={photo ? {} : { background: gradient }}
                        onClick={() => goToMember(popupReview.review.authorId)}
                      >
                        {photo ? <img src={photo} alt={name} /> : name.charAt(0).toUpperCase()}
                      </div>
                      <div className="sd-rp-popup-reviewer-info">
                        <span className="sd-rp-popup-reviewer-name">{name}</span>
                        {role && <span className="sd-rp-popup-reviewer-role">{role}</span>}
                      </div>
                      <div className="sd-rp-popup-rating">
                        <StarRow rating={popupReview.review.rating} size={14} />
                        <span className="sd-rp-popup-rating-num">{popupReview.review.rating}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              {popupReview.review.verdict && (
                <span className="sd-rp-popup-verdict">{popupReview.review.verdict}</span>
              )}
            </div>

            {/* Review body */}
            <div className="sd-rp-popup-body">
              {popupReview.review.points && popupReview.review.points.length > 0 && (
                <div className="sd-thread-points">
                  {popupReview.review.points.filter(p => p.positive).map((pt, i) => (
                    <div key={`p${i}`} className="sd-thread-point">
                      <div className="sd-thread-pt-icon pos">✓</div>
                      <span>{pt.text}</span>
                    </div>
                  ))}
                  {popupReview.review.points.filter(p => !p.positive).map((pt, i) => (
                    <div key={`n${i}`} className="sd-thread-point">
                      <div className="sd-thread-pt-icon neg">−</div>
                      <span>{pt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {popupReview.review.description && (
                <div className="sd-thread-desc-wrap">
                  <div className="sd-thread-desc-bar" />
                  <p className="sd-thread-desc">{popupReview.review.description}</p>
                </div>
              )}

              <div className="sd-rp-popup-actions">
                <LikeButton reviewId={popupReview.review.id} />
                <button
                  className="sd-rp-popup-close-btn"
                  onClick={closePopup}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
