import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { getAllPolls, createPollWithId, deletePoll, newPollId, uploadPollImage, subscribeToPollResults } from '../../services/polls.service';
import type { Poll, PollResults } from '../../services/polls.service';
import './PollsPage.css';

interface OptionDraft {
  name: string;
  imageUrl: string;   // already resolved URL (preset or after upload)
  file?: File;        // pending file to upload
  preview?: string;   // blob preview URL
}

const WM_PRESETS: OptionDraft[] = [
  { name: 'WrestleMania 26', imageUrl: '/WrestleManiaStages/WrestleMania26.jpg' },
  { name: 'WrestleMania 27', imageUrl: '/WrestleManiaStages/WrestleMania27.jpg' },
  { name: 'WrestleMania 30', imageUrl: '/WrestleManiaStages/WrestleMania30.jpg' },
  { name: 'WrestleMania 31', imageUrl: '/WrestleManiaStages/WrestleMania31.jpg' },
  { name: 'WrestleMania 33', imageUrl: '/WrestleManiaStages/WrestleMania33.jpg' },
  { name: 'WrestleMania 34', imageUrl: '/WrestleManiaStages/WrestleMania34.jpg' },
  { name: 'WrestleMania 37', imageUrl: '/WrestleManiaStages/WrestleMania37.jpg' },
  { name: 'WrestleMania 38', imageUrl: '/WrestleManiaStages/WrestleMania38.jpg' },
  { name: 'WrestleMania 39', imageUrl: '/WrestleManiaStages/WrestleMania39.jpg' },
  { name: 'WrestleMania 41', imageUrl: '/WrestleManiaStages/WrestleMania41.jpg' },
];

