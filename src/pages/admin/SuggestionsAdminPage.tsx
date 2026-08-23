import { useEffect, useState, useCallback } from 'react';
import { getAllSuggestions, deleteSuggestion } from '../../services/suggestions.service';
import type { Suggestion } from '../../services/suggestions.service';
import { Spinner } from '../../components/ui/Spinner';

export function SuggestionsAdminPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setSuggestions(await getAllSuggestions());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الاقتراح نهائياً؟')) return;
    await deleteSuggestion(id);
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 4 }}>
            الاقتراحات
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{suggestions.length} اقتراح</p>
        </div>
        <button className="btn btn-ghost" onClick={load} style={{ fontSize: 12 }}>↻ تحديث</button>
      </div>

      {loading ? <Spinner /> : suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
          لا توجد اقتراحات بعد
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map(s => (
            <div key={s.id} style={{
              background: '#0c0c0c',
              border: '1px solid #1e1e1e',
              borderRight: '3px solid rgba(201,168,76,0.5)',
              padding: '18px 20px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 16,
              alignItems: 'start',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--gold)' }}>{s.socialHandle}</span>
                </div>

                <div style={{
                  fontSize: 13, color: '#aaa', lineHeight: 1.8,
                  padding: '10px 12px', background: '#090909',
                  borderRight: '2px solid #2a2a2a',
                  fontFamily: 'Cairo, sans-serif', whiteSpace: 'pre-wrap',
                }}>
                  {s.text}
                </div>

                <div style={{ fontSize: 11, color: '#444' }}>
                  {new Date(s.submittedAt).toLocaleDateString('ar-SA', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>

              <button
                style={{
                  background: 'none', border: '1px solid #1e1e1e', color: '#444',
                  fontSize: 11, padding: '6px 14px', cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif', transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.color = 'var(--red)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(139,0,0,0.4)';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.color = '#444';
                  (e.target as HTMLElement).style.borderColor = '#1e1e1e';
                }}
                onClick={() => handleDelete(s.id)}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
