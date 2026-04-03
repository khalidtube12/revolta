export function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (!lines.length) return [];

  const first = lines[0];
  const sep = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';

  const result: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { cur += c; }
      } else {
        if (c === '"') { inQ = true; }
        else if (c === sep) { row.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
    }
    row.push(cur.trim());
    result.push(row);
  }
  return result;
}

export function escapeCSV(v: string): string {
  const s = String(v || '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s + '"' : s;
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportTasksXLSX(filename: string, rows: { member: string; task: string; details: string; deadline: string; priority: string; status: string; type: string }[]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('مهام');

  ws.columns = [
    { header: 'العضو',        key: 'member',   width: 20 },
    { header: 'التفاصيل',     key: 'details',  width: 35 },
    { header: 'تاريخ النشر', key: 'deadline', width: 18 },
    { header: 'الأولوية',     key: 'priority', width: 14 },
    { header: 'الحالة',       key: 'status',   width: 14 },
    { header: 'نوع المهمة',   key: 'type',     width: 16 },
  ];

  for (const r of rows) {
    const row = ws.addRow(r);
    const deadlineCell = row.getCell('deadline');
    if (r.deadline) {
      deadlineCell.value = new Date(r.deadline);
      deadlineCell.numFmt = 'yyyy-mm-dd';
    }
  }

  // Date validation on deadline column for all data rows
  for (let i = 2; i <= rows.length + 1; i++) {
    ws.getCell(`C${i}`).dataValidation = {
      type: 'date',
      allowBlank: true,
      operator: 'greaterThan',
      formulae: [new Date('2000-01-01') as unknown as string],
      showErrorMessage: true,
      errorTitle: 'تاريخ غير صحيح',
      error: 'أدخل تاريخاً صحيحاً',
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseXLSXBuffer(buffer: ArrayBuffer): Promise<string[][]> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const result: string[][] = [];
  ws.eachRow((row) => {
    const cells = (row.values as unknown[]).slice(1);
    result.push(cells.map(v => {
      if (v === null || v === undefined) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === 'object' && v !== null && 'text' in v) return String((v as { text: string }).text);
      return String(v);
    }));
  });
  return result;
}

export async function downloadTemplate(memberNames: string[] = []) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('مهام');

  ws.columns = [
    { header: 'العضو', key: 'member', width: 20 },
    { header: 'المهمة', key: 'task', width: 30 },
    { header: 'التفاصيل', key: 'details', width: 35 },
    { header: 'تاريخ النشر', key: 'deadline', width: 18 },
    { header: 'الأولوية', key: 'priority', width: 14 },
    { header: 'نوع المهمة', key: 'type', width: 16 },
  ];

  ws.addRow({ member: memberNames[0] ?? '', task: 'تصوير تيزر الحلقة', details: 'تصوير مقطع قصير للترويج', deadline: '2026-03-15', priority: 'متوسطة', type: 'مقطع' });

  if (memberNames.length > 0) {
    const formula = '"' + memberNames.join(',') + '"';
    for (let row = 2; row <= 200; row++) {
      ws.getCell(`A${row}`).dataValidation = { type: 'list', allowBlank: true, formulae: [formula], showErrorMessage: true, errorTitle: 'عضو غير صحيح', error: 'اختر اسماً من القائمة' };
    }
  }

  const prioFormula = '"منخفضة,متوسطة,عالية"';
  const typeFormula = '"شورت,مقطع,كتابة,محتوى X,بودكاست"';
  for (let row = 2; row <= 200; row++) {
    ws.getCell(`E${row}`).dataValidation = { type: 'list', allowBlank: true, formulae: [prioFormula], showErrorMessage: true, errorTitle: 'أولوية غير صحيحة', error: 'اختر: منخفضة أو متوسطة أو عالية' };
    ws.getCell(`F${row}`).dataValidation = { type: 'list', allowBlank: true, formulae: [typeFormula], showErrorMessage: true, errorTitle: 'نوع غير صحيح', error: 'اختر: شورت أو مقطع أو كتابة أو محتوى X أو بودكاست' };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Revolta_Import_Template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
