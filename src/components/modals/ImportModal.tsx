import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { useMembersStore } from '../../stores/membersStore';
import { useTasksStore } from '../../stores/tasksStore';
import { createNotification } from '../../services/notifications.service';
import { parseCSV, parseXLSXBuffer, downloadTemplate } from '../../utils/csv';
import type { ImportRow } from '../../types';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportModal({ open, onClose, onSuccess }: ImportModalProps) {
  const { members } = useMembersStore();
  const { addTask } = useTasksStore();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const PRIORITY_REV: Record<string, string> = { 'منخفضة': 'low', 'متوسطة': 'medium', 'عالية': 'high', low: 'low', medium: 'medium', high: 'high' };
  const PRIORITY_LABEL: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
  const TYPE_REV: Record<string, 'short' | 'video' | 'writing' | 'x_content' | 'podcast'> = { 'شورت': 'short', 'مقطع': 'video', 'كتابة': 'writing', 'محتوى X': 'x_content', 'محتوىX': 'x_content', 'بودكاست': 'podcast', short: 'short', video: 'video', writing: 'writing', x_content: 'x_content', podcast: 'podcast' };
  const TYPE_LABEL: Record<string, string> = { short: 'شورت', video: 'مقطع', writing: 'كتابة', x_content: 'محتوى X', podcast: 'بودكاست' };

  const processRows = (allRows: string[][]) => {
    if (allRows.length < 2) { setError('الملف فارغ أو لا يحتوي على بيانات'); return; }

    const hdr = allRows[0].map(h => h.replace(/["\s\u200B\u200C\u200D\uFEFF]/g, ''));
    const colFind = (tests: string[]) => hdr.findIndex(h => tests.some(t => h === t || h.includes(t)));
    let nameIdx = colFind(['العضو', 'عضو', 'Member']);
    let titleIdx = colFind(['المهمة', 'مهمة', 'Task']);
    let descIdx = colFind(['التفاصيل', 'تفاصيل', 'Details']);
    let deadIdx = colFind(['تاريخالنشر', 'تاريخ', 'النشر', 'الموعد', 'موعد', 'نهائي', 'Deadline']);
    let prioIdx = colFind(['الأولوية', 'أولوية', 'Priority']);
    const typeIdx = colFind(['نوعالمهمة', 'نوع', 'Type']);

    if (titleIdx === -1 && hdr.length >= 2) {
      nameIdx = 0; titleIdx = 1;
      descIdx = hdr.length > 2 ? 2 : -1;
      deadIdx = hdr.length > 3 ? 3 : -1;
      prioIdx = hdr.length > 4 ? 4 : -1;
    }
    if (titleIdx === -1) { setError('عمود "المهمة" غير موجود'); return; }

    const imported: ImportRow[] = [];
    for (let i = 1; i < allRows.length; i++) {
      const r = allRows[i];
      if (!r[titleIdx]?.trim()) continue;
      const memberName = nameIdx >= 0 ? (r[nameIdx] || '').trim() : '';
      const matched = memberName ? members.find(m => m.name.trim() === memberName) : null;
      const prio = (prioIdx >= 0 ? PRIORITY_REV[(r[prioIdx] || '').trim()] || 'medium' : 'medium') as 'low' | 'medium' | 'high';
      const taskType = typeIdx >= 0 ? TYPE_REV[(r[typeIdx] || '').trim()] : undefined;
      imported.push({
        memberName,
        memberId: matched ? matched.id : null,
        title: r[titleIdx].trim(),
        desc: descIdx >= 0 ? (r[descIdx] || '').trim() : '',
        deadline: deadIdx >= 0 ? (r[deadIdx] || '').trim() : '',
        priority: prio,
        type: taskType,
        error: memberName && !matched ? 'عضو غير موجود' : '',
      });
    }
    if (!imported.length) { setError('لا توجد مهام صالحة في الملف'); return; }
    setRows(imported);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setRows([]);

    const isXLSX = file.name.toLowerCase().endsWith('.xlsx');

    if (isXLSX) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const buffer = ev.target?.result as ArrayBuffer;
        const allRows = await parseXLSXBuffer(buffer);
        processRows(allRows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        let text = (ev.target?.result as string) || '';
        text = text.replace(/^\uFEFF/, '').replace(/\u0000/g, '').trim();
        processRows(parseCSV(text));
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const validCount = rows.filter(r => !r.error).length;
  const errCount = rows.filter(r => r.error).length;

  const handleImport = async () => {
    const valid = rows.filter(r => !r.error && r.memberId);
    if (!valid.length) { alert('لا توجد مهام صالحة للاستيراد'); return; }
    setLoading(true);
    try {
      for (const r of valid) {
        await addTask({
          memberId: r.memberId!,
          title: r.title,
          desc: r.desc,
          deadline: r.deadline,
          priority: r.priority,
          ...(r.type ? { type: r.type } : {}),
          done: false,
          createdAt: Date.now(),
        });
        createNotification({
          userId: r.memberId!,
          title: '📋 مهمة جديدة: ' + r.title,
          body: 'تم إسناد مهمة جديدة إليك' + (r.deadline ? ' — تاريخ النشر: ' + new Date(r.deadline).toLocaleDateString('ar') : ''),
          read: false,
          createdAt: Date.now(),
        }).catch(() => {});
      }
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
      title="استيراد مهام"
      maxWidth={700}
      footer={
        <>
          {validCount > 0 && (
            <button className="btn" disabled={loading} onClick={handleImport}>
              {loading ? <div className="spinner" /> : 'استيراد الكل'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <label className="btn" style={{ cursor: 'pointer', margin: 0 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFile} style={{ display: 'none' }} />
          اختر ملف
        </label>
        <button className="btn btn-ghost" onClick={() => downloadTemplate(members.map(m => m.name)).catch(() => {})}>تحميل نموذج فارغ</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fileName}</span>
      </div>

      {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}

      {rows.length > 0 && (
        <>
          <div className="err" style={{ marginBottom: 10 }}>
            <span style={{ color: 'var(--green)' }}>{validCount} مهمة صالحة</span>
            {errCount > 0 && <> &nbsp;|&nbsp; <span style={{ color: 'var(--red)' }}>{errCount} بها أخطاء (سيتم تخطيها)</span></>}
          </div>
          <div style={{ maxHeight: 340, overflow: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['#', 'العضو', 'المهمة', 'التفاصيل', 'تاريخ النشر', 'الأولوية', 'النوع'].map(h => (
                    <th key={h} style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={r.error ? { background: 'rgba(255,60,60,0.08)' } : undefined}>
                    <td style={{ padding: 8 }}>{i + 1}</td>
                    <td style={{ padding: 8 }}>
                      {r.memberName || '—'}
                      {r.error && <><br /><span style={{ color: 'var(--red)', fontSize: 11 }}>{r.error}</span></>}
                    </td>
                    <td style={{ padding: 8 }}>{r.title}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.desc || '—'}</td>
                    <td style={{ padding: 8 }}>{r.deadline || '—'}</td>
                    <td style={{ padding: 8 }}>{PRIORITY_LABEL[r.priority]}</td>
                    <td style={{ padding: 8 }}>{r.type ? TYPE_LABEL[r.type] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
