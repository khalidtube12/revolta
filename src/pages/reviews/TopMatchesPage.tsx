import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllShows } from '../../services/shows.service';
import { getAllMatches } from '../../services/matches.service';
import { getAllShowReviews } from '../../services/showReviews.service';
import type { Show, Match } from '../../types';
import './TopMatchesPage.css';

const IS_REVIEWS_SITE = import.meta.env.VITE_IS_REVIEWS_SITE === 'true' || window.location.hostname === 'reviews.teamrevolta.com';

interface TopMatch {
  match: Match;
  show: Show;
  avgRating: number;
  reviewCount: number;
}

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

export function TopMatchesPage() {
  const navigate = useNavigate();
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllShows(), getAllMatches(), getAllShowReviews()]).then(([allShows, allMatches, allReviews]) => {
      const publishedShowIds = new Set(allShows.filter(s => s.published).map(s => s.id!));
      const result: TopMatch[] = [];

      for (const match of allMatches) {
        if (!publishedShowIds.has(match.showId)) continue;
        const reviews = allReviews.filter(r => r.matchId === match.id);
        if (reviews.length === 0) continue;
        const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        const show = allShows.find(s => s.id === match.showId)!;
        result.push({ match, show, avgRating, reviewCount: reviews.length });
      }

      result.sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);
      setTopMatches(result.slice(0, 25));
      setLoading(false);
    });
  }, []);

  const goToShow = (showId: string) =>
    navigate(IS_REVIEWS_SITE ? `/${showId}` : `/show-reviews/${showId}`);

  return (
    <div className="tm-page">
      {/* Navbar */}
      <nav className="tm-nav">
        <button className="tm-back" onClick={() => navigate(IS_REVIEWS_SITE ? '/' : '/show-reviews')}>
          العروض ←
        </button>
        <div className="tm-nav-brand">
          <img src="/assets/RevoltaLogoWithoutBack.png" className="tm-nav-logo" alt="Revolta" />
          <span className="tm-nav-wordmark">REVOLTA REVIEWS</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="tm-hero">
        <div className="tm-hero-glow" />
        <div className="tm-hero-inner">
          <div className="tm-hero-tag">TOP MATCHES</div>
          <h1 className="tm-hero-title">أفضل النزالات</h1>
          <p className="tm-hero-sub">أعلى النزالات تقييماً عبر جميع العروض</p>
        </div>
      </section>

      {/* List */}
      <main className="tm-main">
        {loading ? (
          <div className="tm-loading">جارٍ التحميل…</div>
        ) : topMatches.length === 0 ? (
          <div className="tm-empty">لا توجد نزالات مقيّمة بعد</div>
        ) : (
          <div className="tm-list">
            {topMatches.map((item, i) => (
              <div key={item.match.id} className="tm-row" onClick={() => goToShow(item.show.id!)}>
                {/* Rank */}
                <div className={`tm-rank${i < 3 ? ' top' : ''}`}>
                  {i < 3 ? MEDAL[i] : <span className="tm-rank-num">#{i + 1}</span>}
                </div>

                {/* Match image */}
                <div className="tm-img">
                  {item.match.imageUrl
                    ? <img src={item.match.imageUrl} alt={item.match.title} />
                    : <span>🥊</span>}
                </div>

                {/* Info */}
                <div className="tm-info">
                  <div className="tm-match-title">{item.match.title}</div>
                  <div className="tm-show-name">
                    <span className="tm-show-tag">{item.show.name}</span>
                    {item.show.date && <span className="tm-show-date">{item.show.date}</span>}
                  </div>
                </div>

                {/* Rating */}
                <div className="tm-rating">
                  <span className="tm-rating-num">{item.avgRating.toFixed(1)}</span>
                  <span className="tm-rating-lbl">{item.reviewCount} تقييم</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="tm-footer">
        <span className="tm-footer-brand">REVOLTA</span>
        <span>·</span>
        <a href="https://teamrevolta.com" className="tm-footer-link" target="_blank" rel="noopener noreferrer">
          teamrevolta.com
        </a>
      </footer>
    </div>
  );
}
