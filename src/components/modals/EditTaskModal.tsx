import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useTasksStore } from '../../stores/tasksStore';
import type { Task } from '../../types';

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const TASK_TYPES = [
  { value: 'short',     label: 'شورت' },
  { value: 'video',     label: 'مقطع' },
  { value: 'writing',   label: 'كتابة' },
  { value: 'x_content', label: 'محتوى X' },
  { value: 'podcast',   label: 'بودكاست' },
];

export function EditTaskModal({ open, task, onClose, onSuccess }: EditTaskModalProps) {
  const { updateTask } = useTasksStore();
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [type, setType]         = useState('short');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.desc || '');
      setDeadline(task.deadline || '');
      setPriority(task.priority || 'medium');
      setType(task.type || 'short');
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    setLoading(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        desc: desc.trim(),
        deadline,
        priority: priority as 'low' | 'medium' | 'high',
        type: type as Task['type'],
      });
      onClose();
      onSuccess?.();
    } catch (e: unknown) {
      alert('خطأ: ' + (e instanceof Error ? e.message : e));
    }
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تعديل المهمة"
      footer={
        <>
          <button className="btn" disabled={loading} onClick={handleSave}>
            {loading ? <div className="spinner" /> : 'حفظ'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <div className="form-group">
        <label>عنوان المهمة</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>التفاصيل</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
      <div className="form-group">
        <label>تاريخ النشر</label>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </div>
      <div className="form-group">
        <label>نوع المهمة</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>الأولوية</label>
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="low">منخفضة</option>
          <option value="medium">متوسطة</option>
          <option value="high">عالية</option>
        </select>
      </div>
    </Modal>
  );
}
