import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useAuthStore } from '../../stores/authStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { useMembersStore } from '../../stores/membersStore';

interface IdeaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IdeaModal({ open, onClose, onSuccess }: IdeaModalProps) {
  const { firebaseUser } = useAuthStore();
  const { addIdea } = useIdeasStore();
  const { members, loadMembers } = useMembersStore();
  const [text, setText] = useState('');
  const [type, setType] = useState<'short' | 'video'>('short');
  const [ownerId, setOwnerId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadMembers();
      setText('');
      setType('short');
      setOwnerId('');
      setError('');
    }
  }, [open, loadMembers]);

  const handleSave = async () => {
    if (!text.trim()) { setError('يرجى كتابة الفكرة'); return; }
    setLoading(true);
    try {
      await addIdea({
        text: text.trim(),
        type,
        ownerId: ownerId || null,
        createdBy: firebaseUser?.uid,
        createdAt: Date.now(),
      });
      onClose();
      onSuccess?.();
    } catch (e: unknown) {
      setError('خطأ: ' + (e instanceof Error ? e.message : e));
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="فكرة جديدة"
      footer={
        <>
          <button className="btn" disabled={loading} onClick={handleSave}>
            {loading ? <div className="spinner" /> : 'حفظ الفكرة'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <div className="form-group">
        <label>الفكرة</label>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="اكتب فكرتك هنا..." />
      </div>
      <div className="form-group">
        <label>نوع الفكرة</label>
        <select value={type} onChange={e => setType(e.target.value as 'short' | 'video')}>
          <option value="short">شورت</option>
          <option value="video">مقطع</option>
        </select>
      </div>
      <div className="form-group">
        <label>صاحب المقطع</label>
        <select value={ownerId} onChange={e => setOwnerId(e.target.value)}>
          <option value="">بدون صاحب</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
