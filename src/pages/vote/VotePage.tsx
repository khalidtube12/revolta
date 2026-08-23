import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { secondaryAuth, secondaryDb } from '../../services/firebase';
import { subscribeToPoll, subscribeToPollResults, castVote } from '../../services/polls.service';
import type { Poll, PollResults } from '../../services/polls.service';
import revoltaLogo from '../../assets/revolta-logo.png';
import './VotePage.css';

function formatExpiry(expiresAt: number): { text: string; endingSoon: boolean } {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return { text: 'انتهى التصويت', endingSoon: false };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return { text: `ينتهي خلال ${days} يوم${days > 1 ? '' : ''}`, endingSoon: days <= 1 };
  return { text: `ينتهي خلال ${hours} ساعة`, endingSoon: true };
}

export function VotePage() {
  const { pollId } = useParams<{ pollId: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults>({ counts: {}, voters: {} });
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Anonymous sign-in — always authenticate, use localStorage uid for vote tracking
  useEffect(() => {
    signInAnonymously(secondaryAuth)
      .then(cred => {
        const firebaseUid = cred.user.uid;
        const stored = localStorage.getItem('revolta_voter_uid');
        // Use stored uid if exists (preserves vote history), else use firebase uid
        const effectiveUid = stored || firebaseUid;
        if (!stored) localStorage.setItem('revolta_voter_uid', firebaseUid);
        setUid(effectiveUid);
      })
      .catch(() => setUid(null));
  }, []);

  // Subscribe to poll + results — only after uid is ready
  useEffect(() => {
    if (!pollId || uid === null) return;
    let unsubPoll: (() => void) | undefined;
    let unsubResults: (() => void) | undefined;

    unsubPoll = subscribeToPoll(pollId, p => {
      if (!p) { setNotFound(true); setLoading(false); return; }
      setPoll(p);
      setLoading(false);
    }, secondaryDb);
    unsubResults = subscribeToPollResults(pollId, r => setResults(r), secondaryDb);

    return () => { unsubPoll?.(); unsubResults?.(); };
  }, [pollId, uid]);

  const myVoteRaw = uid ? results.voters?.[uid] : undefined;
  const myVotes: string[] = myVoteRaw ? myVoteRaw.split(',') : [];
  const hasVoted = myVotes.length > 0;
  const isExpired = poll ? Date.now() > poll.expiresAt : false;
  const totalVotes = Object.values(results.counts ?? {}).reduce((a, b) => a + b, 0);
  const maxChoices = poll?.maxChoices ?? 1;
  const isMultiChoice = maxChoices > 1;

  const optionsSorted = poll
    ? Object.entries(poll.options).sort((a, b) => {
        const numA = parseInt(a[1].name.match(/\d+/)?.[0] ?? '0');
        const numB = parseInt(b[1].name.match(/\d+/)?.[0] ?? '0');
        return numA - numB;
      })
    : [];

  const leadingId = optionsSorted[0]?.[0];

  const handleCardClick = (optionId: string) => {
    if (hasVoted || isExpired || voting) return;
    if (!uid) {
      setVoteError('فشل تحميل الجلسة. تأكد من الاتصال بالإنترنت وأعد تحميل الصفحة.');
      return;
    }
    if (!isMultiChoice) {
      handleSubmitVote([optionId]);
    } else {
      setSelectedOptions(prev => {
        if (prev.includes(optionId)) return prev.filter(id => id !== optionId);
        if (prev.length >= maxChoices) return prev;
        return [...prev, optionId];
      });
    }
  };

  const handleSubmitVote = async (ids: string[]) => {
    if (!pollId || hasVoted || isExpired || voting || ids.length === 0) return;
    if (!uid) {
      setVoteError('فشل تحميل الجلسة. تأكد من الاتصال بالإنترنت وأعد تحميل الصفحة.');
      return;
    }
    setVoting(true);
    setVoteError('');
    try {
      await castVote(pollId, ids, uid, secondaryDb);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('already_voted')) setVoteError(msg);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="vote-page">
        <div className="vote-loading">
          <div className="vote-loading-text">REVOLTA</div>
          <div className="vote-loading-bar"><div className="vote-loading-bar-fill" /></div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (notFound || !poll) {
    return (
      <div className="vote-page">
        <div className="vote-expired">
          <div className="vote-expired-icon">404</div>
          <h2>التصويت غير موجود</h2>
          <p>الرابط غير صحيح أو تم حذف هذا التصويت.</p>
        </div>
      </div>
    );
  }

  if (isExpired && !hasVoted) {
    return (
      <div className="vote-page">
        <div className="vote-header">
          <div className="vote-brand">REVOLTA POLLS</div>
          <h1>{poll.title}</h1>
        </div>
        <div className="vote-expired">
          <div className="vote-expired-icon">ENDED</div>
          <h2>انتهت فترة التصويت</h2>
          <p>انتهى هذا التصويت. شكراً لجميع المشاركين!</p>
          {totalVotes > 0 && (
            <p style={{ marginTop: 12, color: 'var(--gold)', fontFamily: 'Oswald', fontSize: 16 }}>
              {totalVotes} صوت إجمالي
            </p>
          )}
        </div>
      </div>
    );
  }

  const expiryInfo = formatExpiry(poll.expiresAt);

  return (
    <div className="vote-page">
      {/* Header */}
      <div className="vote-header">
        <img src={revoltaLogo} alt="Revolta" className="vote-logo" />
        <div className="vote-brand">REVOLTA POLLS</div>
        <h1>{poll.title}</h1>
        {poll.description && <p>{poll.description}</p>}
        <div className={`vote-expiry ${expiryInfo.endingSoon ? 'ending-soon' : ''}`}>
          ⏱ {expiryInfo.text}
        </div>
      </div>

      {/* Content */}
      <div className="vote-content">
        {/* Instruction */}
        {!hasVoted && !isExpired && (
          <div className="vote-instruction">
            <span>
              {isMultiChoice
                ? `اختر حتى ${maxChoices} خيارات للتصويت`
                : 'اختر خياراً واحداً للتصويت'}
            </span>
          </div>
        )}


        {/* Error */}
        {voteError && (
          <div style={{ textAlign: 'center', marginBottom: 20, padding: '10px 16px', border: '1px solid rgba(139,0,0,0.4)', background: 'rgba(139,0,0,0.1)', color: '#ff6666', fontSize: 13, direction: 'ltr', wordBreak: 'break-all' }}>
            {voteError}
          </div>
        )}

        {/* Grid */}
        <div className="vote-grid">
          {optionsSorted.map(([optionId, option], idx) => {
            const count = results.counts?.[optionId] ?? 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isMyVote = myVotes.includes(optionId);
            const isLeading = optionId === leadingId && totalVotes > 0;
            const isSelected = !hasVoted && isMultiChoice && selectedOptions.includes(optionId);
            const isMaxReached = isMultiChoice && selectedOptions.length >= maxChoices && !isSelected;

            let cardClass = 'stage-card';
            if (hasVoted || isExpired) {
              cardClass += isMyVote ? ' voted' : ' other-voted';
            } else if (isSelected) {
              cardClass += ' selected';
            } else if (isMaxReached) {
              cardClass += ' dimmed';
            }

            return (
              <div
                key={optionId}
                className={cardClass}
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => handleCardClick(optionId)}
              >
                {/* Image */}
                <div className="stage-img-wrap">
                  {option.imageUrl
                    ? <img src={option.imageUrl} alt={option.name} loading="lazy" />
                    : <div className="stage-img-placeholder">{option.name.charAt(0)}</div>
                  }
                  {isMyVote && (
                    <div className="stage-voted-stamp"><span>صوتك</span></div>
                  )}
                  {isSelected && (
                    <div className="stage-selected-stamp"><span>✓</span></div>
                  )}
                </div>

                {/* Info */}
                <div className="stage-info">
                  <div className="stage-name">{option.name}</div>

                  {(hasVoted || isExpired) && (
                    <div className="stage-bar-wrap">
                      <div className="stage-bar-meta">
                        <span className="stage-bar-pct">{pct}%</span>
                        <span className="stage-bar-votes">{count} صوت</span>
                      </div>
                      <div className="stage-bar-track">
                        <div
                          className={`stage-bar-fill ${isLeading ? 'leading' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!hasVoted && !isExpired && !isMultiChoice && (
                    <button
                      className="stage-vote-btn"
                      onClick={e => { e.stopPropagation(); handleCardClick(optionId); }}
                      disabled={voting}
                    >
                      {voting ? '...' : 'صوّت'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-choice submit bar */}
        {isMultiChoice && !hasVoted && !isExpired && (
          <div className="vote-submit-bar">
            <span className="vote-submit-count">
              {selectedOptions.length === 0
                ? `اختر حتى ${maxChoices} خيارات`
                : `اخترت ${selectedOptions.length} من ${maxChoices}`}
            </span>
            <button
              className="btn"
              disabled={selectedOptions.length === 0 || voting}
              onClick={() => handleSubmitVote(selectedOptions)}
            >
              {voting ? '...' : 'تأكيد التصويت'}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="vote-footer">
        POWERED BY <span>REVOLTA</span>
      </div>
    </div>
  );
}
