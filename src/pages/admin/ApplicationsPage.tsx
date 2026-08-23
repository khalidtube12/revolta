import { useEffect, useState, useCallback } from 'react';
import { getAllApplications, deleteApplication, updateApplicationStatus } from '../../services/applications.service';
import type { Application } from '../../services/applications.service';
import { dbGet, dbUpdate, dbSet } from '../../services/db.service';
import { Spinner } from '../../components/ui/Spinner';

const STATUS_LABEL: Record<Application['status'], string> = {
  pending:  'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
};
const STATUS_COLOR: Record<Application['status'], string> = {
  pending:  'var(--gold)',
  accepted: 'var(--green2)',
  rejected: 'var(--red)',
};

export function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Application['status'] | 'all'>('all');
  const [applyOpen, setApplyOpen] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, open] = await Promise.all([
      getAllApplications(),
      dbGet<boolean>('meta/applyOpen'),
    ]);
    setApps(data);
    setApplyOpen(open ?? true);
    setLoading(false);
  }, []);

  const handleToggle = async () => {
    const next = !applyOpen;
    setToggling(true);
    await dbUpdate('meta', { applyOpen: next });
    setApplyOpen(next);
    setToggling(false);
  };

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: string, status: Application['status']) => {
    await updateApplicationStatus(id, status);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الطلب نهائياً؟')) return;
    await deleteApplication(id);
    setApps(prev => prev.filter(a => a.id !== id));
  };

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);
  const counts = {
    all: apps.length,
    pending: apps.filter(a => a.status === 'pending').length,
    accepted: apps.filter(a => a.status === 'accepted').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 4 }}>
            طلبات الانضمام
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{apps.length} طلب إجمالاً</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {applyOpen !== null && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              style={{
                fontSize: 12, padding: '8px 16px',
                background: applyOpen ? 'rgba(58,158,101,0.1)' : 'rgba(139,0,0,0.1)',
                border: `1px solid ${applyOpen ? 'rgba(58,158,101,0.4)' : 'rgba(139,0,0,0.4)'}`,
                color: applyOpen ? 'var(--green2)' : 'var(--red)',
                fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
                transition: 'all 0.15s', opacity: toggling ? 0.5 : 1,
              }}
            >
              {applyOpen ? '● انضم إلينا ظاهرة — إخفاء' : '○ انضم إلينا مخفية — إظهار'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={load} style={{ fontSize: 12 }}>↻ تحديث</button>
          {/* TEMP: seed fake profiles — remove after use */}
          <button className="btn btn-ghost" style={{ fontSize: 11, color: '#555' }} onClick={async () => {
            await dbSet('publicProfiles/fake_fleck_wrestles', { name: 'Fleck Wrestles', jobRole: 'صانع محتوى', twitterHandle: 'FleckXSX', photoURL: 'https://res.cloudinary.com/dyygpcvjf/image/upload/v1775826744/u8jph9yfgqx5nf81nar1.jpg', isLeader: false });
            alert('تم إضافة Fleck ✓');
          }}>seed Fleck</button>
          <button className="btn btn-ghost" style={{ fontSize: 11, color: '#555' }} onClick={async () => {
            await dbSet('publicProfiles/fake_hunter4ever', { name: 'عبدالرحمن/Hunter4Ever', jobRole: 'صانع محتوى', twitterHandle: 'abo_dahim9', photoURL: 'https://res.cloudinary.com/dyygpcvjf/image/upload/v1775826963/q99ypc5whjqz7ryvifdr.jpg', isLeader: false });
            alert('تم إضافة Hunter4Ever ✓');
          }}>seed Hunter</button>
        </div>
      </div>

      {/* Filter tabs */}
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
            }}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
          لا توجد طلبات
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(app => (
            <div key={app.id} style={{
              background: '#0c0c0c', border: '1px solid #1e1e1e',
              borderRight: `3px solid ${STATUS_COLOR[app.status]}`,
              padding: '18px 20px', display: 'grid',
              gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start',
            }}>
              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                    {app.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--gold)' }}>𝕏 @{app.twitterHandle}</span>
                  {app.age && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{app.age} سنة</span>}
                  <span style={{
                    fontSize: 11, padding: '2px 10px',
                    border: '1px solid #2a2a2a', color: 'var(--muted)',
                    background: '#111', fontFamily: 'Cairo, sans-serif',
                  }}>{app.contentType}</span>
                  <span style={{
                    fontSize: 11, padding: '2px 10px',
                    border: `1px solid ${STATUS_COLOR[app.status]}40`,
                    color: STATUS_COLOR[app.status],
                    background: `${STATUS_COLOR[app.status]}10`,
                    fontFamily: 'Cairo, sans-serif',
                  }}>{STATUS_LABEL[app.status]}</span>
                </div>

                <div style={{
                  fontSize: 13, color: '#aaa', lineHeight: 1.7,
                  padding: '10px 12px', background: '#090909',
                  borderRight: '2px solid #2a2a2a',
                  fontFamily: 'Cairo, sans-serif',
                }}>
                  {app.reason}
                </div>

                <div style={{ fontSize: 11, color: '#444' }}>
                  {new Date(app.submittedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {app.status !== 'accepted' && (
                  <button className="btn" style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => handleStatus(app.id, 'accepted')}>
                    ✓ قبول
                  </button>
                )}
                {app.status !== 'rejected' && (
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px', borderColor: 'rgba(139,0,0,0.4)', color: 'var(--red)' }}
                    onClick={() => handleStatus(app.id, 'rejected')}>
                    ✕ رفض
                  </button>
                )}
                {app.status === 'pending' ? null : (
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => handleStatus(app.id, 'pending')}>
                    ↩ إعادة
                  </button>
                )}
                <button style={{
                  background: 'none', border: '1px solid #1e1e1e', color: '#444',
                  fontSize: 11, padding: '6px 14px', cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif', marginTop: 4,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--red)'; (e.target as HTMLElement).style.borderColor = 'rgba(139,0,0,0.4)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.color = '#444'; (e.target as HTMLElement).style.borderColor = '#1e1e1e'; }}
                  onClick={() => handleDelete(app.id)}>
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
