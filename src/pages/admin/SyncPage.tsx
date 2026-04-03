import { useState, useEffect } from 'react';
import { migratePublicProfiles } from '../../services/users.service';
import { fetchPublicWorks, addPublicWork, removePublicWork } from '../../services/works.service';
import type { PublicWork } from '../../services/works.service';

export function SyncPage() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const [works, setWorks] = useState<PublicWork[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addErr, setAddErr] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchPublicWorks().then(setWorks);
  }, []);

  const handleSync = async () => {
    setSyncStatus('loading');
    try {
      await migratePublicProfiles();
      setSyncStatus('done');
    } catch {
      setSyncStatus('error');
    }
  };

  const handleAdd = async () => {
    setAddErr('');
    if (!newTitle.trim()) { setAddErr('أدخل عنوان المقطع'); return; }
    if (!newUrl.trim()) { setAddErr('أدخل رابط يوتيوب'); return; }
    setAddLoading(true);
    try {
      await addPublicWork(newTitle.trim(), newUrl.trim());
      setNewTitle('');
      setNewUrl('');
      const updated = await fetchPublicWorks();
      setWorks(updated);
    } catch (e: unknown) {
      setAddErr((e as Error).message || 'حدث خطأ');
    }
    setAddLoading(false);
  };

  const handleRemove = async (id: string) => {
    await removePublicWork(id);
    setWorks(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>

      {/* مزامنة الأعضاء */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>مزامنة بيانات الأعضاء</div>
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
          يزامن بيانات الأعضاء (الاسم، الدور، الصورة) مع صفحة الترحيب.
          شغّله عند إضافة أعضاء جدد أو تعديل بياناتهم.
        </p>
        <button className="btn" onClick={handleSync} disabled={syncStatus === 'loading'} style={{ minWidth: 140 }}>
          {syncStatus === 'loading' ? <div className="spinner" /> : '🔄 مزامنة الآن'}
        </button>
        {syncStatus === 'done' && <div style={{ marginTop: 12, color: 'var(--green)', fontSize: 13 }}>✓ تمت المزامنة بنجاح</div>}
        {syncStatus === 'error' && <div style={{ marginTop: 12, color: 'var(--red)', fontSize: 13 }}>✗ حدث خطأ أثناء المزامنة</div>}
      </div>

      {/* أخر الأعمال */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>أخر الأعمال — صفحة الترحيب</div>

        {/* قائمة الأعمال الحالية */}
        {works.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {works.map(w => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>{w.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</div>
                </div>
                <button
                  className="btn btn-danger"
                  style={{ padding: '5px 12px', fontSize: 12, flexShrink: 0 }}
                  onClick={() => handleRemove(w.id)}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

        {/* إضافة عمل جديد */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>عنوان المقطع</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="مثال: ريفولتا — مصارعة حرة"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>رابط يوتيوب</label>
            <input
              type="text"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          {addErr && <div style={{ color: 'var(--red)', fontSize: 12 }}>{addErr}</div>}
          <button className="btn" onClick={handleAdd} disabled={addLoading} style={{ alignSelf: 'flex-start', minWidth: 120 }}>
            {addLoading ? <div className="spinner" /> : '+ إضافة'}
          </button>
        </div>
      </div>

    </div>
  );
}
