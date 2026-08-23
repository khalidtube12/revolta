const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const RAW_PRESET    = import.meta.env.VITE_CLOUDINARY_RAW_PRESET    as string;

const MAX_MB = 8;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم. يُسمح فقط بـ JPG، PNG، WebP، GIF');
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`حجم الصورة يجب أن يكون أقل من ${MAX_MB}MB`);
  }
}

export async function uploadImage(file: File): Promise<string> {
  validateImageFile(file);
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('فشل رفع الصورة');
  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}

/** رفع ملف عادي (PDF, TXT, ZIP...) عبر Cloudinary raw/upload — يستخدم RevoltaForm preset */
export async function uploadRawFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', RAW_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json() as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? 'فشل رفع الملف');
  }
  return data.secure_url;
}
