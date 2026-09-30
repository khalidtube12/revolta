import { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface TwitterModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (tweetCount: number, twitterUrl: string) => void;
  minTweets?: number;
}

export function TwitterModal({ open, onClose, onSubmit, minTweets = 3 }: TwitterModalProps) {
  const [count, setCount] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setCount(''); setUrl(''); setError(''); }
  }, [open]);

  const handleSubmit = () => {
    const n = parseInt(count, 10);
    if (!count.trim() || isNaN(n) || n < minTweets) {
      setError(minTweets > 1 ? `لازم تدخل عدد التغريدات (${minTweets} على الأقل)` : 'لازم تدخل عدد التغريدات');
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
        أدخل عدد التغريدات المنشورة — كل تغريدة تساوي 50 نقطة{minTweets > 1 ? ` (بحد أدنى ${minTweets} تغريدات)` : ''}.
        النقاط تُحتسب فقط بعد مراجعة الأدمن أو مسؤول صنّاع المحتوى.
      </p>
      <div className="form-group">
        <label>عدد التغريدات</label>
        <input
          type="number"
          min={minTweets}
          value={count}
          onChange={e => setCount(e.target.value)}
          placeholder={String(minTweets)}
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
