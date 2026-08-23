import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useShowsStore } from '../../stores/showsStore';
import { useMembersStore } from '../../stores/membersStore';
import { createShowReview, updateShowReview, deleteShowReview } from '../../services/showReviews.service';
import { getAllShowOverallReviews, createShowOverallReview, updateShowOverallReview, deleteShowOverallReview } from '../../services/showOverallReviews.service';
import { getReviewLikes, toggleReviewLike } from '../../services/reviewLikes.service';
import { Spinner } from '../../components/ui/Spinner';
import type { Show, Match, ShowReview, ShowOverallReview, ShowReviewPoint } from '../../types';
import { ShowReviewExport } from './ShowReviewExport';
import { ShowOverallReviewExport } from './ShowOverallReviewExport';
import './ShowsPage.css';

const VERDICTS = ['أسطوري', 'استثنائي', 'ممتاز جداً', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف', 'سيء جداً'];
const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function StarSVG({ size, fill, id }: { size: number; fill: number; id: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <defs><clipPath id={id}><rect x="0" y="0" width={fill * 24} height="24" /></clipPath></defs>
      <path d={STAR_PATH} fill="#1e1e1e" />
      <path d={STAR_PATH} fill="#c9a84c" clipPath={`url(#${id})`} />
    </svg>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const getVal = (star: number, pct: number) => Math.max(1, Math.min(5, (star - 1) + Math.ceil(pct * 4) / 4));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
      {[1,2,3,4,5].map(star => {
        const fill = Math.min(1, Math.max(0, display - (star - 1)));
        return (
          <div key={star} style={{ cursor: 'pointer' }}
            onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHover(getVal(star, (e.clientX - r.left) / r.width)); }}
            onMouseLeave={() => setHover(null)}
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onChange(getVal(star, (e.clientX - r.left) / r.width)); }}
          >
            <StarSVG size={28} fill={fill} id={`sp-${star}`} />
          </div>
        );
      })}
      <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: 12, color: 'var(--gold)', marginLeft: 6 }}>
        {display % 1 === 0 ? display.toFixed(1) : display} / 5
      </span>
    </div>
  );
}

