import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { useIdeasStore } from '../../stores/ideasStore';
import { EmptyState } from '../../components/ui/EmptyState';
import './AllTasksPage.css';
import { TaskModal } from '../../components/modals/TaskModal';
import { ImportModal } from '../../components/modals/ImportModal';
import { DriveModal } from '../../components/modals/DriveModal';
import { EditTaskModal } from '../../components/modals/EditTaskModal';
import { TwitterModal } from '../../components/modals/TwitterModal';
import { VideoCompleteModal } from '../../components/modals/VideoCompleteModal';
import { Spinner } from '../../components/ui/Spinner';
import { getStatus } from '../../utils/status';
import { getTaskMonth } from '../../utils/date';
import { exportTasksXLSX } from '../../utils/csv';
import { STATUS_MAP, PRIORITY_MAP } from '../../types';
import type { Task, TaskStatus } from '../../types';
import { getDefaultPoints } from '../../services/points.service';

const TYPE_LABEL: Record<string, string> = {
  short: 'شورت',
  video: 'مقطع',
  writing: 'كتابة',
  x_content: 'محتوى X',
  podcast: 'بودكاست',
  design: 'تصميم',
};

const TYPE_COLOR: Record<string, string> = {
  short: '#c9a84c',
  video: '#3a9e65',
  writing: '#a09880',
  x_content: '#e05555',
  podcast: '#c9a84c',
  design: '#c45c00',
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'معلقة', color: '#a09880' },
  ready: { label: 'جاهز للنشر', color: '#c9a84c' },
  done: { label: 'مكتملة', color: '#3a9e65' },
  published: { label: 'تم النشر', color: '#4ade80' },
  cancelled: { label: 'ملغية', color: '#e05555' },
};

const STATUS_ORDER: string[] = ['pending', 'ready', 'done', 'published', 'cancelled'];

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high: { label: 'عالية', color: '#e05555' },
  medium: { label: 'متوسطة', color: '#c9a84c' },
  low: { label: 'منخفضة', color: '#a09880' },
};

