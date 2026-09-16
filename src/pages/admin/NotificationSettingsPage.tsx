import { useEffect, useState, useCallback } from 'react';
import { useMembersStore } from '../../stores/membersStore';
import { createNotification } from '../../services/notifications.service';
import {
  loadNotificationTypeSettings,
  saveNotificationTypeSettings,
  type NotificationSettingsMap,
} from '../../services/notificationSettings.service';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import type { NotificationType } from '../../types';

const TYPE_META: Record<Exclude<NotificationType, 'admin_broadcast'>, { label: string; desc: string }> = {
  task_assigned: { label: 'مهمة جديدة مسندة', desc: 'عند إسناد مهمة لعضو — يدوياً أو عبر استيراد Excel' },
  meeting_now: { label: 'اجتماع الآن', desc: 'عند الضغط على «نبّه الأعضاء» في صفحة الاجتماعات' },
  task_overdue: { label: 'مهمة متأخرة', desc: 'فحص تلقائي يومي للمهام المتجاوزة موعدها النهائي' },
};

type RecipientMode = 'all' | 'one' | 'multi';

export function NotificationSettingsPage() {
  const { members, loadMembers } = useMembersStore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsMap>({});
  const [savingType, setSavingType] = useState<NotificationType | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
  const [singleId, setSingleId] = useState('');
  const [multiIds, setMultiIds] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [, s] = await Promise.all([loadMembers(), loadNotificationTypeSettings()]);
      setSettings(s);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [loadMembers]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (loadError) {
    return (
      <>
        <EmptyState icon="⚠️" message="تعذّر تحميل الإعدادات — تأكد من نشر قواعد قاعدة البيانات في Firebase Console" />
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-sm" onClick={load}>إعادة المحاولة</button>
        </div>
      </>
    );
  }

  const toggleTypeField = async (type: NotificationType, field: 'enabled' | 'pushEnabled') => {
    setSavingType(type);
    const current = settings[type] ?? {};
    const currentVal = current[field] ?? true;
    const updated = { ...current, [field]: !currentVal };
    await saveNotificationTypeSettings(type, updated);
    setSettings(prev => ({ ...prev, [type]: updated }));
    setSavingType(null);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    let recipients: string[] = [];
    if (recipientMode === 'all') recipients = members.map(m => m.id);
    else if (recipientMode === 'one') recipients = singleId ? [singleId] : [];
    else recipients = Object.entries(multiIds).filter(([, v]) => v).map(([id]) => id);

    if (recipients.length === 0) { alert('اختر مستلماً واحداً على الأقل'); return; }

    setSending(true);
    await Promise.all(recipients.map(userId =>
      createNotification({
        userId,
        type: 'admin_broadcast',
        title: title.trim(),
        body: body.trim(),
        read: false,
        createdAt: Date.now(),
      })
    )).catch(() => {});
    setSending(false);
    setSentMsg(`تم إرسال الرسالة إلى ${recipients.length} عضو`);
    setTitle('');
    setBody('');
    setMultiIds({});
    setSingleId('');
    setTimeout(() => setSentMsg(''), 4000);
  };

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>إعدادات الإشعارات</h1>
          <p>تحكم بأنواع الإشعارات المرسلة، وأرسل رسائل مباشرة للأعضاء</p>
        </div>
      </div>

      <Card title="أنواع الإشعارات">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(Object.entries(TYPE_META) as [keyof typeof TYPE_META, { label: string; desc: string }][]).map(([type, meta]) => {
            const s = settings[type] ?? {};
            const enabled = s.enabled ?? true;
            const pushEnabled = s.pushEnabled ?? true;
            return (
              <div key={type} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                padding: '12px 14px', background: 'var(--dark)', border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{meta.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{meta.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={savingType === type}
                      onChange={() => toggleTypeField(type, 'enabled')}
                      style={{ accentColor: 'var(--gold)', width: 15, height: 15 }}
                    />
                    مفعّلة
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', opacity: enabled ? 1 : 0.4 }}>
                    <input
                      type="checkbox"
                      checked={pushEnabled}
                      disabled={savingType === type || !enabled}
                      onChange={() => toggleTypeField(type, 'pushEnabled')}
                      style={{ accentColor: 'var(--gold)', width: 15, height: 15 }}
                    />
                    إرسال Push
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="✉️ إرسال رسالة">
        {sentMsg && <div style={{ color: 'var(--green2)', fontSize: 13, marginBottom: 12 }}>{sentMsg}</div>}
        <div className="form-group">
          <label>العنوان</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الرسالة" />
        </div>
        <div className="form-group">
          <label>النص</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="نص الرسالة" rows={3} />
        </div>
        <div className="form-group">
          <label>المستلمون</label>
          <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
            {([['all', 'الكل'], ['one', 'عضو واحد'], ['multi', 'عدة أعضاء']] as [RecipientMode, string][]).map(([mode, label]) => (
              <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="recipientMode" checked={recipientMode === mode} onChange={() => setRecipientMode(mode)} />
                {label}
              </label>
            ))}
          </div>
          {recipientMode === 'one' && (
            <select className="status-select" value={singleId} onChange={e => setSingleId(e.target.value)}>
              <option value="">اختر عضواً</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          {recipientMode === 'multi' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {members.map(m => (
                <label key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer',
                  padding: '6px 8px', background: 'var(--dark)', border: '1px solid var(--border)',
                }}>
                  <input type="checkbox" checked={!!multiIds[m.id]} onChange={() => setMultiIds(prev => ({ ...prev, [m.id]: !prev[m.id] }))} />
                  {m.name}
                </label>
              ))}
            </div>
          )}
        </div>
        <button className="btn" disabled={sending || !title.trim() || !body.trim()} onClick={handleSend}>
          {sending ? <div className="spinner" /> : 'إرسال'}
        </button>
      </Card>
    </>
  );
}
