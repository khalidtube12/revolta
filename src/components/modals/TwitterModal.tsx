import { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface TwitterModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (twitterUrl: string) => void;
  onSkip: () => void;
}

export function TwitterModal({ open, onClose, onSubmit, onSkip }: TwitterModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setUrl(''); setError(''); }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (trimmed && !trimmed.startsWith('http')) { setError('الرابط غير صحيح'); return; }
    onSubmit(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="رابط التغريدة"
      maxWidth={420}
      footer={
        <>
          <button className="btn" onClick={handleSubmit}>حفظ</button>
          <button className="btn btn-ghost" onClick={onSkip}>تخطي</button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        أضف رابط التغريدة المنشورة لتسهيل متابعة المشاهدات (اختياري)
      </p>
      <div className="form-group">
        <label>رابط التغريدة</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://x.com/..."
          dir="ltr"
          autoFocus
        />
      </div>
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
