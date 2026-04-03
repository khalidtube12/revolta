import { useState } from 'react';
import { Modal } from './Modal';
import { useMembersStore } from '../../stores/membersStore';

interface MemberModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MemberModal({ open, onClose, onSuccess }: MemberModalProps) {
  const { addMember } = useMembersStore();
  const [name, setName] = useState('');
  const [role, setRole] = useState('صانع محتوى');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError('');
    if (!name || !role || !email || !password) { setError('يرجى ملء جميع الحقول'); return; }
    if (password.length < 6) { setError('كلمة المرور على الأقل 6 أحرف'); return; }
    setLoading(true);
    try {
      await addMember(name, role, email, password);
      setName(''); setRole('صانع محتوى'); setEmail(''); setPassword('');
      onClose();
      onSuccess?.();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      setError(err.code === 'auth/email-already-in-use' ? 'هذا البريد مستخدم مسبقاً' : (err.message || 'خطأ'));
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة عضو جديد"
      footer={
        <>
          <button className="btn" disabled={loading} onClick={handleSave}>
            {loading ? <div className="spinner" /> : 'إضافة العضو'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <div className="form-group">
        <label>الاسم الكامل</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم العضو" />
      </div>
      <div className="form-group">
        <label>الدور في الفريق</label>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="صانع محتوى">صانع محتوى</option>
          <option value="كاتب">كاتب</option>
          <option value="مصمم">مصمم</option>
          <option value="ممنتج">ممنتج</option>
        </select>
      </div>
      <div className="form-group">
        <label>البريد الإلكتروني</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@revolta.com" />
      </div>
      <div className="form-group">
        <label>كلمة المرور</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="على الأقل 6 أحرف" />
      </div>
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
