import { useEffect, useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { getAllReviews, createReview, deleteReview, updateReview } from '../../services/reviews.service';
import type { Review, ReviewPoint } from '../../services/reviews.service';
import { uploadImage, validateImageFile } from '../../services/cloudinary.service';
import { Spinner } from '../../components/ui/Spinner';
import './ReviewsPage.css';

const VERDICTS = ['أسطوري', 'استثنائي', 'ممتاز جداً', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف', 'سيء جداً'];

const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function StarSVG({ size, fill, id }: { size: number; fill: number; id: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={fill * 24} height="24" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill="#1e1e1e" />
      <path d={STAR_PATH} fill="#c9a84c" clipPath={`url(#${id})`} />
    </svg>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const display = hoverVal ?? value;

  const getVal = (star: number, pct: number) =>
    Math.max(1, Math.min(5, (star - 1) + Math.ceil(pct * 4) / 4));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
      {[1, 2, 3, 4, 5].map(star => {
        const fill = Math.min(1, Math.max(0, display - (star - 1)));
        return (
          <div key={star} style={{ cursor: 'pointer' }}
            onMouseMove={e => {
              const r = e.currentTarget.getBoundingClientRect();
              setHoverVal(getVal(star, (e.clientX - r.left) / r.width));
            }}
            onMouseLeave={() => setHoverVal(null)}
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect();
              onChange(getVal(star, (e.clientX - r.left) / r.width));
            }}
          >
            <StarSVG size={34} fill={fill} id={`pick-${star}`} />
          </div>
        );
      })}
      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: '#c9a84c', marginLeft: 6 }}>
        {display % 1 === 0 ? display.toFixed(1) : display} / 5
      </span>
    </div>
  );
}

