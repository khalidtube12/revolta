import { Modal } from './Modal';
import type { Task } from '../../types';

interface LinkTaskModalProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onPick: (taskId: string | null) => void;
}

export function LinkTaskModal({ open, onClose, tasks, onPick }: LinkTaskModalProps) {
  const typeLabels: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ربط الفكرة بمهمة"
      maxWidth={480}
      footer={
        <button className="btn btn-ghost" onClick={() => { onPick(null); onClose(); }}>بدون ربط</button>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        اختر المهمة المعلقة لربطها بالفكرة
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
        {tasks.map(t => (
          <button
            key={t.id}
            className="btn"
            style={{ textAlign: 'right', padding: '12px 16px', justifyContent: 'flex-start', width: '100%' }}
            onClick={() => { onPick(t.id); onClose(); }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {typeLabels[t.type || ''] || 'بدون نوع'}{t.deadline ? ' · ' + t.deadline : ''}
              </div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