function ReviewModal({ match, existingReview, onClose, onSaved }: {
  match: Match;
  existingReview?: ShowReview;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile, firebaseUser } = useAuthStore();
  const isEdit = !!existingReview;

  const [showPoints, setShowPoints] = useState(
    existingReview ? (existingReview.points?.length ?? 0) > 0 : true
  );
  const [showDescription, setShowDescription] = useState(
    existingReview ? !!existingReview.description : false
  );
  const [points, setPoints] = useState<ShowReviewPoint[]>(
    existingReview?.points?.length ? existingReview.points : [{ text: '', positive: true }, { text: '', positive: true }]
  );
  const [description, setDescription] = useState(existingReview?.description ?? '');
  const [verdict, setVerdict] = useState(existingReview?.verdict ?? 'ممتاز');
  const [rating, setRating] = useState(existingReview?.rating ?? 3.5);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const addPoint = () => setPoints(p => [...p, { text: '', positive: true }]);
  const removePoint = (i: number) => setPoints(p => p.filter((_, idx) => idx !== i));
  const togglePoint = (i: number) => setPoints(p => p.map((pt, idx) => idx === i ? { ...pt, positive: !pt.positive } : pt));
  const updatePoint = (i: number, text: string) => setPoints(p => p.map((pt, idx) => idx === i ? { ...pt, text } : pt));

  const handleSave = async () => {
    if (showDescription && !description.trim()) { setErr('يرجى كتابة الوصف'); return; }
    if (!firebaseUser || !profile) return;
    setSaving(true); setErr('');
    try {
      const data = {
        matchId: match.id,
        showId: match.showId,
        points: showPoints ? points.filter(p => p.text.trim()) : [],
        description: showDescription ? description.trim() : null,
        verdict,
        rating,
      };
      if (isEdit && existingReview) {
        await updateShowReview(existingReview.id, data);
      } else {
        await createShowReview({
          ...data,
          createdAt: Date.now(),
          authorId: firebaseUser.uid,
          authorName: profile.name,
          authorPhotoURL: profile.photoURL ?? null,
          authorTwitter: profile.twitterHandle ?? null,
        });
      }
      onSaved();
    } catch { setErr('حدث خطأ، حاول مجدداً'); }
    finally { setSaving(false); }
  };

  return (
    <div className="sh-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="sh-modal" onClick={e => e.stopPropagation()}>
        <div className="sh-modal-hdr">
          <h2>{isEdit ? 'تعديل التقييم' : 'كتابة تقييم'}</h2>
          <div className="sh-modal-match">{match.title}</div>
          <button className="sh-modal-close" onClick={() => !saving && onClose()}>✕</button>
        </div>
        <div className="sh-modal-body">
          <div className="sh-mode-toggle">
            <button className={`sh-mode-btn${showPoints ? ' active' : ''}`} onClick={() => setShowPoints(v => !v)} disabled={saving}>◆ نقاط</button>
            <button className={`sh-mode-btn${showDescription ? ' active' : ''}`} onClick={() => setShowDescription(v => !v)} disabled={saving}>✍ وصف</button>
          </div>

          {showPoints && (
            <div className="sh-points-editor">
              {points.map((p, i) => (
                <div key={i} className="sh-point-row">
                  <button className={`sh-pt-toggle ${p.positive ? 'pos' : 'neg'}`} onClick={() => togglePoint(i)} disabled={saving}>
                    {p.positive ? '◆' : '✕'}
                  </button>
                  <input value={p.text} onChange={e => updatePoint(i, e.target.value)}
                    placeholder={p.positive ? 'نقطة إيجابية...' : 'نقطة سلبية...'} disabled={saving} />
                  {points.length > 1 && <button className="sh-pt-rm" onClick={() => removePoint(i)} disabled={saving}>✕</button>}
                </div>
              ))}
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={addPoint} disabled={saving}>+ إضافة نقطة</button>
            </div>
          )}

          {showDescription && (
            <textarea className="sh-desc" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="اكتب تقييمك..." rows={6} disabled={saving} />
          )}

          <div className="sh-row">
            <div className="sh-field">
              <label>الحكم</label>
              <select value={verdict} onChange={e => setVerdict(e.target.value)} disabled={saving}>
                {VERDICTS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="sh-field">
              <label>التقييم</label>
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>

          {err && <div className="sh-err">{err}</div>}
        </div>
        <div className="sh-modal-ftr">
          <button className="btn btn-ghost" onClick={() => !saving && onClose()} disabled={saving}>إلغاء</button>
          <button className="btn" onClick={handleSave} disabled={saving}>{saving ? '⏳ جاري الحفظ...' : 'نشر التقييم'}</button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, match, showName, canDelete, onDelete, onEdit }: {
  review: ShowReview;
  match: Match;
  showName: string;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onEdit: (r: ShowReview) => void;
}) {
  const { firebaseUser } = useAuthStore();
  const { members } = useMembersStore();
  const m = members.find(u => u.id === review.authorId);
  const authorName = m?.name ?? review.authorName;
  const authorPhoto = m?.photoURL ?? review.authorPhotoURL;
  const authorTwitter = m?.twitterHandle ?? review.authorTwitter;

  const isOwner = firebaseUser?.uid === review.authorId;
  const allPoints = [...(review.points ?? []).filter(p => p.positive), ...(review.points ?? []).filter(p => !p.positive)];

  const [exporting, setExporting] = useState(false);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    getReviewLikes(review.id).then(r => { setLikes(r.count); setLiked(r.liked); });
  }, [review.id]);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes(n => wasLiked ? n - 1 : n + 1);
    try { await toggleReviewLike(review.id); }
    catch { setLiked(wasLiked); setLikes(n => wasLiked ? n + 1 : n - 1); }
    finally { setLiking(false); }
  };

  const handleCopyLink = () => {
    const url = review.showId
      ? `https://reviews.teamrevolta.com/${review.showId}?review=${review.id}`
      : `https://reviews.teamrevolta.com/?review=${review.id}`;
    navigator.clipboard.writeText(url).then(() => alert('تم نسخ الرابط!'));
  };

  return (
    <div className="sh-review-card">
      <div className="sh-review-author">
        <div className="sh-avatar">
          {authorPhoto ? <img src={authorPhoto} alt={authorName} /> : authorName.charAt(0)}
        </div>
        <div>
          <div className="sh-author-name">{authorName}</div>
          {authorTwitter && <div className="sh-author-handle">𝕏 @{authorTwitter}</div>}
        </div>
        <div className="sh-review-rating">
          <div style={{ display: 'flex', gap: 3 }}>
            {[1,2,3,4,5].map(i => (
              <StarSVG key={i} size={12} fill={Math.min(1, Math.max(0, review.rating - (i-1)))} id={`rv-${review.id}-${i}`} />
            ))}
          </div>
          <span className="sh-verdict">{review.verdict}</span>
        </div>
      </div>

      {allPoints.length > 0 && (
        <div className="sh-points">
          {allPoints.map((p, i) => (
            <div key={i} className={`sh-point${p.positive ? '' : ' neg'}`}>
              <span className="sh-point-dot">◆</span>{p.text}
            </div>
          ))}
        </div>
      )}
      {review.description && <div className="sh-review-desc">{review.description}</div>}

      <div className="sh-review-actions">
        {isOwner && (
          <button className="btn btn-xs btn-ghost" onClick={() => onEdit(review)}>✎ تعديل</button>
        )}
        {(canDelete || isOwner) && (
          <button className="btn btn-xs btn-danger" onClick={() => onDelete(review.id)}>حذف</button>
        )}
        <button className={`btn btn-xs sh-like-btn${liked ? ' liked' : ''}`} onClick={handleLike} disabled={liking}>
          ❤ {likes > 0 ? likes : ''}
        </button>
        <button className="btn btn-xs btn-ghost" onClick={handleCopyLink} title="نسخ رابط التقييم">🔗 نسخ رابط</button>
        <button className="btn btn-xs btn-ghost" onClick={() => {
          setExporting(true);
          ShowReviewExport({ review: { ...review, authorName, authorPhoto: authorPhoto ?? null, authorTwitter: authorTwitter ?? null }, match, showName })
            .finally(() => setExporting(false));
        }} disabled={exporting}>
          {exporting ? '⏳' : '⬇ صورة'}
        </button>
      </div>
    </div>
  );
}