function buildExportStar(size: number, fill: number, idx: number): string {
  const w = fill * 24;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:block">
    <defs><clipPath id="es${idx}"><rect x="0" y="0" width="${w}" height="24"/></clipPath></defs>
    <path d="${STAR_PATH}" fill="#1e1e1e"/>
    <path d="${STAR_PATH}" fill="#c9a84c" clip-path="url(#es${idx})"/>
  </svg>`;
}

interface LiveAuthor { name: string; photoURL?: string | null; twitterHandle?: string | null }

function ReviewCard({ review, isAdmin, currentUserId, liveAuthor, onDelete, onEdit }: { review: Review; isAdmin: boolean; currentUserId?: string; liveAuthor?: LiveAuthor; onDelete: (id: string) => void; onEdit: (r: Review) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const authorName    = liveAuthor?.name        ?? review.authorName;
  const authorPhoto   = liveAuthor?.photoURL    ?? review.authorPhotoURL;
  const authorTwitter = liveAuthor?.twitterHandle ?? review.authorTwitter;

  const pos = (review.points ?? []).filter(p => p.positive);
  const neg = (review.points ?? []).filter(p => !p.positive);
  const allPoints = [...pos, ...neg];

  const handleExport = async () => {
    setExporting(true);
    try {
      const CARD_W = 720;
      const POSTER_H = 380;

      const pos = (review.points ?? []).filter(p => p.positive);
      const neg = (review.points ?? []).filter(p => !p.positive);
      const allPoints = [...pos, ...neg];

      // شرط مشترك لكل نص عربي — يمنع html2canvas من كسر الحروف
      const AR = `font-family:'Cairo',sans-serif;direction:rtl;unicode-bidi:embed;letter-spacing:normal;`;

      // root card
      const wrap = document.createElement('div');
      wrap.setAttribute('style', [
        `position:fixed;top:-9999px;left:-9999px;`,
        `width:${CARD_W}px;background:#0a0a0a;`,
        `border:1px solid #1e1e1e;overflow:hidden;`,
        AR,
      ].join(''));

      /* ── TOP: full-bleed poster + bottom reveal overlay ── */
      const topGrid = document.createElement('div');
      topGrid.setAttribute('style', `position:relative;height:${POSTER_H}px;overflow:hidden;background:#040404;`);

      if (review.posterUrl) {
        const img = document.createElement('img');
        img.src = review.posterUrl;
        img.crossOrigin = 'anonymous';
        img.setAttribute('style', 'width:100%;height:100%;object-fit:cover;display:block;opacity:0.72;');
        topGrid.appendChild(img);
      }

      const starsHTML = [1,2,3,4,5].map(i => {
        const fill = Math.min(1, Math.max(0, review.rating - (i - 1)));
        return buildExportStar(18, fill, i + 100);
      }).join('');

      const overlay = document.createElement('div');
      overlay.setAttribute('style', [
        `position:absolute;inset:0;`,
        `background:linear-gradient(to top,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.55) 45%,transparent 75%);`,
        `display:flex;flex-direction:column;justify-content:flex-end;padding:22px 24px;`,
        AR,
      ].join(''));
      overlay.innerHTML = `
        <div style="${AR}font-size:22px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:${review.eventSubtitle ? 4 : 12}px;text-shadow:0 2px 16px rgba(0,0,0,0.9)">${esc(review.eventName)}</div>
        ${review.eventSubtitle ? `<div style="${AR}font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:12px">${esc(review.eventSubtitle)}</div>` : ''}
        <div style="display:flex;align-items:center;gap:12px;direction:ltr">
          <div style="display:flex;gap:5px;align-items:center">${starsHTML}</div>
          <div style="${AR}font-size:13px;color:rgba(255,255,255,0.5)">${esc(String(review.rating))} / 5</div>
          <div style="${AR}margin-right:auto;font-size:20px;font-weight:900;color:#c9a84c;text-shadow:0 0 20px rgba(201,168,76,0.5)">${esc(review.verdict)}</div>
        </div>
      `;
      topGrid.appendChild(overlay);
      wrap.appendChild(topGrid);

      /* ── GOLD ACCENT BAR ── */
      const accent = document.createElement('div');
      accent.setAttribute('style', 'height:2px;background:linear-gradient(to left,#c9a84c 60%,transparent);');
      wrap.appendChild(accent);

      /* ── BODY ── */
      const body = document.createElement('div');
      body.setAttribute('style', `padding:20px 20px 0;${AR}`);

      if (allPoints.length > 0) {
        const pointsDiv = document.createElement('div');
        pointsDiv.setAttribute('style', 'display:flex;flex-direction:column;gap:10px;margin-bottom:16px;');
        allPoints.forEach(p => {
          const row = document.createElement('div');
          row.setAttribute('style', `display:flex;align-items:flex-start;gap:10px;${AR}font-size:13.5px;line-height:1.7;color:#aaa;`);
          row.innerHTML = `
            <span style="color:${p.positive ? '#3a9e65' : '#8b0000'};font-size:12px;margin-top:3px;flex-shrink:0">◆</span>
            <span style="${AR}">${esc(p.text)}</span>
          `;
          pointsDiv.appendChild(row);
        });
        body.appendChild(pointsDiv);
      }

      if (review.description) {
        const desc = document.createElement('div');
        desc.setAttribute('style', `${AR}font-size:13px;line-height:1.8;color:#aaa;padding:12px 14px;background:#090909;border-right:2px solid #2a2a2a;margin-bottom:16px;white-space:pre-wrap;`);
        desc.textContent = review.description;
        body.appendChild(desc);
      }

      wrap.appendChild(body);

      /* ── BOTTOM BAR ── */
      const bottom = document.createElement('div');
      bottom.setAttribute('style', `display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid #141414;background:#060606;margin-top:14px;${AR}`);
      bottom.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#8b0000,#c9a84c);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;border:2px solid #c9a84c;overflow:hidden;flex-shrink:0;${AR}">
            ${authorPhoto
              ? `<img src="${esc(authorPhoto)}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
              : `<span style="${AR}font-size:18px;font-weight:700;color:#fff;">${esc(authorName.charAt(0))}</span>`
            }
          </div>
          <div style="${AR}">
            <div style="${AR}font-weight:700;font-size:14px;color:#ddd;">${esc(authorName)}</div>
            ${authorTwitter ? `<div style="font-size:11px;color:#c9a84c;direction:ltr;white-space:nowrap;word-break:keep-all;">𝕏 @${esc(authorTwitter)}</div>` : ''}
          </div>
        </div>
        <img src="${window.location.origin}/assets/RevoltaLogoWithoutBack.png" crossorigin="anonymous" style="height:56px;width:auto;object-fit:contain;opacity:0.9;" />
      `;
      wrap.appendChild(bottom);

      document.body.appendChild(wrap);

      // انتظر تحميل الخطوط + رسم الـ DOM
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(wrap, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0a',
        logging: false,
        width: CARD_W,
        height: wrap.offsetHeight,
      });
      document.body.removeChild(wrap);

      const link = document.createElement('a');
      link.download = `revolta-review-${review.eventName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rv-card-wrap">
      <div className="rv-card" ref={cardRef}>
        {isAdmin && (
          <button className="rv-admin-del" onClick={() => {
            if (confirm('حذف هذا التقييم؟')) onDelete(review.id);
          }}>حذف</button>
        )}

        {/* LEFT */}
        <div className="rv-left">
          <div className="rv-brand">
            <div className="rv-brand-logo">تقييم النزال</div>
            <div className="rv-brand-dot" />
            <div className="rv-brand-sub">WRESTLING REVIEW</div>
          </div>

          <div className="rv-points">
            {allPoints.map((p, i) => (
              <div key={i} className={`rv-point${p.positive ? '' : ' neg'}`}>
                <span className="rv-point-icon">◆</span>
                {p.text}
              </div>
            ))}
            {review.description && (
              <div className="rv-description">{review.description}</div>
            )}
          </div>

          <div className="rv-bottom">
            <div className="rv-reviewer">
              <div className="rv-avatar">
                {authorPhoto
                  ? <img src={authorPhoto} alt={authorName} />
                  : authorName.charAt(0)
                }
              </div>
              <div>
                <div className="rv-author-name">{authorName}</div>
                {authorTwitter && (
                  <div className="rv-author-handle">𝕏 @{authorTwitter}</div>
                )}
              </div>
            </div>
            <img src="/assets/RevoltaLogoWithoutBack.png" alt="Revolta" className="rv-team-logo" />
          </div>
        </div>

        {/* RIGHT — poster thumbnail */}
        <div className="rv-right">
          {review.posterUrl
            ? <img src={review.posterUrl} alt={review.eventName} className="rv-poster" crossOrigin="anonymous" />
            : (
              <div className="rv-poster-placeholder">
                <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 22, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', color: '#fff', lineHeight: 1.2 }}>
                  {review.eventName}
                </div>
              </div>
            )
          }
          <div className="rv-rating-badge">
            {[1,2,3,4,5].map(i => (
              <StarSVG key={i} size={12} fill={Math.min(1, Math.max(0, review.rating - (i-1)))} id={`rv-${review.id}-${i}`} />
            ))}
            <div className="rv-rating-max">{review.rating} / 5</div>
          </div>
        </div>
      </div>

      {/* actions — outside card so they don't appear in screenshot */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(isAdmin || currentUserId === review.authorId) && (
          <button className="rv-export-btn" onClick={() => onEdit(review)}
            style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.25)', color: 'var(--gold)' }}>
            ✎ تعديل
          </button>
        )}
        <button className="rv-export-btn" onClick={handleExport} disabled={exporting}>
          {exporting ? '⏳ جاري التصدير...' : '⬇ استخراج كصورة'}
        </button>
      </div>
    </div>
  );
}

function ReviewModal({ onClose, onSuccess, editReview }: { onClose: () => void; onSuccess: () => void; editReview?: Review }) {
  const { profile, firebaseUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editReview;

  const [eventName, setEventName] = useState(editReview?.eventName ?? '');
  const [eventSubtitle, setEventSubtitle] = useState(editReview?.eventSubtitle ?? '');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState(editReview?.posterUrl ?? '');
  const [contentMode, setContentMode] = useState<'points' | 'description'>(
    editReview ? (editReview.description ? 'description' : 'points') : 'points'
  );
  const [points, setPoints] = useState<ReviewPoint[]>(
    editReview?.points?.length ? editReview.points : [{ text: '', positive: true }, { text: '', positive: true }]
  );
  const [description, setDescription] = useState(editReview?.description ?? '');
  const [verdict, setVerdict] = useState(editReview?.verdict ?? 'ممتاز');
  const [rating, setRating] = useState(editReview?.rating ?? 3.5);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = (file: File | null) => {
    if (!file) return;
    try { validateImageFile(file); } catch (e: unknown) { setErr((e as Error).message); return; }
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
    setErr('');
  };

  const addPoint = () => setPoints(p => [...p, { text: '', positive: true }]);
  const removePoint = (i: number) => setPoints(p => p.filter((_, idx) => idx !== i));
  const togglePoint = (i: number) => setPoints(p => p.map((pt, idx) => idx === i ? { ...pt, positive: !pt.positive } : pt));
  const updatePoint = (i: number, text: string) => setPoints(p => p.map((pt, idx) => idx === i ? { ...pt, text } : pt));

  const handleSubmit = async () => {
    if (!eventName.trim()) { setErr('يرجى إدخال اسم الحدث'); return; }
    if (contentMode === 'points' && !points.some(p => p.text.trim())) {
      setErr('أضف نقطة واحدة على الأقل'); return;
    }
    if (contentMode === 'description' && !description.trim()) {
      setErr('يرجى كتابة الوصف'); return;
    }
    if (!firebaseUser || !profile) return;

    setSaving(true);
    setErr('');
    try {
      let posterUrl = editReview?.posterUrl ?? '';
      if (posterFile) posterUrl = await uploadImage(posterFile);

      if (isEdit && editReview) {
        await updateReview(editReview.id, {
          eventName: eventName.trim(),
          eventSubtitle: eventSubtitle.trim(),
          posterUrl,
          points: contentMode === 'points' ? points.filter(p => p.text.trim()) : [],
          description: contentMode === 'description' ? description.trim() : null,
          verdict,
          rating,
        });
      } else {
        if (!firebaseUser || !profile) return;
        await createReview({
          eventName: eventName.trim(),
          eventSubtitle: eventSubtitle.trim(),
          posterUrl,
          points: contentMode === 'points' ? points.filter(p => p.text.trim()) : [],
          description: contentMode === 'description' ? description.trim() : null,
          verdict,
          rating,
          createdAt: Date.now(),
          authorId: firebaseUser.uid,
          authorName: profile.name,
          authorPhotoURL: profile.photoURL ?? null,
          authorTwitter: profile.twitterHandle ?? null,
        });
      }
      onSuccess();
    } catch (e: unknown) {
      setErr((e as Error).message || 'حدث خطأ، حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rv-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="rv-modal" onClick={e => e.stopPropagation()}>
        <div className="rv-modal-hdr">
          <h2>{isEdit ? 'تعديل التقييم' : 'تقييم جديد'}</h2>
          <button className="rv-modal-close" onClick={() => !saving && onClose()}>✕</button>
        </div>

        <div className="rv-modal-body">
          {/* poster */}
          <div className="rv-field">
            <label>صورة الحدث (بوستر)</label>
            <div className="rv-upload-area" onClick={() => fileRef.current?.click()}>
              <input type="file" accept="image/*" ref={fileRef}
                onChange={e => handleFile(e.target.files?.[0] ?? null)} />
              {posterPreview
                ? <img src={posterPreview} alt="" className="rv-upload-preview" />
                : (
                  <label className="rv-upload-label">
                    <span className="rv-upload-icon">🖼</span>
                    <span>اضغط لرفع صورة البوستر</span>
                    <span style={{ fontSize: 11, color: '#444' }}>JPG · PNG · WebP · حتى 8MB</span>
                  </label>
                )
              }
            </div>
          </div>

          {/* event info */}
          <div className="rv-row">
            <div className="rv-field">
              <label>اسم الحدث *</label>
              <input value={eventName} onChange={e => setEventName(e.target.value)}
                placeholder="مثال: WrestleMania XL" disabled={saving} />
            </div>
          </div>

          <div className="rv-field">
            <label>العنوان الفرعي</label>
            <input value={eventSubtitle} onChange={e => setEventSubtitle(e.target.value)}
              placeholder="مثال: Philadelphia · 2024" disabled={saving} />
          </div>

          {/* content mode toggle */}
          <div className="rv-mode-toggle">
            <button
              className={`rv-mode-btn${contentMode === 'points' ? ' active' : ''}`}
              onClick={() => setContentMode('points')}
              disabled={saving}
            >◆ نقاط إيجابية / سلبية</button>
            <button
              className={`rv-mode-btn${contentMode === 'description' ? ' active' : ''}`}
              onClick={() => setContentMode('description')}
              disabled={saving}
            >✍ وصف كامل</button>
          </div>

          {/* points editor */}
          {contentMode === 'points' && (
            <div className="rv-field">
              <label>النقاط — اضغط الأيقونة للتبديل بين إيجابي / سلبي</label>
              <div className="rv-points-editor">
                {points.map((p, i) => (
                  <div key={i} className="rv-point-row">
                    <button
                      className={`rv-point-toggle ${p.positive ? 'pos' : 'neg'}`}
                      title={p.positive ? 'إيجابي' : 'سلبي'}
                      onClick={() => togglePoint(i)}
                      disabled={saving}
                    >{p.positive ? '◆' : '✕'}</button>
                    <input
                      value={p.text}
                      onChange={e => updatePoint(i, e.target.value)}
                      placeholder={p.positive ? 'نقطة إيجابية...' : 'نقطة سلبية...'}
                      disabled={saving}
                    />
                    {points.length > 1 && (
                      <button className="rv-point-remove" onClick={() => removePoint(i)} disabled={saving}>✕</button>
                    )}
                  </div>
                ))}
                <button className="rv-add-point" onClick={addPoint} disabled={saving}>+ إضافة نقطة</button>
              </div>
            </div>
          )}

          {/* description editor */}
          {contentMode === 'description' && (
            <div className="rv-field">
              <label>الوصف الكامل</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="اكتب تقييمك الكامل هنا..."
                rows={8}
                disabled={saving}
              />
            </div>
          )}

          {/* verdict + rating */}
          <div className="rv-row">
            <div className="rv-field">
              <label>التقييم النهائي</label>
              <select value={verdict} onChange={e => setVerdict(e.target.value)} disabled={saving}>
                {VERDICTS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="rv-field">
              <label>التقييم من 5 نجوم</label>
              <div style={{ padding: '6px 0' }}>
                <StarPicker value={rating} onChange={setRating} />
              </div>
            </div>
          </div>

          {err && <div className="rv-err">{err}</div>}
        </div>

        <div className="rv-modal-ftr">
          <button className="btn btn-ghost" onClick={() => !saving && onClose()} disabled={saving}>إلغاء</button>
          <button className="btn" onClick={handleSubmit} disabled={saving}>
            {saving ? '⏳ جاري الحفظ...' : 'نشر التقييم'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReviewsPage() {
  const { profile, firebaseUser } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([getAllReviews().then(setReviews), loadMembers()]);
    setLoading(false);
  }, [loadMembers]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteReview(id);
    setReviews(r => r.filter(rv => rv.id !== id));
  };

  return (
    <>
      <div className="reviews-hdr">
        <div>
          <h1>تقييم العروض</h1>
          <p>{reviews.length} تقييم منشور</p>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>+ تقييم جديد</button>
      </div>

      {loading
        ? <Spinner />
        : reviews.length === 0
          ? (
            <div className="reviews-empty">
              <div className="reviews-empty-icon">🎤</div>
              <div>لا توجد تقييمات بعد. كن أول من يقيّم!</div>
            </div>
          )
          : (
            <div className="reviews-grid">
              {reviews.map(rv => {
                const m = members.find(u => u.id === rv.authorId);
                return (
                  <ReviewCard
                    key={rv.id}
                    review={rv}
                    isAdmin={!!profile?.isAdmin}
                    currentUserId={firebaseUser?.uid}
                    liveAuthor={m ? { name: m.name, photoURL: m.photoURL, twitterHandle: m.twitterHandle } : undefined}
                    onDelete={handleDelete}
                    onEdit={setEditingReview}
                  />
                );
              })}
            </div>
          )
      }

      {showModal && (
        <ReviewModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
      {editingReview && (
        <ReviewModal
          editReview={editingReview}
          onClose={() => setEditingReview(null)}
          onSuccess={() => { setEditingReview(null); load(); }}
        />
      )}
    </>
  );
}