export function AllTasksPage() {
  const { profile, firebaseUser, can } = useAuthStore();
  const { members, loadMembers } = useMembersStore();
  const { tasks, loadAllTasks, updateTask, deleteTask, filterMonth, filterPriority, setFilterMonth, setFilterPriority } = useTasksStore();
  const { ideas: _ideas, loadIdeas } = useIdeasStore();
  const isAdmin = !!profile?.isAdmin;
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [driveModal, setDriveModal] = useState<{ taskId: string; status: TaskStatus; taskTitle: string } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleVal, setEditingTitleVal] = useState('');
  const [bonusModal, setBonusModal] = useState<Task | null>(null);
  const [bonusVal, setBonusVal] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [twitterModal, setTwitterModal] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<{ id: string; type: 'video' | 'podcast' | 'short' } | null>(null);
  const [activeTab, setActiveTab] = useState<'core' | 'bonus'>('core');

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadAllTasks(), loadIdeas()]);
    setLoading(false);
  }, [loadMembers, loadAllTasks, loadIdeas]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const now = new Date();
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const prevMonth = now.getMonth() === 0
    ? (now.getFullYear() - 1) + '-12'
    : now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');

  const nextMonth = now.getMonth() === 11
    ? (now.getFullYear() + 1) + '-01'
    : now.getFullYear() + '-' + String(now.getMonth() + 2).padStart(2, '0');

  const toLabel = (m: string) => new Date(m + '-01').toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  const fixedMonths = [nextMonth, thisMonth, prevMonth];
  const monthsInTasks = [...new Set(tasks.map(t => getTaskMonth(t.deadline, t.createdAt)))].filter(Boolean).sort().reverse();
  const extraMonths = monthsInTasks.filter(m => !fixedMonths.includes(m));

  const monthOpts: { v: string; l: string }[] = [
    { v: '', l: 'كل الأشهر' },
    ...fixedMonths.map(m => ({ v: m, l: toLabel(m) })),
    ...extraMonths.map(m => ({ v: m, l: toLabel(m) })),
  ];

  const coreTasks = tasks.filter(t => !t.isBonus);
  const bonusTasks = tasks.filter(t => t.isBonus === true);
  const tabTasks = activeTab === 'core' ? coreTasks : bonusTasks;

  const matchesBase = (t: Task) => {
    if (filterMonth) {
      const m = filterMonth === 'current' ? thisMonth : filterMonth === 'prev' ? prevMonth : filterMonth;
      if (getTaskMonth(t.deadline, t.createdAt) !== m) return false;
    }
    if (filterPriority && (t.priority || 'medium') !== filterPriority) return false;
    if (filterType && (t.type || '') !== filterType) return false;
    if (filterMember && t.memberId !== filterMember) return false;
    if (filterApproval) {
      const earned = t.done || t.status === 'published';
      if (filterApproval === 'approved' && !t.pointsApproved) return false;
      if (filterApproval === 'waiting' && !(earned && !t.pointsApproved)) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const memberName = members.find(u => u.id === t.memberId)?.name?.toLowerCase() ?? '';
      const hay = `${t.title ?? ''} ${t.desc ?? ''} ${memberName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const baseFiltered = tabTasks.filter(matchesBase);
  const statusCounts: Record<string, number> = {};
  baseFiltered.forEach(t => {
    const s = getStatus(t);
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  });

  const filtered = filterStatus ? baseFiltered.filter(t => getStatus(t) === filterStatus) : baseFiltered;
  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'desc' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0)
  );

  const activeFilterCount =
    (filterMonth ? 1 : 0) + (filterPriority ? 1 : 0) + (filterType ? 1 : 0) +
    (filterStatus ? 1 : 0) + (filterMember ? 1 : 0) + (filterApproval ? 1 : 0) + (search.trim() ? 1 : 0);

  const resetFilters = () => {
    setFilterMonth('');
    setFilterPriority('');
    setFilterType('');
    setFilterStatus('');
    setFilterMember('');
    setFilterApproval('');
    setSearch('');
  };

  const completeTask = (taskId: string) => {
    const t = tasks.find(t => t.id === taskId);
    if (t?.type === 'writing') {
      updateTask(taskId, { status: 'done', done: true }).then(load);
    } else if (t?.type === 'x_content') {
      setTwitterModal(taskId);
    } else if (t?.type === 'video' || t?.type === 'podcast' || t?.type === 'short') {
      setVideoModal({ id: taskId, type: t.type });
    } else {
      setDriveModal({ taskId, status: 'done', taskTitle: t?.title || '' });
    }
  };

  const handleVideoSubmit = async (driveLink: string, producerId: string) => {
    if (!videoModal) return;
    await updateTask(videoModal.id, { status: 'done', done: true, producerId, ...(driveLink ? { driveLink } : {}) });
    setVideoModal(null);
    load();
  };

  const handleTwitterSubmit = async (twitterUrl: string) => {
    if (!twitterModal) return;
    await updateTask(twitterModal, { status: 'published', done: true, ...(twitterUrl ? { twitterUrl } : {}) });
    setTwitterModal(null);
    load();
  };

  const handleChangeStatus = (taskId: string, status: TaskStatus) => {
    const t = tasks.find(t => t.id === taskId);
    if (t?.type === 'writing') {
      if (status === 'published' || status === 'pending') {
        if (!isAdmin && !can('changeTaskStatus') && !can('setTaskComplete') && !can('setTaskIncomplete')) return;
        updateTask(taskId, { status, done: status === 'published' }).then(load);
        return;
      }
    }
    if (status === 'done') {
      if (!isAdmin && !can('setTaskComplete') && !can('changeTaskStatus')) return;
      completeTask(taskId);
      return;
    }
    if (!isAdmin) {
      if (can('changeTaskStatus')) {
        // allowed
      } else if (status === 'pending' || status === 'cancelled') {
        if (!can('setTaskIncomplete')) return;
      } else {
        return;
      }
    }
    const isDone = status !== 'pending' && status !== 'cancelled';
    updateTask(taskId, { status, done: isDone }).then(load);
  };

  const handleDriveSubmit = async (link: string, title: string) => {
    if (!driveModal) return;
    await updateTask(driveModal.taskId, { status: driveModal.status, done: true, driveLink: link, ...(title ? { title } : {}) });
    setDriveModal(null);
    load();
  };

  const handleSaveTitle = async (taskId: string) => {
    const val = editingTitleVal.trim();
    if (val) await updateTask(taskId, { title: val });
    setEditingTitleId(null);
    load();
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('حذف المهمة؟')) return;
    await deleteTask(taskId);
    load();
  };

  const handleApproveBonus = async (taskId: string) => {
    await updateTask(taskId, { pointsApproved: true, pointsApprovedBy: firebaseUser?.uid ?? '', pointsApprovedAt: Date.now() });
    load();
  };

  const handleSaveBonus = async () => {
    if (!bonusModal) return;
    const amount = parseInt(bonusVal, 10);
    if (isNaN(amount) || amount < 0) { alert('أدخل رقماً صحيحاً'); return; }
    await updateTask(bonusModal.id, { bonusPoints: amount, ...(bonusNote.trim() ? { bonusNote: bonusNote.trim() } : {}) });
    setBonusModal(null);
    setBonusVal('');
    setBonusNote('');
    load();
  };

  const handleExport = () => {
    if (!sorted.length) { alert('لا توجد مهام للتصدير'); return; }
    const rows = sorted.map(t => {
      const m = members.find(u => u.id === t.memberId);
      const st = getStatus(t);
      const si = STATUS_MAP[st] || STATUS_MAP.pending;
      return {
        member:   m?.name || 'غير معروف',
        task:     t.title,
        details:  t.desc || '',
        deadline: t.deadline || '',
        priority: PRIORITY_MAP[t.priority || 'medium'],
        status:   si.label,
        type:     t.type ? TYPE_LABEL[t.type] || t.type : '',
      };
    });
    exportTasksXLSX('Revolta_Tasks_' + new Date().toISOString().slice(0, 10) + '.xlsx', rows).catch(() => {});
  };

  const canEdit = isAdmin || can('editTask');
  const canDelete = isAdmin || can('deleteTask');
  const canChangeStatus = isAdmin || can('changeTaskStatus');
  const canSetIncomplete = isAdmin || can('setTaskIncomplete');
  const canSetComplete = isAdmin || can('setTaskComplete');
  const myUid = firebaseUser?.uid;

  const memberOpts = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return (
    <div className="tk-wrap">
      <header className="tk-hdr">
        <div className="tk-hdr-titles">
          <h1>المهام</h1>
          <div className="tk-hdr-sub">
            <span className="tk-hdr-count">{sorted.length}</span>
            <span>من {tabTasks.length} {activeTab === 'core' ? 'مهمة أساسية' : 'مهمة بونص'}</span>
            {activeFilterCount > 0 && <span>· {activeFilterCount} فلتر مُطبَّق</span>}
          </div>
          <div className="tk-hdr-line" />
        </div>
        <div className="tk-hdr-actions">
          {(isAdmin || can('exportTasks')) && <button className="btn btn-ghost btn-sm" onClick={handleExport}>تصدير Excel</button>}
          {(isAdmin || can('importTasks')) && <button className="btn btn-ghost btn-sm" onClick={() => setImportModal(true)}>استيراد Excel</button>}
          {(isAdmin || can('addTaskOthers')) && <button className="btn btn-sm" onClick={() => setTaskModal(true)}>+ مهمة جديدة</button>}
        </div>
      </header>

      <div className="tk-tabs" role="tablist" aria-label="نوع المهام">
        <button
          role="tab"
          aria-selected={activeTab === 'core'}
          className={`tk-tab ${activeTab === 'core' ? 'active' : ''}`}
          onClick={() => { setActiveTab('core'); setFilterApproval(''); }}
        >
          المهام الأساسية
          <span className="tk-tab-count">{coreTasks.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'bonus'}
          className={`tk-tab bonus ${activeTab === 'bonus' ? 'active' : ''}`}
          onClick={() => setActiveTab('bonus')}
        >
          مهام البونص
          <span className="tk-tab-count">{bonusTasks.length}</span>
        </button>
      </div>

      <section className="tk-toolbar" aria-label="فلاتر المهام">
        <div className="tk-toolbar-row">
          <div className="tk-search">
            <span className="tk-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث بعنوان المهمة أو اسم العضو…"
              aria-label="بحث في المهام"
            />
            {search && (
              <button className="tk-search-clear" onClick={() => setSearch('')} aria-label="مسح البحث">×</button>
            )}
          </div>

          <div className={`tk-field ${filterMonth ? 'active' : ''}`}>
            <span className="tk-field-lbl">الشهر</span>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} aria-label="فلترة بالشهر">
              {monthOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>

          <div className={`tk-field ${filterMember ? 'active' : ''}`}>
            <span className="tk-field-lbl">العضو</span>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} aria-label="فلترة بالعضو">
              <option value="">كل الأعضاء</option>
              {memberOpts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className={`tk-field ${filterType ? 'active' : ''}`}>
            <span className="tk-field-lbl">النوع</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} aria-label="فلترة بنوع المهمة">
              <option value="">كل الأنواع</option>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {activeTab === 'bonus' && (
            <div className={`tk-field ${filterApproval ? 'active' : ''}`}>
              <span className="tk-field-lbl">النقاط</span>
              <select value={filterApproval} onChange={e => setFilterApproval(e.target.value)} aria-label="فلترة بحالة اعتماد النقاط">
                <option value="">كل النقاط</option>
                <option value="waiting">بانتظار الموافقة</option>
                <option value="approved">معتمدة</option>
              </select>
            </div>
          )}

          <div className="tk-field">
            <span className="tk-field-lbl">الترتيب</span>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')} aria-label="ترتيب المهام">
              <option value="desc">الأحدث أولاً</option>
              <option value="asc">الأقدم أولاً</option>
            </select>
          </div>
        </div>

        <div className="tk-toolbar-row">
          <div className="tk-chip-group">
            <span className="tk-chip-lbl">الحالة</span>
            <button
              className={`tk-chip ${!filterStatus ? 'active' : ''}`}
              onClick={() => setFilterStatus('')}
            >
              الكل <span className="tk-chip-num">{baseFiltered.length}</span>
            </button>
            {STATUS_ORDER.map(s => {
              const meta = STATUS_META[s];
              return (
                <button
                  key={s}
                  className={`tk-chip ${filterStatus === s ? 'active' : ''}`}
                  style={{ ['--chip' as string]: meta.color }}
                  onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                >
                  <span className="tk-chip-dot" style={{ background: meta.color }} />
                  {meta.label} <span className="tk-chip-num">{statusCounts[s] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="tk-toolbar-row">
          <div className="tk-chip-group">
            <span className="tk-chip-lbl">الأولوية</span>
            <button
              className={`tk-chip ${!filterPriority ? 'active' : ''}`}
              onClick={() => setFilterPriority('')}
            >
              الكل
            </button>
            {(['high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                className={`tk-chip ${filterPriority === p ? 'active' : ''}`}
                style={{ ['--chip' as string]: PRIORITY_META[p].color }}
                onClick={() => setFilterPriority(filterPriority === p ? '' : p)}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
          {activeFilterCount > 0
            ? <button className="tk-reset" onClick={resetFilters}>مسح كل الفلاتر ({activeFilterCount})</button>
            : <span className="tk-result-note">لا فلاتر مُطبَّقة — تُعرض كل المهام</span>
          }
        </div>
      </section>

      {sorted.length === 0 ? (
        <EmptyState
          icon={activeTab === 'bonus' ? '⭐' : '📋'}
          message={
            activeFilterCount > 0
              ? 'لا توجد مهام تطابق الفلاتر الحالية'
              : activeTab === 'bonus' ? 'لا توجد مهام بونص بعد' : 'لا توجد مهام بعد'
          }
        />
      ) : (
        <div className="tk-list">
          {sorted.map(t => {
            const st = getStatus(t);
            const sm = STATUS_META[st] || STATUS_META.pending;
            const member = members.find(u => u.id === t.memberId);
            const isLate = !t.done && t.deadline && new Date(t.deadline) < new Date();
            const isFinal = st === 'done' || st === 'published';
            const cardOpacity = st === 'cancelled' ? 0.45 : isFinal ? 0.8 : 1;
            const showSelect = canChangeStatus || (!isFinal && canSetComplete) || (isFinal && canSetIncomplete);
            const isMyTask = t.memberId === myUid;
            const canEditTitle = isMyTask && !canEdit && !isFinal;
            const priority = t.priority || 'medium';
            const base = t.points ?? getDefaultPoints(t.type);
            const bonus = t.bonusPoints ?? 0;
            const total = base + bonus;
            const earned = t.done || t.status === 'published';

            return (
              <article
                className="tk-card"
                key={t.id}
                style={{ opacity: cardOpacity, ['--accent' as string]: sm.color }}
              >
                <div className="tk-card-body">
                  <div className="tk-card-main">
                    <div className="tk-tags">
                      <span className="tk-tag tk-tag-status" style={{ color: sm.color, borderColor: sm.color }}>
                        <span className="tk-chip-dot" style={{ background: sm.color }} />
                        {sm.label}
                      </span>
                      {t.type && (
                        <span className="tk-tag tk-tag-type" style={{ color: TYPE_COLOR[t.type], borderColor: TYPE_COLOR[t.type] }}>
                          {TYPE_LABEL[t.type] || t.type}
                        </span>
                      )}
                      <span className="tk-tag tk-tag-type" style={{ color: PRIORITY_META[priority].color, borderColor: PRIORITY_META[priority].color }}>
                        أولوية {PRIORITY_META[priority].label}
                      </span>
                      {t.isBonus && (
                        <span className="tk-tag tk-tag-type" style={{ color: '#4ade80', borderColor: 'rgba(45,122,79,0.5)' }}>
                          بونص
                        </span>
                      )}
                    </div>

                    {editingTitleId === t.id ? (
                      <div className="tk-title-edit">
                        <input
                          autoFocus
                          value={editingTitleVal}
                          onChange={e => setEditingTitleVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                            if (e.key === 'Enter') handleSaveTitle(t.id);
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                          onBlur={() => handleSaveTitle(t.id)}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h2 className={`tk-title${st === 'published' || st === 'cancelled' ? ' dim' : ''}`}>
                          {t.title || <span className="tk-title-empty">بدون عنوان</span>}
                        </h2>
                        {canEditTitle && (
                          <button
                            className="tk-icon-btn"
                            title="تعديل العنوان"
                            onClick={() => { setEditingTitleId(t.id); setEditingTitleVal(t.title || ''); }}
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    )}

                    <div className="tk-meta">
                      {member && (
                        <span className="tk-meta-item">
                          <span className="tk-avatar" style={{ background: member.color || 'var(--border2)' }}>
                            {member.photoURL
                              ? <img src={member.photoURL} alt="" className="tk-avatar-img" />
                              : member.name.charAt(0)}
                          </span>
                          {member.name}
                        </span>
                      )}
                      {t.teamMemberIds && t.teamMemberIds.length > 0 && (
                        <span className="tk-meta-item">
                          <span className="tk-team">
                            {t.teamMemberIds.map((tid, i) => {
                              const tm = members.find(u => u.id === tid);
                              if (!tm) return null;
                              return (
                                <span
                                  key={tid}
                                  className="tk-avatar"
                                  title={tm.name}
                                  style={{ background: tm.color || 'var(--border2)', zIndex: t.teamMemberIds!.length - i }}
                                >
                                  {tm.photoURL
                                    ? <img src={tm.photoURL} alt="" className="tk-avatar-img" />
                                    : tm.name.charAt(0)}
                                </span>
                              );
                            })}
                          </span>
                          فريق
                        </span>
                      )}
                      {t.deadline && (
                        <span className={`tk-meta-item${isLate ? ' late' : ''}`}>
                          {isLate ? `متأخرة · ${t.deadline}` : t.deadline}
                        </span>
                      )}
                      {t.driveLink && (
                        <a
                          href={t.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tk-meta-item tk-drive"
                          onClick={e => e.stopPropagation()}
                        >
                          ملف Drive
                        </a>
                      )}
                      {t.twitterUrl && (
                        <a
                          href={t.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tk-meta-item tk-drive"
                          onClick={e => e.stopPropagation()}
                        >
                          التغريدة
                        </a>
                      )}
                    </div>
                  </div>

                  {total > 0 && (
                    <div className={`tk-points${t.isBonus && !earned ? ' pending' : ''}`}>
                      <span className="tk-points-num">{total}</span>
                      <span className="tk-points-lbl">
                        {t.isBonus && !earned ? 'نقطة متوقعة' : 'نقطة'}
                      </span>
                      {!t.isBonus && bonus > 0 && (
                        <span className="tk-points-extra" title={`${base} أساسية + ${bonus} مكافأة`}>+{bonus} مكافأة</span>
                      )}
                      {t.isBonus && earned && (
                        t.pointsApproved
                          ? <span className="tk-points-ok">معتمدة</span>
                          : <span className="tk-points-wait">بانتظار الموافقة</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="tk-card-foot">
                  {showSelect && (
                    <select
                      className="tk-select"
                      aria-label="تغيير حالة المهمة"
                      value={st === 'done' && t.type === 'writing' ? 'published' : st}
                      onChange={e => handleChangeStatus(t.id, e.target.value as TaskStatus)}
                    >
                      {t.type === 'writing' ? (
                        <>
                          <option value="pending">معلقة</option>
                          <option value="published">تم النشر</option>
                        </>
                      ) : (
                        <>
                          <option value="pending">معلقة</option>
                          {(isAdmin || canSetComplete || canChangeStatus) && <option value="done">مكتملة</option>}
                          {(isAdmin || canChangeStatus) && <option value="ready">جاهز للنشر</option>}
                          {(isAdmin || canChangeStatus) && <option value="published">تم النشر</option>}
                          {(isAdmin || canChangeStatus) && <option value="cancelled">ملغية</option>}
                        </>
                      )}
                    </select>
                  )}
                  <div className="tk-foot-actions">
                    {t.isBonus && earned && !t.pointsApproved && (isAdmin || can('addTaskOthers')) && (
                      <button
                        className="btn btn-xs"
                        style={{ background: 'rgba(45,122,79,0.15)', color: '#4ade80', border: '1px solid rgba(45,122,79,0.4)', boxShadow: 'none' }}
                        onClick={() => handleApproveBonus(t.id)}
                      >
                        موافقة على النقاط
                      </button>
                    )}
                    {!t.isBonus && (isAdmin || can('manageBonus')) && (
                      <button
                        className="btn btn-xs btn-ghost"
                        title="إضافة نقاط مكافأة"
                        onClick={() => { setBonusModal(t); setBonusVal(String(t.bonusPoints ?? 0)); setBonusNote(t.bonusNote ?? ''); }}
                      >
                        مكافأة
                      </button>
                    )}
                    {canEdit && <button className="btn btn-xs btn-ghost" onClick={() => setEditModal(t)}>تعديل</button>}
                    {canDelete && <button className="btn btn-xs btn-danger" onClick={() => handleDelete(t.id)}>حذف</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <TaskModal open={taskModal} onClose={() => setTaskModal(false)} onSuccess={load} forceBonus={activeTab === 'bonus'} />
      <ImportModal open={importModal} onClose={() => setImportModal(false)} onSuccess={load} />
      <DriveModal open={!!driveModal} onClose={() => setDriveModal(null)} onSubmit={handleDriveSubmit} taskTitle={driveModal?.taskTitle ?? ''} />
      <EditTaskModal open={!!editModal} task={editModal} onClose={() => setEditModal(null)} onSuccess={load} />
      <TwitterModal
        open={!!twitterModal}
        onClose={() => setTwitterModal(null)}
        onSubmit={handleTwitterSubmit}
        onSkip={() => handleTwitterSubmit('')}
      />
      <VideoCompleteModal
        open={!!videoModal}
        onClose={() => setVideoModal(null)}
        onSubmit={handleVideoSubmit}
        taskType={videoModal?.type}
        participants={(() => {
          const t = tasks.find(t => t.id === videoModal?.id);
          if (!t) return [];
          const primary = members.find(m => m.id === t.memberId);
          const team = (t.teamMemberIds ?? []).map(id => members.find(m => m.id === id)).filter(Boolean);
          return [primary, ...team].filter((m): m is NonNullable<typeof m> => !!m);
        })()}
      />

      {bonusModal && (
        <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) setBonusModal(null); }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-title">نقاط مكافأة</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
              {bonusModal.title || 'مهمة'} — النقاط الأساسية: {bonusModal.points ?? getDefaultPoints(bonusModal.type)}
            </p>
            {bonusModal.twitterUrl && (
              <div style={{ marginBottom: 16 }}>
                <a
                  href={bonusModal.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
                >
                  فتح التغريدة
                </a>
              </div>
            )}
            <div className="form-group">
              <label>نقاط المكافأة</label>
              <input type="number" min="0" value={bonusVal} onChange={e => setBonusVal(e.target.value)} />
            </div>
            <div className="form-group">
              <label>السبب (اختياري)</label>
              <input type="text" value={bonusNote} placeholder="مثال: تغريدة 20K+" onChange={e => setBonusNote(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={handleSaveBonus}>حفظ</button>
              <button className="btn btn-ghost" onClick={() => setBonusModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