function getVoteUrl(pollId: string) {
  return `${window.location.origin}/vote/${pollId}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PollsPage() {
  const { firebaseUser } = useAuthStore();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollResults, setPollResults] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(false);
  const [resultsModal, setResultsModal] = useState<{ poll: Poll; results: PollResults } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>([
    { name: '', imageUrl: '' },
    { name: '', imageUrl: '' },
  ]);
  const [maxChoices, setMaxChoices] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [saveError, setSaveError] = useState('');
  const [usePreset, setUsePreset] = useState(false);

  // One ref per option for the hidden file input
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resultsUnsubRef = useRef<(() => void) | null>(null);

  const load = async () => {
    setLoading(true);
    const all = await getAllPolls();
    all.sort((a, b) => b.createdAt - a.createdAt);
    setPolls(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Subscribe to vote counts for all polls
  useEffect(() => {
    if (!polls.length) return;
    const unsubs = polls.map(poll =>
      subscribeToPollResults(poll.id, (results: PollResults) => {
        const total = Object.values(results.counts ?? {}).reduce((a, b) => a + b, 0);
        setPollResults(prev => ({ ...prev, [poll.id]: total }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [polls]);

  const openModal = () => {
    setTitle('');
    setDescription('');
    setExpiryDate('');
    setOptions([{ name: '', imageUrl: '' }, { name: '', imageUrl: '' }]);
    setMaxChoices(1);
    setUsePreset(false);
    setSaveProgress('');
    setSaveError('');
    setShowModal(true);
  };

  const handlePreset = () => {
    setTitle('أفضل ستيج رسلمينيا في التاريخ');
    setDescription('صوّت للستيج الأفضل في رأيك من تاريخ رسلمينيا');
    setOptions(WM_PRESETS.map(o => ({ ...o })));
    setUsePreset(true);
  };

  const addOption = () => setOptions(prev => [...prev, { name: '', imageUrl: '' }]);

  const removeOption = (i: number) => {
    setOptions(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      // revoke blob if exists
      if (prev[i].preview) URL.revokeObjectURL(prev[i].preview!);
      return next;
    });
  };

  const updateName = (i: number, val: string) =>
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, name: val } : o));

  const handleFileChange = (i: number, file: File | null) => {
    if (!file) return;
    setOptions(prev => {
      // revoke old preview
      if (prev[i].preview) URL.revokeObjectURL(prev[i].preview!);
      return prev.map((o, idx) =>
        idx === i
          ? { ...o, file, preview: URL.createObjectURL(file), imageUrl: '' }
          : o
      );
    });
  };

  const clearImage = (i: number) => {
    setOptions(prev => {
      if (prev[i].preview) URL.revokeObjectURL(prev[i].preview!);
      return prev.map((o, idx) => idx === i ? { ...o, file: undefined, preview: undefined, imageUrl: '' } : o);
    });
    if (fileInputRefs.current[i]) fileInputRefs.current[i]!.value = '';
  };

  const isOptionValid = (o: OptionDraft) => !!o.name.trim();

  const handleCreate = async () => {
    if (!title.trim() || !expiryDate || !firebaseUser) return;
    const validOptions = options.filter(isOptionValid);
    if (validOptions.length < 2) return;

    setSaving(true);
    setSaveError('');
    try {
      const pollId = newPollId();
      const optionsMap: Record<string, { name: string; imageUrl: string }> = {};

      // Upload files first
      const filesToUpload = validOptions.filter(o => !!o.file);
      for (let i = 0; i < validOptions.length; i++) {
        const o = validOptions[i];
        const optId = `opt${i + 1}`;
        if (o.file) {
          setSaveProgress(`جاري رفع الصور... (${filesToUpload.indexOf(o) + 1}/${filesToUpload.length})`);
          const url = await uploadPollImage(o.file);
          optionsMap[optId] = { name: o.name.trim(), imageUrl: url };
        } else {
          optionsMap[optId] = { name: o.name.trim(), imageUrl: o.imageUrl.trim() || '' };
        }
      }

      setSaveProgress('جاري إنشاء التصويت...');
      await createPollWithId(pollId, {
        title: title.trim(),
        description: description.trim(),
        createdBy: firebaseUser.uid,
        createdAt: Date.now(),
        expiresAt: new Date(expiryDate).getTime(),
        options: optionsMap,
        ...(maxChoices > 1 ? { maxChoices } : {}),
      });

      setShowModal(false);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Hide internal Firebase error details from the UI
      const isFirebaseErr = msg.includes('Firebase') || msg.includes('PERMISSION') || msg.includes('firestore');
      setSaveError(isFirebaseErr ? 'حدث خطأ أثناء الحفظ. تحقق من الاتصال وحاول مجدداً.' : msg);
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  const handleDelete = async (pollId: string) => {
    if (!confirm('حذف هذا التصويت وجميع بياناته؟')) return;
    setPolls(prev => prev.filter(p => p.id !== pollId));
    closeResults();
    await deletePoll(pollId);
  };

  const copyLink = (pollId: string) => {
    navigator.clipboard.writeText(getVoteUrl(pollId));
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const isExpired = (poll: Poll) => Date.now() > poll.expiresAt;
  const canSubmit = !saving && title.trim() && expiryDate && options.filter(isOptionValid).length >= 2;

  const openResults = (poll: Poll) => {
    if (resultsUnsubRef.current) { resultsUnsubRef.current(); resultsUnsubRef.current = null; }
    resultsUnsubRef.current = subscribeToPollResults(poll.id, results => {
      setResultsModal({ poll, results });
    });
  };

  const closeResults = () => {
    if (resultsUnsubRef.current) { resultsUnsubRef.current(); resultsUnsubRef.current = null; }
    setResultsModal(null);
  };

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>التصويتات</h1>
          <p>{polls.filter(p => !isExpired(p)).length} نشط</p>
        </div>
        <button className="btn" onClick={openModal}>+ تصويت جديد</button>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>جاري التحميل...</div>
        ) : polls.length === 0 ? (
          <div className="polls-empty">
            <div className="polls-empty-icon">🗳</div>
            <div>لا توجد تصويتات بعد. أنشئ أول تصويت!</div>
          </div>
        ) : (
          <div className="polls-list">
            {polls.map(poll => (
              <div key={poll.id} className="poll-row">
                <div className="poll-row-body">
                  <div className="poll-row-title">{poll.title}</div>
                  <div className="poll-row-meta">
                    <span className={`badge ${isExpired(poll) ? 'badge-gray' : 'badge-green'}`}>
                      {isExpired(poll) ? 'منتهي' : 'نشط'}
                    </span>
                    <span>{Object.keys(poll.options).length} خيار</span>
                    <span style={{ color: 'var(--gold)', fontFamily: 'Oswald', fontSize: 13 }}>
                      {pollResults[poll.id] ?? 0} صوت
                    </span>
                    <span>ينتهي {formatDate(poll.expiresAt)}</span>
                  </div>
                  <button className="poll-row-link" onClick={() => copyLink(poll.id)}>
                    🔗 {getVoteUrl(poll.id)}
                  </button>
                </div>
                <div className="poll-row-actions">
                  <button className="btn btn-xs" onClick={() => openResults(poll)}>
                    النتائج
                  </button>
                  <button className="btn btn-xs btn-ghost" onClick={() => window.open(`/vote/${poll.id}`, '_blank')}>
                    عرض
                  </button>
                  <button className="btn btn-xs btn-danger" onClick={() => handleDelete(poll.id)}>
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showModal && (
        <div className="poll-modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="poll-modal" onClick={e => e.stopPropagation()}>
            <div className="poll-modal-header">
              <h2>تصويت جديد</h2>
              <button className="poll-modal-close" onClick={() => !saving && setShowModal(false)}>✕</button>
            </div>

            <div className="poll-modal-body">
              {/* Preset */}
              <button
                className="poll-add-option"
                style={{ borderColor: usePreset ? 'var(--gold)' : undefined, color: usePreset ? 'var(--gold)' : undefined }}
                onClick={handlePreset}
                disabled={saving}
              >
                ⚡ تعبئة تلقائية — ستيجات رسلمينيا
              </button>

              <div className="poll-field">
                <label>عنوان التصويت</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: أفضل ستيج رسلمينيا" disabled={saving} />
              </div>

              <div className="poll-field">
                <label>وصف (اختياري)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف مختصر يظهر للمصوتين" disabled={saving} />
              </div>

              <div className="poll-field">
                <label>تاريخ انتهاء الصلاحية</label>
                <input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  disabled={saving}
                />
              </div>

              <div className="poll-field">
                <label>عدد الاختيارات المسموحة لكل مصوّت</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    min={1}
                    max={options.filter(isOptionValid).length || 20}
                    value={maxChoices}
                    onChange={e => setMaxChoices(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={saving}
                    style={{ width: 80 }}
                  />
                  <span style={{ fontSize: 12, color: maxChoices > 1 ? 'var(--gold)' : 'var(--muted)' }}>
                    {maxChoices === 1 ? 'اختيار واحد فقط' : `كل شخص يختار ${maxChoices} خيارات`}
                  </span>
                </div>
              </div>

              {/* Options */}
              <div>
                <div className="poll-options-label">الخيارات (الصورة اختيارية)</div>
                {options.map((opt, i) => (
                  <div key={i} className="poll-option-row">
                    <div className="poll-option-num">{i + 1}</div>
                    <div className="poll-option-fields">
                      <input
                        value={opt.name}
                        onChange={e => updateName(i, e.target.value)}
                        placeholder="اسم الخيار"
                        disabled={saving}
                      />

                      {/* Image area */}
                      {opt.preview || opt.imageUrl ? (
                        <div className="poll-option-img-preview">
                          <img src={opt.preview || opt.imageUrl} alt="" />
                          {!saving && (
                            <button className="poll-option-img-clear" onClick={() => clearImage(i)}>✕</button>
                          )}
                        </div>
                      ) : (
                        <button
                          className="poll-option-upload-btn"
                          onClick={() => fileInputRefs.current[i]?.click()}
                          disabled={saving}
                        >
                          📎 رفع صورة
                        </button>
                      )}

                      {/* Hidden file input */}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={el => { fileInputRefs.current[i] = el; }}
                        onChange={e => handleFileChange(i, e.target.files?.[0] ?? null)}
                      />
                    </div>
                    {options.length > 2 && !saving && (
                      <button className="poll-option-remove" onClick={() => removeOption(i)}>✕</button>
                    )}
                  </div>
                ))}
                <button className="poll-add-option" onClick={addOption} disabled={saving}>+ إضافة خيار</button>
              </div>

              {saveProgress && (
                <div style={{ fontSize: 12, color: 'var(--gold)', textAlign: 'center', letterSpacing: 1 }}>
                  {saveProgress}
                </div>
              )}
              {saveError && (
                <div style={{ fontSize: 12, color: '#ff6666', background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.4)', padding: '8px 12px', direction: 'ltr', wordBreak: 'break-all' }}>
                  {saveError}
                </div>
              )}
            </div>

            <div className="poll-modal-footer">
              <button className="btn btn-ghost" onClick={() => !saving && setShowModal(false)} disabled={saving}>إلغاء</button>
              <button className="btn" onClick={handleCreate} disabled={!canSubmit}>
                {saving ? '...' : 'إنشاء وإطلاق'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="link-copied-toast">تم نسخ الرابط ✓</div>}

      {/* Results Modal */}
      {resultsModal && (() => {
        const { poll, results } = resultsModal;
        const counts = results.counts ?? {};
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const sorted = Object.entries(poll.options).sort((a, b) =>
          (counts[b[0]] ?? 0) - (counts[a[0]] ?? 0)
        );
        return (
          <div className="poll-modal-overlay" onClick={closeResults}>
            <div className="poll-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
              <div className="poll-modal-header">
                <h2>{poll.title}</h2>
                <button className="poll-modal-close" onClick={closeResults}>✕</button>
              </div>
              <div className="poll-modal-body">
                <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, color: 'var(--text2)' }}>
                  إجمالي الأصوات:
                  <span style={{ fontFamily: 'Oswald', fontSize: 22, color: 'var(--gold)', margin: '0 6px' }}>{total}</span>
                  صوت
                </div>
                {sorted.map(([optId, opt], idx) => {
                  const count = counts[optId] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const isLeading = idx === 0 && total > 0;
                  return (
                    <div key={optId} className="results-row">
                      <img src={opt.imageUrl} alt={opt.name} className="results-img" />
                      <div className="results-body">
                        <div className="results-name">{opt.name}</div>
                        <div className="results-bar-wrap">
                          <div className="results-bar-track">
                            <div
                              className="results-bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: isLeading
                                  ? 'linear-gradient(90deg, var(--gold), var(--gold2))'
                                  : 'linear-gradient(90deg, var(--red), var(--gold))',
                              }}
                            />
                          </div>
                          <div className="results-bar-meta">
                            <span style={{ fontFamily: 'Oswald', fontSize: 18, color: isLeading ? 'var(--gold)' : 'var(--text2)' }}>
                              {pct}%
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{count} صوت</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
