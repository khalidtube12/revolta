export function timeAgo(ts: number | undefined): string {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60000) return 'الآن';
  if (d < 3600000) return Math.floor(d / 60000) + ' دقيقة';
  if (d < 86400000) return Math.floor(d / 3600000) + ' ساعة';
  return Math.floor(d / 86400000) + ' يوم';
}

export function getTaskMonth(deadline?: string, createdAt?: number): string {
  if (deadline) return deadline.substring(0, 7);
  return new Date(createdAt || 0).toISOString().substring(0, 7);
}

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
export function isTitleLate(task: { createdAt: number; titleSetAt?: number; title: string; done: boolean }): boolean {
  if (task.done) return false;
  if (task.title?.trim()) return false;
  return (Date.now() - task.createdAt) > TWO_DAYS;
}

export function deadlineLabel(dl: string | undefined, done: boolean): { text: string; className: string } {
  if (!dl) return { text: '', className: '' };
  const d = new Date(dl);
  const diff = Math.ceil((d.getTime() - new Date().getTime()) / 86400000);
  if (done) return { text: '✓', className: '' };
  if (diff < 0) return { text: 'متأخر ' + Math.abs(diff) + ' يوم', className: 'dl-late' };
  if (diff <= 3) return { text: 'باقي ' + diff + ' يوم', className: 'dl-soon' };
  return { text: d.toLocaleDateString('ar', { month: 'short', day: 'numeric' }), className: '' };
}