function MatchSection({ show, match, reviews, canDelete, canReview, currentUserId, onReload }: {
  show: Show;
  match: Match;
  reviews: ShowReview[];
  canDelete: boolean;
  canReview: boolean;
  currentUserId?: string;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<ShowReview | null>(null);

  const myReview = reviews.find(r => r.authorId === currentUserId);
  const matchReviews = reviews.filter(r => r.matchId === match.id);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا التقييم؟')) return;
    await deleteShowReview(id);
    onReload();
  };

  return (
    <div className="sh-match">
      <div className="sh-match-header" onClick={() => setOpen(o => !o)}>
        <div className="sh-match-img">
          {match.imageUrl ? <img src={match.imageUrl} alt={match.title} /> : <span>🥊</span>}
        </div>
        <div className="sh-match-info">
          <span className="sh-match-order">#{match.order}</span>
          <span className="sh-match-title">{match.title}</span>
        </div>
        <div className="sh-match-right">
          <span className="sh-match-count">{matchReviews.length} تقييم</span>
          {canReview && !myReview && (
            <button className="btn btn-xs" onClick={e => { e.stopPropagation(); setReviewModal(true); }}>
              + تقييم
            </button>
          )}
          {myReview && (
            <button className="btn btn-xs btn-ghost" onClick={e => { e.stopPropagation(); setEditingReview(myReview); }}>
              ✎ تقييمي
            </button>
          )}
          <span className="sh-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="sh-reviews-list">
          {matchReviews.length === 0
            ? <div className="sh-no-reviews">لا توجد تقييمات لهذا النزال بعد</div>
            : matchReviews.map(r => (
              <ReviewCard key={r.id} review={r} match={match} showName={show.name} canDelete={canDelete}
                onDelete={handleDelete} onEdit={setEditingReview} />
            ))
          }
        </div>
      )}

      {(reviewModal || editingReview) && (
        <ReviewModal
          match={match}
          existingReview={editingReview ?? undefined}
          onClose={() => { setReviewModal(false); setEditingReview(null); }}
          onSaved={() => { setReviewModal(false); setEditingReview(null); onReload(); }}
        />
      )}
    </div>
  );
}

