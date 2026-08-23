import { useState, useEffect } from 'react';
import type { User } from '../../types';

interface VideoCompleteModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (driveLink: string, producerId: string) => void;
  participants: User[];
  taskType?: 'video' | 'podcast';
}

export function VideoCompleteModal({ open, onClose, onSubmit, participants, taskType = 'video' }: VideoCompleteModalProps) {
  const [driveLink, setDriveLink] = useState('');
  const [producerId, setProducerId] = useState('');

  useEffect(() => {
    if (open) {
      setDriveLink('');
      setProducerId(participants.length === 1 ? (participants[0]?.id ?? '') : '');
    }
  }, [open, participants]);

  if (!open) return null;

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-title">{taskType === 'podcast' ? '🎙 إكمال البودكاست' : '🎬 إكمال المقطع'}</div>

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

        <div className="form-group">
          <label>
            المنتج <span style={{ color: 'var(--red)', fontSize: 13 }}>*</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginRight: 6 }}>
              (يأخذ 200 نقطة إضافية)
            </span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {participants.map(u => {
              if (!u) return null;
              const selected = producerId === u.id;
              return (
                <label
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', cursor: 'pointer',
                    background: selected ? 'rgba(201,168,76,0.12)' : 'var(--dark)',
                    border: `1px solid ${selected ? 'rgba(201,168,76,0.5)' : 'var(--border)'}`,
                    transition: 'all 0.12s',
                  }}
                >
                  <input
                    type="radio"
                    name="producer"
                    value={u.id}
                    checked={selected}
                    onChange={() => setProducerId(u.id)}
                    style={{ accentColor: 'var(--gold)', flexShrink: 0 }}
                  />
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: u.color || 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {u.photoURL
                      ? <img src={u.photoURL} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                      : u.name.charAt(0)
                    }
                  </div>
                  <span style={{ fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>{u.name}</span>
                  {selected && (
                    <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'Oswald, sans-serif', marginRight: 'auto' }}>
                      +200 ⭐
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={() => onSubmit(driveLink.trim(), producerId)} disabled={!producerId}>
            إكمال المقطع
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
