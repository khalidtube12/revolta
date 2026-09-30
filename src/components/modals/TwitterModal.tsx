import { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface TwitterModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (tweetCount: number, twitterUrl: string) => void;
}

const MIN_TWEETS = 3;

export function TwitterModal({ open, onClose, onSubmit }: TwitterModalProps) {
  const [count, setCount] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setCount(''); setUrl(''); setError(''); }
  }, [open]);

  const handleSubmit = () => {
    const n = parseInt(count, 10);
    if (!count.trim() || isNaN(n) || n < MIN_TWEETS) {
      setError(`لازم تدخل عدد التغريدات (${MIN_TWEETS} على الأقل)`);
      return;
    }
    const trimmedUrl = url.trim();
    if (trimmedUrl && !trimmedUrl.startsWith('http')) { setError('الرابط غير صحيح'); return; }
    onSubmit(n, trimmedUrl);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إكمال مهمة محتوى X"
      maxWidth={420}
      footer={<button className="btn" onClick={handleSubmit}>حفظ</button>}
    >
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        أدخل عدد التغريدات المنشورة — كل تغريدة تساوي 50 نقطة (بحد أدنى {MIN_TWEETS} تغريدات).
        النقاط تُحتسب فقط بعد مراجعة الأدمن أو مسؤول صنّاع المحتوى ونشر المهمة.
      </p>
      <div className="form-group">
        <label>عدد التغريدات</label>
        <input
          type="number"
          min={MIN_TWEETS}
          value={count}
          onChange={e => setCount(e.target.value)}
          placeholder={String(MIN_TWEETS)}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label>رابط التغريدة (اختياري)</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://x.com/..."
          dir="ltr"
        />
      </div>
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
