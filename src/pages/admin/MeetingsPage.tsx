import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { loadAllMeetings, createMeeting, saveAttendance, deleteMeeting, MEETING_POINTS } from '../../services/meetings.service';
import type { Meeting } from '../../types';
import './MeetingsPage.css';

export function MeetingsPage() {
  const { profile, firebaseUser, can } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const isAdmin = !!profile?.isAdmin;
  const canManage = isAdmin || can('addTaskOthers');

  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [newModal, setNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);

  const [attendanceModal, setAttendanceModal] = useState<Meeting | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadAllMeetings().then(setMeetings)]);
    setLoading(false);
  }, [loadMembers]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    await createMeeting(newTitle.trim(), newDate, firebaseUser?.uid ?? '');
    setNewModal(false);
    setNewTitle('');
    setNewDate('');
    setSaving(false);
    load();
  };

  const openAttendance = (m: Meeting) => {
    setAttendanceModal(m);
    setAttendanceMap({ ...(m.attendees ?? {}) });
  };

  const handleSaveAttendance = async () => {
    if (!attendanceModal) return;
    setSavingAttendance(true);
    await saveAttendance(attendanceModal.id, attendanceMap);
    setSavingAttendance(false);
    setAttendanceModal(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف الاجتماع؟')) return;
    await deleteMeeting(id);
    load();
  };

  if (loading) return <Spinner />;

  const myAttendanceCount = meetings.filter(m => m.attendees?.[firebaseUser?.uid ?? '']).length;
  const myMeetingPoints = myAttendanceCount * MEETING_POINTS;

  return (
    <>
      <div className="page-hdr">
        <div className="page-hdr-text">
          <h1>الاجتماعات</h1>
          <p>{meetings.length} اجتماع · {myAttendanceCount} حضرتَ منها</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {myMeetingPoints > 0 && (
            <div style={{ textAlign: 'center', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', padding: '8px 18px' }}>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, color: 'var(--gold)', lineHeight: 1 }}>{myMeetingPoints}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>نقاط الحضور</div>
            </div>
          )}
          {canManage && (
            <button className="btn" onClick={() => { setNewTitle(''); setNewDate(new Date().toISOString().slice(0,10)); setNewModal(true); }}>
              + اجتماع جديد
            </button>
          )}
        </div>
      </div>

      {meetings.length === 0
        ? <EmptyState icon="🗓" message="لا توجد اجتماعات بعد" />
        : (
          <div className="meetings-list">
            {meetings.map(m => {
              const attendeeCount = Object.values(m.attendees ?? {}).filter(Boolean).length;
              const iAttended = !!m.attendees?.[firebaseUser?.uid ?? ''];
              return (
                <div className="meeting-card" key={m.id}>
                  <div className="meeting-card-top">
                    <div className="meeting-date-col">
                      <span className="meeting-day">{new Date(m.date).toLocaleDateString('ar', { day: 'numeric' })}</span>
                      <span className="meeting-month">{new Date(m.date).toLocaleDateString('ar', { month: 'short' })}</span>
                    </div>
                    <div className="meeting-info">
                      <div className="meeting-title">{m.title}</div>
                      <div className="meeting-meta">
                        <span className="meeting-attendance-count">
                          👥 {attendeeCount} من {members.length} حضروا
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'Oswald, sans-serif' }}>
                          ⭐ {MEETING_POINTS} نقطة
                        </span>
                        {iAttended && (
                          <span className="meeting-attended-badge">✓ حضرت</span>
                        )}
                      </div>
                      {attendeeCount > 0 && (
                        <div className="meeting-avatars">
                          {members
                            .filter(u => m.attendees?.[u.id])
                            .slice(0, 8)
                            .map((u, i) => (
                              <div
                                key={u.id}
                                className="meeting-avatar"
                                title={u.name}
                                style={{ background: u.color || 'var(--border)', zIndex: 10 - i }}
                              >
                                {u.photoURL
                                  ? <img src={u.photoURL} alt={u.name} />
                                  : u.name.charAt(0)
                                }
                              </div>
                            ))
                          }
                          {attendeeCount > 8 && (
                            <div className="meeting-avatar meeting-avatar-more">+{attendeeCount - 8}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="meeting-actions">
                      {canManage && (
                        <button className="btn btn-xs" onClick={() => openAttendance(m)}>
                          تسجيل الحضور
                        </button>
                      )}
                      {!canManage && (
                        <button className="btn btn-xs btn-ghost" onClick={() => openAttendance(m)}>
                          عرض الحضور
                        </button>
                      )}
                      {canManage && (
                        <button className="btn btn-xs btn-danger" onClick={() => handleDelete(m.id)}>حذف</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Modal: اجتماع جديد */}
      {newModal && (
        <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) setNewModal(false); }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title">🗓 اجتماع جديد</div>
            <div className="form-group">
              <label>اسم الاجتماع</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="مثال: اجتماع التخطيط الأسبوعي"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>التاريخ</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={handleCreate} disabled={!newTitle.trim() || !newDate || saving}>
                {saving ? <div className="spinner" /> : 'إنشاء'}
              </button>
              <button className="btn btn-ghost" onClick={() => setNewModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تسجيل الحضور */}
      {attendanceModal && (
        <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) setAttendanceModal(null); }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-title">👥 {attendanceModal.title}</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px' }}>
              {attendanceModal.date} · كل حضور = {MEETING_POINTS} نقطة
            </p>
            <div className="attendance-list">
              {members.map(u => {
                const present = !!attendanceMap[u.id];
                return (
                  <label
                    key={u.id}
                    className={`attendance-row ${present ? 'present' : ''}`}
                    onClick={() => {
                      if (!canManage) return;
                      setAttendanceMap(prev => ({ ...prev, [u.id]: !prev[u.id] }));
                    }}
                  >
                    <div className="attendance-avatar" style={{ background: u.color || 'var(--border)' }}>
                      {u.photoURL ? <img src={u.photoURL} alt={u.name} /> : u.name.charAt(0)}
                    </div>
                    <div className="attendance-name">
                      <span>{u.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{u.jobRole}</span>
                    </div>
                    <div className={`attendance-check ${present ? 'checked' : ''}`}>
                      {present ? '✓' : ''}
                    </div>
                  </label>
                );
              })}
            </div>
            {canManage && (
              <div className="modal-footer">
                <button className="btn" onClick={handleSaveAttendance} disabled={savingAttendance}>
                  {savingAttendance ? <div className="spinner" /> : 'حفظ الحضور'}
                </button>
                <button className="btn btn-ghost" onClick={() => setAttendanceModal(null)}>إلغاء</button>
              </div>
            )}
            {!canManage && (
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setAttendanceModal(null)}>إغلاق</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
