import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../ui/Avatar';
import { uploadImage, validateImageFile } from '../../services/cloudinary.service';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { profile, firebaseUser, updateProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(profile?.name || '');
      const initEmail = firebaseUser?.email || profile?.email || '';
      setEmail(initEmail);
      setOriginalEmail(initEmail);
      setPassword('');
      setTwitterHandle(profile?.twitterHandle || '');
      setError('');
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  }, [open, profile, firebaseUser]);

  const handlePhotoChange = (file: File | null) => {
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (e: unknown) {
      setError((e as Error).message);
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('يرجى إدخال الاسم'); return; }
    setLoading(true);
    try {
      let photoURL: string | undefined;
      if (photoFile) {
        photoURL = await uploadImage(photoFile);
      }
      const emailChanged = email.trim() !== originalEmail;
      await updateProfile(name.trim(), emailChanged ? email.trim() : undefined, emailChanged ? (password || undefined) : undefined, photoURL, twitterHandle.trim() || undefined);
      onClose();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'auth/invalid-credential') setError('كلمة المرور غير صحيحة');
      else if (err.code === 'auth/email-already-in-use') setError('البريد مستخدم من حساب آخر');
      else setError(err.message || String(e));
    }
    setLoading(false);
  };

  const currentPhoto = photoPreview || profile?.photoURL || null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تعديل الملف الشخصي"
      footer={
        <>
          <button className="btn" disabled={loading} onClick={handleSave}>
            {loading ? <div className="spinner" /> : 'حفظ التغييرات'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      {/* Avatar upload */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}
        >
          {currentPhoto
            ? <div className="avatar" style={{ width: 72, height: 72 }}><img src={currentPhoto} alt="" /></div>
            : <Avatar user={profile} size={72} />
          }
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.2s',
            borderRadius: 0,
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >
            <span style={{ fontSize: 11, color: '#fff', letterSpacing: 1 }}>تغيير</span>
          </div>
        </div>
        <button
          className="btn btn-xs btn-ghost"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          📎 رفع صورة
        </button>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={fileRef}
          onChange={e => handlePhotoChange(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="form-group">
        <label>الاسم</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" />
      </div>
      <div className="form-group">
        <label>البريد الإلكتروني</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@revolta.com" />
      </div>
      <div className="form-group">
        <label>حساب X (تويتر) — بعد @</label>
        <input type="text" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} placeholder="username" />
      </div>
      {error && <div className="err">{error}</div>}
    </Modal>
  );
}