// ── Overall Show Review Modal ──────────────────────────────────────
function ShowOverallReviewModal({ show, existingReview, onClose, onSaved }: {
  show: Show;
  existingReview?: ShowOverallReview;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile, firebaseUser } = useAuthStore();
  const isEdit = !!existingReview;
  const [showPoints, setShowPoints] = useState(existingReview ? (existingReview.points?.length ?? 0) > 0 : true);
  const [showDescription, setShowDescription] = useState(existingReview ? !!existingReview.description : false);
  const [points, setPoints] = useState<ShowReviewPoint[]>(
    existingReview?.points?.length ? existingReview.points : [{ text: '', positive: true }, { text: '', positive: true }]
  );
  const [description, setDescription] = useState(existingReview?.description ?? '');
  const [verdict, setVerdict] = useState(existingReview?.verdict ?? 'ممتاز');
  const [rating, setRating] = useState(existingReview?.rating ?? 3.5);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const addPoint = () => setPoints(p => [...p, { text: '', positive: true }]);
  const removePoint = (i: number) => setPoints(p => p.filter((_, idx) => idx !== i));
  const togglePoint = (i: number) => setPoints(p => p.map((pt, idx) => idx === i ? { ...pt, positive: !pt.positive } : pt));
  const updatePoint = (i: number, text: string) => setPoints(p => p.map((pt, idx) => idx === i ? { ...pt, text } : pt));

  const handleSave = async () => {
    if (showDescription && !description.trim()) { setErr('يرجى كتابة الوصف'); return; }
    if (!firebaseUser || !profile) return;
    setSaving(true); setErr('');
    try {
      const data = {
        showId: show.id,
        points: showPoints ? points.filter(p => p.text.trim()) : [],
        description: showDescription ? description.trim() : null,
        verdict,
        rating,
      };
      if (isEdit && existingReview) {
        await updateShowOverallReview(existingReview.id, data);
      } else {
        await createShowOverallReview({
          ...data,
          createdAt: Date.now(),
          authorId: firebaseUser.uid,
          authorName: profile.name,
          authorPhotoURL: profile.photoURL ?? null,
          authorTwitter: profile.twitterHandle ?? null,
        });
      }
      onSaved();
    } catch { setErr('حدث خطأ، حاول مجدداً'); }
    finally { setSaving(false); }
  };

  return (
    <div className="sh-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="sh-modal" onClick={e => e.stopPropagation()}>
        <div className="sh-modal-hdr">
          <h2>{isEdit ? 'تعديل التقييم' : 'تقييم العرض كامل'}</h2>
          <div className="sh-modal-match">{show.name}</div>
          <button className="sh-modal-close" onClick={() => !saving && onClose()}>✕</button>
        </div>
        <div className="sh-modal-body">
          <div className="sh-mode-toggle">
            <button className={`sh-mode-btn${showPoints ? ' active' : ''}`} onClick={() => setShowPoints(v => !v)} disabled={saving}>◆ نقاط</button>
            <button className={`sh-mode-btn${showDescription ? ' active' : ''}`} onClick={() => setShowDescription(v => !v)} disabled={saving}>✍ وصف</button>
          </div>
          {showPoints && (
            <div className="sh-points-editor">
              {points.map((p, i) => (
                <div key={i} className="sh-point-row">
                  <button className={`sh-pt-toggle ${p.positive ? 'pos' : 'neg'}`} onClick={() => togglePoint(i)} disabled={saving}>{p.positive ? '◆' : '✕'}</button>
                  <input value={p.text} onChange={e => updatePoint(i, e.target.value)}
                    placeholder={p.positive ? 'نقطة إيجابية...' : 'نقطة سلبية...'} disabled={saving} />
                  {points.length > 1 && <button className="sh-pt-rm" onClick={() => removePoint(i)} disabled={saving}>✕</button>}
                </div>
              ))}
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={addPoint} disabled={saving}>+ إضافة نقطة</button>
            </div>
          )}
          {showDescription && (
            <textarea className="sh-desc" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="اكتب تقييمك للعرض كاملاً..." rows={6} disabled={saving} />
          )}
          <div className="sh-row">
            <div className="sh-field">
              <label>الحكم</label>
              <select value={verdict} onChange={e => setVerdict(e.target.value)} disabled={saving}>
                {VERDICTS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="sh-field">
              <label>التقييم</label>
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>
          {err && <div className="sh-err">{err}</div>}
        </div>
        <div className="sh-modal-ftr">
          <button className="btn btn-ghost" onClick={() => !saving && onClose()} disabled={saving}>إلغاء</button>
          <button className="btn" onClick={handleSave} disabled={saving}>{saving ? '⏳ جاري الحفظ...' : 'نشر التقييم'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Overall Show Review Card ───────────────────────────────────────
function ShowOverallReviewCard({ review, show, matches, canDelete, onDelete, onEdit }: {
  review: ShowOverallReview;
  show: Show;
  matches: Match[];
  canDelete: boolean;
  onDelete: (id: string) => void;
  onEdit: (r: ShowOverallReview) => void;
}) {
  const { firebaseUser } = useAuthStore();
  const { members } = useMembersStore();
  const m = members.find(u => u.id === review.authorId);
  const authorName = m?.name ?? review.authorName;
  const authorPhoto = m?.photoURL ?? review.authorPhotoURL;
  const authorTwitter = m?.twitterHandle ?? review.authorTwitter;
  const isOwner = firebaseUser?.uid === review.authorId;
  const allPoints = [...(review.points ?? []).filter(p => p.positive), ...(review.points ?? []).filter(p => !p.positive)];
  const [exporting, setExporting] = useState(false);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    getReviewLikes(review.id).then(r => { setLikes(r.count); setLiked(r.liked); });
  }, [review.id]);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes(n => wasLiked ? n - 1 : n + 1);
    try { await toggleReviewLike(review.id); }
    catch { setLiked(wasLiked); setLikes(n => wasLiked ? n + 1 : n - 1); }
    finally { setLiking(false); }
  };

  const handleCopyLink = () => {
    const url = `https://reviews.teamrevolta.com/${review.showId}`;
    navigator.clipboard.writeText(url).then(() => alert('تم نسخ الرابط!'));
  };

  return (
    <div className="sh-review-card sh-overall-review-card">
      <div className="sh-review-author">
        <div className="sh-avatar">
          {authorPhoto ? <img src={authorPhoto} alt={authorName} /> : authorName.charAt(0)}
        </div>
        <div className="sh-author-info">
          <span className="sh-author-name">{authorName}</span>
          {authorTwitter && <span className="sh-author-handle">𝕏 @{authorTwitter}</span>}
        </div>
        <div className="sh-review-score">
          <div style={{ display: 'flex', gap: 3 }}>
            {[1,2,3,4,5].map(s => {
              const fill = Math.min(1, Math.max(0, review.rating - (s - 1)));
              return <StarSVG key={s} size={12} fill={fill} id={`ov-${review.id}-${s}`} />;
            })}
          </div>
          <span className="sh-verdict">{review.verdict}</span>
        </div>
      </div>
      {allPoints.length > 0 && (
        <div className="sh-points">
          {allPoints.map((p, i) => (
            <div key={i} className={`sh-point${p.positive ? '' : ' neg'}`}>
              <span className="sh-point-dot">◆</span>{p.text}
            </div>
          ))}
        </div>
      )}
      {review.description && <div className="sh-review-desc">{review.description}</div>}
      <div className="sh-review-actions">
        {isOwner && <button className="btn btn-xs btn-ghost" onClick={() => onEdit(review)}>✎ تعديل</button>}
        {(canDelete || isOwner) && <button className="btn btn-xs btn-danger" onClick={() => onDelete(review.id)}>حذف</button>}
        <button className={`btn btn-xs sh-like-btn${liked ? ' liked' : ''}`} onClick={handleLike} disabled={liking}>
          ❤ {likes > 0 ? likes : ''}
        </button>
        <button className="btn btn-xs btn-ghost" onClick={handleCopyLink} title="نسخ رابط العرض">🔗 نسخ رابط</button>
        <button className="btn btn-xs btn-ghost" onClick={() => {
          setExporting(true);
          ShowOverallReviewExport({
            review: { ...review, authorName, authorPhoto: authorPhoto ?? null, authorTwitter: authorTwitter ?? null },
            show,
            matches,
          }).finally(() => setExporting(false));
        }} disabled={exporting}>
          {exporting ? '⏳' : '⬇ صورة'}
        </button>
      </div>
    </div>
  );
}

// ── Overall Show Reviews Section ───────────────────────────────────
function ShowOverallSection({ show, matches, overallReviews, canDelete, canReview, currentUserId, onReload }: {
  show: Show;
  matches: Match[];
  overallReviews: ShowOverallReview[];
  canDelete: boolean;
  canReview: boolean;
  currentUserId?: string;
  onReload: () => void;
}) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ShowOverallReview | null>(null);
  const myReview = overallReviews.find(r => r.authorId === currentUserId);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا التقييم؟')) return;
    await deleteShowOverallReview(id);
    onReload();
  };

  return (
    <div className="sh-overall-section">
      <div className="sh-overall-header">
        <span className="sh-overall-title">🏆 تقييم العرض كامل</span>
        <span className="sh-overall-count">{overallReviews.length} تقييم</span>
        {canReview && !myReview && (
          <button className="btn btn-xs" onClick={() => setModal(true)}>+ تقييم العرض</button>
        )}
        {myReview && (
          <button className="btn btn-xs btn-ghost" onClick={() => setEditing(myReview)}>✎ تقييمي</button>
        )}
      </div>
      {overallReviews.length > 0 && (
        <div className="sh-overall-reviews">
          {overallReviews.map(r => (
            <ShowOverallReviewCard key={r.id} review={r} show={show} matches={matches} canDelete={canDelete}
              onDelete={handleDelete} onEdit={setEditing} />
          ))}
        </div>
      )}
      {(modal || editing) && (
        <ShowOverallReviewModal
          show={show}
          existingReview={editing ?? undefined}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={() => { setModal(false); setEditing(null); onReload(); }}
        />
      )}
    </div>
  );
}

