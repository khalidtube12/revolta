import type { Task, User, Idea, TaskStatus } from '../../types';
import { STATUS_MAP, PRIORITY_MAP, PRIORITY_COLORS } from '../../types';
import { getStatus } from '../../utils/status';
import { deadlineLabel } from '../../utils/date';
import './TaskRowV2.css';

interface TaskRowV2Props {
  task: Task;
  members?: User[];
  showMember?: boolean;
  isAdmin?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  canSetIncomplete?: boolean;
  canChangeStatus?: boolean;
  canManageBonus?: boolean;
  readOnly?: boolean;
  ideas?: Idea[];
  onToggle?: (id: string, wasResolved: boolean) => void;
  onChangeStatus?: (id: string, status: TaskStatus) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onBonus?: (task: Task) => void;
}

export function TaskRowV2({
  task, members = [], showMember, isAdmin, canDelete, canEdit, canSetIncomplete, canChangeStatus, canManageBonus, readOnly, ideas = [],
  onToggle, onChangeStatus, onDelete, onEdit, onBonus,
}: TaskRowV2Props) {
  const m = members.find(u => u.id === task.memberId);
  const dl = deadlineLabel(task.deadline, task.done);
  const st = getStatus(task);
  const si = STATUS_MAP[st] || STATUS_MAP.pending;
  const isDone = st === 'done' || st === 'ready' || st === 'published';
  const isCancelled = st === 'cancelled';
  const isResolved = isDone || isCancelled;
  const pc = PRIORITY_COLORS[task.priority || 'medium'];
  const pt = PRIORITY_MAP[task.priority || 'medium'];
  const linkedIdea = task.linkedIdeaId ? ideas.find(i => i.id === task.linkedIdeaId) : null;

  return (
    <div className={`task-row-v2 ${si.cls}`}>
      <div
        className={`trv2-check ${isDone ? 'checked' : ''}`}
        onClick={() => !readOnly && onToggle?.(task.id, isResolved)}
        style={readOnly ? { opacity: 0.3, cursor: 'default', pointerEvents: 'none' } : undefined}
      />
      <div className="trv2-body">
        <div className="trv2-title">{task.title}</div>
        {task.desc && <div className="trv2-desc">{task.desc}</div>}
        <div className="trv2-meta">
          {showMember && m && <span className="badge badge-gray">{m.name}</span>}
          {dl.text && (
            <span className={`trv2-date ${dl.className}`}>📅 {dl.text}</span>
          )}
          <span className="trv2-priority" style={{ color: pc }}>
            {pt}
          </span>
          {task.type && (
            <span className={`badge ${
              task.type === 'short' ? 'badge-gold' :
              task.type === 'video' ? 'badge-green' :
              task.type === 'writing' ? 'badge-gray' :
              task.type === 'podcast' ? 'badge-gold' :
              'badge-red'
            }`}>
              {task.type === 'short' ? 'شورت' : task.type === 'video' ? 'مقطع' : task.type === 'writing' ? 'كتابة' : task.type === 'podcast' ? 'بودكاست' : 'محتوى X'}
            </span>
          )}
          {task.teamMemberIds && task.teamMemberIds.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {task.teamMemberIds.map(tid => {
                const tm = members.find(u => u.id === tid);
                if (!tm) return null;
                return (
                  <span
                    key={tid}
                    title={tm.name}
                    style={{
                      width: 20, height: 20, fontSize: 10, fontWeight: 700,
                      background: tm.color || 'var(--border2)',
                      color: '#fff', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {tm.name.charAt(0)}
                  </span>
                );
              })}
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>تيم</span>
            </span>
          )}
          {task.driveLink && (
            <a href={task.driveLink} target="_blank" rel="noopener noreferrer"
              className="trv2-drive"
              onClick={e => e.stopPropagation()}>
              📁 Drive
            </a>
          )}
          {linkedIdea && (
            <span className="trv2-idea">
              💡 {linkedIdea.text.length > 20 ? linkedIdea.text.slice(0, 20) + '…' : linkedIdea.text}
            </span>
          )}
        </div>
      </div>
      <div className="trv2-actions">
        {readOnly ? (
          <span className={`badge ${si.badge}`}>{si.label}</span>
        ) : isAdmin ? (
          <>
            <select
              className="trv2-status-select"
              value={st}
              onChange={e => onChangeStatus?.(task.id, e.target.value as TaskStatus)}
            >
              <option value="pending">معلقة</option>
              <option value="done">مكتملة</option>
              <option value="ready">جاهز للنشر</option>
              <option value="published">تم النشر</option>
              <option value="cancelled">ملغية</option>
            </select>
            {!task.isBonus && onBonus && <button className="btn btn-xs btn-ghost" onClick={() => onBonus(task)}>مكافأة</button>}
            {onEdit && <button className="btn btn-xs btn-ghost" onClick={() => onEdit(task)}>تعديل</button>}
            {onDelete && <button className="btn btn-xs btn-danger" onClick={() => onDelete(task.id)}>حذف</button>}
          </>
        ) : (
          <>
            {canChangeStatus ? (
              <select
                className="trv2-status-select"
                value={st}
                onChange={e => onChangeStatus?.(task.id, e.target.value as TaskStatus)}
              >
                <option value="pending">معلقة</option>
                <option value="done">مكتملة</option>
                <option value="ready">جاهز للنشر</option>
                <option value="published">تم النشر</option>
                <option value="cancelled">ملغية</option>
              </select>
            ) : canSetIncomplete ? (
              <select
                className="trv2-status-select"
                value={st}
                onChange={e => onChangeStatus?.(task.id, e.target.value as TaskStatus)}
              >
                <option value="pending">معلقة</option>
                <option value="cancelled">ملغية</option>
              </select>
            ) : (
              <span className={`badge ${si.badge}`}>{si.label}</span>
            )}
            {!task.isBonus && canManageBonus && onBonus && (
              <button className="btn btn-xs btn-ghost" onClick={() => onBonus(task)}>مكافأة</button>
            )}
            {(canEdit || isAdmin) && onEdit && (
              <button className="btn btn-xs btn-ghost" onClick={() => onEdit(task)}>تعديل</button>
            )}
            {canDelete && onDelete && (
              <button className="btn btn-xs btn-danger" onClick={() => onDelete(task.id)}>حذف</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
