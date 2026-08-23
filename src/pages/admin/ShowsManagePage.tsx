import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useShowsStore } from '../../stores/showsStore';
import { uploadImage, validateImageFile } from '../../services/cloudinary.service';
import { Spinner } from '../../components/ui/Spinner';
import type { Show, Match } from '../../types';
import './ShowsManagePage.css';

function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try { validateImageFile(file); } catch (e: unknown) { setErr((e as Error).message); return; }
    setUploading(true); setErr('');
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch { setErr('فشل رفع الصورة'); }
    finally { setUploading(false); }
  };

  return (
    <div className="sm-field">
      <label>{label}</label>
      <div className="sm-upload" onClick={() => ref.current?.click()}>
        <input type="file" accept="image/*" ref={ref} onChange={e => handleFile(e.target.files?.[0] ?? null)} />
        {value
          ? <img src={value} alt="" className="sm-upload-preview" />
          : <span className="sm-upload-placeholder">{uploading ? '⏳ جاري الرفع...' : '🖼 اضغط لرفع صورة'}</span>
        }
      </div>
      {err && <span className="sm-err">{err}</span>}
    </div>
  );
}

function ShowForm({ initial, onSave, onCancel }: {
  initial?: Partial<Show>;
  onSave: (data: Omit<Show, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [posterUrl, setPosterUrl] = useState(initial?.posterUrl ?? '');
  const [published, setPublished] = useState(initial?.published ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setErr('اسم العرض مطلوب'); return; }
    setSaving(true); setErr('');
    try { await onSave({ name: name.trim(), subtitle: subtitle.trim(), date, posterUrl, published }); }
    catch { setErr('حدث خطأ، حاول مجدداً'); }
    finally { setSaving(false); }
  };

  return (
    <div className="sm-form">
      <div className="sm-field">
        <label>اسم العرض *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: WrestleMania XL" disabled={saving} />
      </div>
      <div className="sm-field">
        <label>العنوان الفرعي</label>
        <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="مثال: Philadelphia · 2024" disabled={saving} />
      </div>
      <div className="sm-field">
        <label>التاريخ</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={saving} />
      </div>
      <ImageUploadField label="صورة البوستر" value={posterUrl} onChange={setPosterUrl} />
      <label className="sm-check">
        <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
        منشور (يظهر للأعضاء والجمهور)
      </label>
      {err && <div className="sm-err">{err}</div>}
      <div className="sm-form-actions">
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>إلغاء</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? '⏳ جاري الحفظ...' : 'حفظ'}</button>
      </div>
    </div>
  );
}

function MatchForm({ showId, initial, onSave, onCancel }: {
  showId: string;
  initial?: Partial<Match>;
  onSave: (data: Omit<Match, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [order, setOrder] = useState(initial?.order ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setErr('عنوان النزال مطلوب'); return; }
    setSaving(true); setErr('');
    try { await onSave({ showId, title: title.trim(), imageUrl, order }); }
    catch { setErr('حدث خطأ، حاول مجدداً'); }
    finally { setSaving(false); }
  };

  return (
    <div className="sm-form sm-match-form">
      <div className="sm-field">
        <label>النزال *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: Roman Reigns vs Cody Rhodes" disabled={saving} />
      </div>
      <div className="sm-field">
        <label>الترتيب</label>
        <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} disabled={saving} style={{ width: 80 }} />
      </div>
      <ImageUploadField label="صورة النزال" value={imageUrl} onChange={setImageUrl} />
      {err && <div className="sm-err">{err}</div>}
      <div className="sm-form-actions">
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>إلغاء</button>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? '⏳' : 'حفظ'}</button>
      </div>
    </div>
  );
}