function ShowCard({ show, matches, reviews, overallReviews, canDelete, canReview, currentUserId, onReload }: {
  show: Show;
  matches: Match[];
  reviews: ShowReview[];
  overallReviews: ShowOverallReview[];
  canDelete: boolean;
  canReview: boolean;
  currentUserId?: string;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const showMatches = matches.filter(m => m.showId === show.id).sort((a, b) => a.order - b.order);
  const reviewCount = reviews.filter(r => r.showId === show.id).length;
  const showOverallReviews = overallReviews.filter(r => r.showId === show.id);

  return (
    <div className="sh-show-card">
      <div className="sh-show-header" onClick={() => setOpen(o => !o)}>
        <div className="sh-show-poster">
          {show.posterUrl ? <img src={show.posterUrl} alt={show.name} /> : <span>🎭</span>}
        </div>
        <div className="sh-show-info">
          <div className="sh-show-name">{show.name}</div>
          {show.subtitle && <div className="sh-show-sub">{show.subtitle}</div>}
          <div className="sh-show-meta">
            {show.date && <span>📅 {show.date}</span>}
            <span>{showMatches.length} نزال · {reviewCount} تقييم نزال · {showOverallReviews.length} تقييم عرض</span>
          </div>
        </div>
        <span className="sh-chevron">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="sh-matches-list">
          <ShowOverallSection
            show={show}
            matches={showMatches}
            overallReviews={showOverallReviews}
            canDelete={canDelete}
            canReview={canReview}
            currentUserId={currentUserId}
            onReload={onReload}
          />
          {showMatches.length > 0 && (
            <div className="sh-matches-divider">النزالات</div>
          )}
          {showMatches.map(match => (
            <MatchSection
              key={match.id}
              show={show}
              match={match}
              reviews={reviews.filter(r => r.matchId === match.id)}
              canDelete={canDelete}
              canReview={canReview}
              currentUserId={currentUserId}
              onReload={onReload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ShowsPage() {
  const { profile, firebaseUser, can } = useAuthStore();
  const { shows, matches, reviews, loading, loadAll } = useShowsStore();
  const { members, loadMembers } = useMembersStore();
  const [overallReviews, setOverallReviews] = useState<ShowOverallReview[]>([]);

  const load = useCallback(async () => {
    await Promise.all([
      loadAll(),
      loadMembers(),
      getAllShowOverallReviews().then(setOverallReviews),
    ]);
  }, [loadAll, loadMembers]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const isAdmin = !!profile?.isAdmin;
  const canReview = isAdmin || can('postReviews');
  const canDeleteReview = isAdmin || can('deleteReview');
  const publishedShows = shows.filter(s => s.published);

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>تقييمات العروض</h1>
          <p>{publishedShows.length} عرض · {reviews.length} تقييم نزال · {overallReviews.length} تقييم عرض</p>
        </div>
      </div>

      {publishedShows.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo, sans-serif' }}>
          لا توجد عروض منشورة بعد
        </div>
      ) : (
        <div className="sh-shows-list">
          {publishedShows.map(show => (
            <ShowCard
              key={show.id}
              show={show}
              matches={matches}
              reviews={reviews}
              overallReviews={overallReviews}
              canDelete={canDeleteReview}
              canReview={canReview}
              currentUserId={firebaseUser?.uid}
              onReload={load}
            />
          ))}
        </div>
      )}
    </>
  );
}
