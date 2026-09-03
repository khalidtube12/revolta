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
            <select
              value={producerId}
              onChange={e => setProducerId(e.target.value)}
              style={{
                width: '100%', background: 'var(--dark)', border: '1px solid var(--border)',
                color: producerId ? 'var(--text)' : 'var(--muted)',
                padding: '10px 12px', fontFamily: 'Cairo, sans-serif', fontSize: 14, cursor: 'pointer',
              }}
            >
              <option value="">— اختر الممنتج —</option>
              {members.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {producerId && (
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 5 }}>
                ✓ {members.find(u => u.id === producerId)?.name} · +{producerBonus} نقطة
              </div>
            )}
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
