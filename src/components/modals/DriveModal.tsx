import { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface DriveModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (link: string, title: string) => void;
  taskTitle?: string;
}

export function DriveModal({ open, onClose, onSubmit, taskTitle = '' }: DriveModalProps) {
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const needsTitle = !taskTitle.trim();

  useEffect(() => {
    if (open) {
      setLink('');
      setTitle('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (needsTitle && !title.trim()) { setError('يرجى إضافة عنوان المهمة'); return; }
    if (!link.trim()) { setError('يرجى إضافة الرابط'); return; }
    if (!link.startsWith('http')) { setError('الرابط غير صحيح'); return; }
    setLoading(true);
    onSubmit(link.trim(), needsTitle ? title.trim() : taskTitle);
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إكمال المهمة"
      maxWidth={440}
      footer={
        <>
          <button className="btn" disabled={loading} onClick={handleSubmit}>
            {loading ? <div className="spinner" /> : 'إكمال المهمة'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        لإكمال المهمة، أضف رابط الملف من Google Drive
      </p>
      {needsTitle && (
        <div className="form-group">
          <label>عنوان المهمة <span style={{ color: 'var(--red)' }}>*</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="أدخل عنوان المهمة"
          />
        </div>
      )}
      <div className="form-group">
        <label>رابط Drive <span style={{ color: 'var(--red)' }}>*</span></label>
        <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://drive.google.com/..." dir="ltr" />
      </div>
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