export function ShowsManagePage() {
  const { profile, firebaseUser } = useAuthStore();
  const { shows, matches, loading, loadAll, addShow, editShow, removeShow, addMatch, editMatch, removeMatch } = useShowsStore();

  const [addingShow, setAddingShow] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [expandedShow, setExpandedShow] = useState<string | null>(null);
  const [addingMatchTo, setAddingMatchTo] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return <Spinner />;

  const canManage = !!profile?.isAdmin || !!(profile?.permissions?.manageShows);
  const canDelete = !!profile?.isAdmin || !!(profile?.permissions?.deleteShow);
  if (!canManage) return <div style={{ padding: 40, color: 'var(--muted)' }}>ليس لديك صلاحية</div>;

  const handleAddShow = async (data: Omit<Show, 'id' | 'createdAt' | 'createdBy'>) => {
    await addShow({ ...data, createdAt: Date.now(), createdBy: firebaseUser?.uid ?? '' });
    setAddingShow(false);
  };

  const handleEditShow = async (data: Omit<Show, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!editingShow) return;
    await editShow(editingShow.id, data);
    setEditingShow(null);
  };

  const handleDeleteShow = async (id: string) => {
    if (!confirm('حذف العرض؟ سيتم حذف كل نزالاته أيضاً.')) return;
    const showMatches = matches.filter(m => m.showId === id);
    await Promise.all(showMatches.map(m => removeMatch(m.id)));
    await removeShow(id);
  };

  const handleAddMatch = async (data: Omit<Match, 'id' | 'createdAt'>) => {
    await addMatch({ ...data, createdAt: Date.now() });
    setAddingMatchTo(null);
  };

  const handleEditMatch = async (data: Omit<Match, 'id' | 'createdAt'>) => {
    if (!editingMatch) return;
    await editMatch(editingMatch.id, data);
    setEditingMatch(null);
  };

  const handleDeleteMatch = async (id: string) => {
    if (!confirm('حذف هذا النزال؟')) return;
    await removeMatch(id);
  };

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>إدارة العروض</h1>
          <p>{shows.length} عرض مضاف</p>
        </div>
        <button className="btn" onClick={() => setAddingShow(true)}>+ عرض جديد</button>
      </div>

      {addingShow && (
        <div className="sm-section">
          <div className="sm-section-title">عرض جديد</div>
          <ShowForm onSave={handleAddShow} onCancel={() => setAddingShow(false)} />
        </div>
      )}

      {shows.length === 0 && !addingShow && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
          لا توجد عروض بعد. أضف أول عرض من الزر أعلاه.
        </div>
      )}

      <div className="sm-shows-list">
        {shows.map(show => {
          const showMatches = matches.filter(m => m.showId === show.id).sort((a, b) => a.order - b.order);
          const isExpanded = expandedShow === show.id;

          return (
            <div className="sm-show-card" key={show.id}>
              <div className="sm-show-header" onClick={() => setExpandedShow(isExpanded ? null : show.id)}>
                <div className="sm-show-poster">
                  {show.posterUrl
                    ? <img src={show.posterUrl} alt={show.name} />
                    : <span>🎭</span>
                  }
                </div>
                <div className="sm-show-info">
                  <div className="sm-show-name">{show.name}</div>
                  {show.subtitle && <div className="sm-show-sub">{show.subtitle}</div>}
                  <div className="sm-show-meta">
                    {show.date && <span>📅 {show.date}</span>}
                    <span className={`sm-badge ${show.published ? 'sm-badge-green' : 'sm-badge-gray'}`}>
                      {show.published ? 'منشور' : 'مخفي'}
                    </span>
                    <span>{showMatches.length} نزال</span>
                  </div>
                </div>
                <div className="sm-show-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-xs btn-ghost" onClick={() => setEditingShow(show)}>تعديل</button>
                  {canDelete && (
                    <button className="btn btn-xs btn-danger" onClick={() => handleDeleteShow(show.id)}>حذف</button>
                  )}
                </div>
                <span className="sm-chevron">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {editingShow?.id === show.id && (
                <div className="sm-section">
                  <ShowForm initial={editingShow} onSave={handleEditShow} onCancel={() => setEditingShow(null)} />
                </div>
              )}

              {isExpanded && (
                <div className="sm-matches">
                  {showMatches.map(match => (
                    <div className="sm-match-row" key={match.id}>
                      {editingMatch?.id === match.id ? (
                        <MatchForm
                          showId={show.id}
                          initial={editingMatch}
                          onSave={handleEditMatch}
                          onCancel={() => setEditingMatch(null)}
                        />
                      ) : (
                        <>
                          <div className="sm-match-img">
                            {match.imageUrl
                              ? <img src={match.imageUrl} alt={match.title} />
                              : <span>🥊</span>
                            }
                          </div>
                          <div className="sm-match-info">
                            <span className="sm-match-order">#{match.order}</span>
                            <span className="sm-match-title">{match.title}</span>
                          </div>
                          <div className="sm-match-actions">
                            <button className="btn btn-xs btn-ghost" onClick={() => setEditingMatch(match)}>تعديل</button>
                            {canDelete && (
                              <button className="btn btn-xs btn-danger" onClick={() => handleDeleteMatch(match.id)}>حذف</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {addingMatchTo === show.id ? (
                    <MatchForm
                      showId={show.id}
                      initial={{ order: showMatches.length + 1 }}
                      onSave={handleAddMatch}
                      onCancel={() => setAddingMatchTo(null)}
                    />
                  ) : (
                    <button className="btn btn-ghost sm-add-match" onClick={() => setAddingMatchTo(show.id)}>
                      + إضافة نزال
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
