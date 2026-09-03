import { useState, useEffect } from 'react';
import type { User } from '../../types';

interface VideoCompleteModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (driveLink: string, producerId: string) => void;
  members: User[];
  taskType?: 'video' | 'podcast' | 'short' | 'event_coverage';
}

export function VideoCompleteModal({ open, onClose, onSubmit, members, taskType = 'video' }: VideoCompleteModalProps) {
  const [driveLink, setDriveLink] = useState('');
  const [producerId, setProducerId] = useState('');

  useEffect(() => {
    if (open) {
      setDriveLink('');
      setProducerId('');
    }
  }, [open]);

  if (!open) return null;

  const showProducer = taskType === 'short' || taskType === 'video';
  const producerBonus = taskType === 'short' ? 400 : 500;

  const titleMap: Record<string, string> = {
    podcast: '🎙 إكمال البودكاست',
    short: '📱 إكمال الشورت',
    event_coverage: '📸 إكمال تغطية الحدث',
    video: '🎬 إكمال المقطع',
  };

  const btnLabel: Record<string, string> = {
    podcast: 'إكمال البودكاست',
    short: 'إكمال الشورت',
    event_coverage: 'إكمال التغطية',
    video: 'إكمال المقطع',
  };

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-title">{titleMap[taskType] ?? '🎬 إكمال المقطع'}</div>

        <div className="form-group">
          <label>رابط Drive (اختياري)</label>
          <input
            type="url"
            value={driveLink}
            onChange={e => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            dir="ltr"
          />
        </div>

        {showProducer && (
          <div className="form-group">
            <label>
              الممنتج
              <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11, marginRight: 6 }}>
                (اختياري — يأخذ {producerBonus} نقطة)
              </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 260, overflowY: 'auto' }}>
              {members.map(u => {
                const selected = producerId === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setProducerId(prev => prev === u.id ? '' : u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', cursor: 'pointer',
                      background: selected ? 'rgba(201,168,76,0.12)' : 'var(--dark)',
                      border: `1px solid ${selected ? 'rgba(201,168,76,0.5)' : 'var(--border)'}`,
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${selected ? 'var(--gold)' : 'var(--border2)'}`,
                      background: selected ? 'var(--gold)' : 'transparent',
                      transition: 'all 0.12s',
                    }} />
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: u.color || 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden',
                    }}>
                      {u.photoURL
                        ? <img src={u.photoURL} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                        : u.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: 14, fontFamily: 'Cairo, sans-serif', color: 'var(--text)', letterSpacing: 'normal', textTransform: 'none', fontWeight: 400 }}>{u.name}</span>
                    {selected && (
                      <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'Oswald, sans-serif', marginRight: 'auto' }}>
                        +{producerBonus} ⭐
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={() => onSubmit(driveLink.trim(), producerId)}>
            {btnLabel[taskType] ?? 'إكمال المقطع'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
