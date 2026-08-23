import { useEffect, useState, useCallback } from 'react';
import {
  getAllAuditions,
  deleteAudition,
  updateAuditionStatus,
  setAuditionOpen,
  getAuditionOpen,
} from '../../services/auditions.service';
import type { Audition } from '../../services/auditions.service';
import { Spinner } from '../../components/ui/Spinner';
import './AuditionsAdminPage.css';

const PLATFORM_LABEL: Record<Audition['platform'], string> = {
  x:         '𝕏 (X / تويتر)',
  tiktok:    'TikTok',
  instagram: 'Instagram',
  youtube:   'YouTube',
};

const STATUS_LABEL: Record<Audition['status'], string> = {
  pending:  'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
};

const STATUS_COLOR: Record<Audition['status'], string> = {
  pending:  'var(--gold)',
  accepted: 'var(--green2)',
  rejected: 'var(--red)',
};

export function AuditionsAdminPage() {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<Audition['status'] | 'all'>('all');
  const [open,      setOpen]      = useState<boolean | null>(null);
  const [toggling,  setToggling]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, isOpen] = await Promise.all([
      getAllAuditions(),
      getAuditionOpen(),
    ]);
    setAuditions(data);
    setOpen(isOpen);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Toggle open/closed ── */
  const handleToggle = async () => {
    const next = !open;
    setToggling(true);
    await setAuditionOpen(next);
    setOpen(next);
    setToggling(false);
  };

  /* ── Status change ── */
  const handleStatus = async (id: string, status: Audition['status']) => {
    await updateAuditionStatus(id, status);
    setAuditions(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا التقديم نهائياً؟')) return;
    await deleteAudition(id);
    setAuditions(prev => prev.filter(a => a.id !== id));
  };


  const filtered = filter === 'all' ? auditions : auditions.filter(a => a.status === filter);
  const counts = {
    all:      auditions.length,
    pending:  auditions.filter(a => a.status === 'pending').length,
    accepted: auditions.filter(a => a.status === 'accepted').length,
    rejected: auditions.filter(a => a.status === 'rejected').length,
  };

  return (
    <>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Oswald, sans-serif', fontSize: 22, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--text)', marginBottom: 4,
          }}>
            الأودشن
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{auditions.length} تقديم إجمالاً</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {open !== null && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              style={{
                fontSize: 12, padding: '8px 16px',
                background: open ? 'rgba(58,158,101,0.1)' : 'rgba(139,0,0,0.1)',
                border: `1px solid ${open ? 'rgba(58,158,101,0.4)' : 'rgba(139,0,0,0.4)'}`,
                color: open ? 'var(--green2)' : 'var(--red)',
                fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
                transition: 'all 0.15s', opacity: toggling ? 0.5 : 1,
              }}
            >
              {open ? '● الأودشن مفتوح — إغلاق' : '○ الأودشن مغلق — فتح'}
            </button>
          )}
          <a
            href="/audition"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12, padding: '8px 14px',
              background: 'none', border: '1px solid #2a2a2a', color: 'var(--muted)',
              textDecoration: 'none', fontFamily: 'Cairo, sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; (e.target as HTMLElement).style.borderColor = '#444'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--muted)'; (e.target as HTMLElement).style.borderColor = '#2a2a2a'; }}
          >
            ↗ صفحة الأودشن
          </a>
          <button className="btn btn-ghost" onClick={load} style={{ fontSize: 12 }}>↻ تحديث</button>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e1e1e', marginBottom: 24 }}>
        {(['all', 'pending', 'accepted', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              background: 'none', border: 'none', padding: '10px 18px',
              fontFamily: 'Cairo, sans-serif', fontSize: 13, cursor: 'pointer',
              color: filter === s ? 'var(--gold)' : 'var(--muted)',
              borderBottom: filter === s ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {s === 'all' ? 'الكل' : STATUS_LABEL[s]}
            <span style={{
              marginRight: 6, fontSize: 11,
              background: filter === s ? 'rgba(201,168,76,0.15)' : '#1a1a1a',
              color: filter === s ? 'var(--gold)' : '#555',
              padding: '1px 6px', borderRadius: 2,
            }}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Submissions List ── */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
          لا توجد تقديمات
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(aud => (
            <div
              key={aud.id}
              style={{
                background: '#0c0c0c', border: '1px solid #1e1e1e',
                borderRight: `3px solid ${STATUS_COLOR[aud.status]}`,
                padding: '18px 20px',
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: 16, alignItems: 'start',
              }}
            >
              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                    {aud.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{aud.age} سنة</span>
                  <span style={{ fontSize: 12, color: 'var(--gold)' }}>
                    {PLATFORM_LABEL[aud.platform]}
                  </span>
                  <span style={{ fontSize: 12, color: '#aaa', fontFamily: 'Cairo, sans-serif' }}>
                    {aud.handle}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 10px',
                    border: `1px solid ${STATUS_COLOR[aud.status]}40`,
                    color: STATUS_COLOR[aud.status],
                    background: `${STATUS_COLOR[aud.status]}10`,
                    fontFamily: 'Cairo, sans-serif',
                  }}>
                    {STATUS_LABEL[aud.status]}
                  </span>
                </div>

                {/* Video link */}
                <a
                  href={aud.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13, color: '#c9a84c',
                    padding: '8px 12px',
                    background: 'rgba(201,168,76,0.05)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    textDecoration: 'none',
                    fontFamily: 'Cairo, sans-serif',
                    wordBreak: 'break-all',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.05)')}
                >
                  🎬 <span style={{ fontSize: 12 }}>{aud.videoLink}</span>
                </a>

                <div style={{ fontSize: 11, color: '#444' }}>
                  {new Date(aud.submittedAt).toLocaleDateString('ar-SA', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {aud.status !== 'accepted' && (
                  <button
                    className="btn"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => handleStatus(aud.id, 'accepted')}
                  >
                    ✓ قبول
                  </button>
                )}
                {aud.status !== 'rejected' && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '7px 14px', borderColor: 'rgba(139,0,0,0.4)', color: 'var(--red)' }}
                    onClick={() => handleStatus(aud.id, 'rejected')}
                  >
                    ✕ رفض
                  </button>
                )}
                {aud.status !== 'pending' && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => handleStatus(aud.id, 'pending')}
                  >
                    ↩ إعادة
                  </button>
                )}
                <button
                  style={{
                    background: 'none', border: '1px solid #1e1e1e', color: '#444',
                    fontSize: 11, padding: '6px 14px', cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif', marginTop: 4,
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.color = 'var(--red)';
                    (e.target as HTMLElement).style.borderColor = 'rgba(139,0,0,0.4)';
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.color = '#444';
                    (e.target as HTMLElement).style.borderColor = '#1e1e1e';
                  }}
                  onClick={() => handleDelete(aud.id)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
