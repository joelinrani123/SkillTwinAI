import { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner, EmptyState, Alert } from '../components/UI';
import { api } from '../services/api';

// Neutral result colours — NO neon, no traffic-light system
const resultBg    = s => 'var(--surface-2)';
const resultBdr   = s => 'var(--border)';
const scoreClr = s => s >= 60 ? '#16a34a' : '#dc2626';

export default function TestsPage({ user, onRefresh }) {
  const [phase,         setPhase]         = useState('select');
  const [questions,     setQuestions]     = useState([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [current,       setCurrent]       = useState(0);
  const [answers,       setAnswers]       = useState({});
  const [result,        setResult]        = useState(null);
  const [history,       setHistory]       = useState([]);
  const [removedIds,    setRemovedIds]    = useState(new Set());
  const [expandedHist,  setExpandedHist]  = useState(new Set());
  const [userSkills,    setUserSkills]    = useState([]);
  const [loadingQ,      setLoadingQ]      = useState(false);
  const [timeLeft,      setTimeLeft]      = useState(0);
  const [startTime,     setStartTime]     = useState(null);
  const [err,           setErr]           = useState('');
  const [saving,        setSaving]        = useState(false);
  const [newSkillLevel, setNewSkillLevel] = useState(null);
  const timerRef   = useRef(null);

  // ── Anti-cheat state ──────────────────────────────
  const [cheatCount,      setCheatCount]      = useState(0);
  const [cheatPenalty,    setCheatPenalty]    = useState(0); // total % deducted
  const [cheatWarning,    setCheatWarning]    = useState('');
  const cheatCountRef     = useRef(0);
  const cheatPenaltyRef   = useRef(0);
  const cheatWarningTimer = useRef(null);

  useEffect(() => {
    api.tests.getSkills().then(d => setUserSkills(d.skills || [])).catch(() => {});
    api.users.getTests().then(d => setHistory(d.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Anti-cheat: tab/window visibility detection ───
  useEffect(() => {
    if (phase !== 'active') return;

    const showWarning = (msg) => {
      setCheatWarning(msg);
      clearTimeout(cheatWarningTimer.current);
      cheatWarningTimer.current = setTimeout(() => setCheatWarning(''), 4000);
    };

    const penalise = () => {
      cheatCountRef.current += 1;
      cheatPenaltyRef.current += 5; // 5% per violation
      setCheatCount(cheatCountRef.current);
      setCheatPenalty(cheatPenaltyRef.current);
      showWarning(`⚠️ Tab switch detected! -5% penalty applied. (${cheatCountRef.current} violation${cheatCountRef.current > 1 ? 's' : ''})`);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) penalise();
    };

    const handleBlur = () => {
      // window blur = switched to another app/tab
      penalise();
    };

    // Right-click / context menu disabled during test
    const handleContextMenu = (e) => {
      e.preventDefault();
      showWarning('⚠️ Right-click is disabled during the assessment.');
    };

    // Copy/paste/cut disabled
    const handleCopy = (e) => {
      e.preventDefault();
      showWarning('⚠️ Copying is not allowed during the assessment.');
    };

    // DevTools shortcut prevention
    const handleKeyDown = (e) => {
      const forbidden = (
        (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || // DevTools
        (e.ctrlKey && ['u','U'].includes(e.key)) ||                   // View source
        e.key === 'F12'                                               // DevTools
      );
      if (forbidden) {
        e.preventDefault();
        showWarning('⚠️ Developer tools are not allowed during the assessment.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(cheatWarningTimer.current);
    };
  }, [phase]);

  const startTest = async (skill) => {
    setLoadingQ(true); setErr(''); setSelectedSkill(skill);
    try {
      const d  = await api.tests.getQuestions(skill);
      const raw = d.questions || [];
      if (!raw.length) { setErr('No questions available. Please try again.'); setLoadingQ(false); return; }
      // Shuffle questions so each attempt is different
      const shuffled = [...raw].sort(() => Math.random() - 0.5);
      // Also shuffle options within each question (track correct answer by value not index)
      const qs = shuffled.map(q => {
        const opts = [...q.options];
        const correctAnswer = q.correctAnswer || opts[q.correctIndex] || opts[0];
        // Shuffle options
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        const newCorrectIndex = opts.indexOf(correctAnswer);
        return { ...q, options: opts, correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0 };
      });
      setQuestions(qs); setAnswers({}); setCurrent(0);
      setTimeLeft(qs.length * 75);
      setStartTime(Date.now());
      cheatCountRef.current   = 0;
      cheatPenaltyRef.current = 0;
      setCheatCount(0);
      setCheatPenalty(0);
      setCheatWarning('');
      setPhase('active');
    } catch (e) { setErr(e.message || 'Failed to load questions'); }
    finally { setLoadingQ(false); }
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    let correct = 0;
    const questionDetails = questions.map((q, i) => {
      const chosenIdx  = answers[i] !== undefined ? answers[i] : null;
      const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
      const isCorrect  = chosenIdx === correctIdx;
      if (isCorrect) correct++;
      return { question: q.question, options: q.options, correctIndex: correctIdx, correctAnswer: q.correctAnswer || q.options[correctIdx], chosenIndex: chosenIdx, chosenAnswer: chosenIdx !== null ? q.options[chosenIdx] : null, isCorrect };
    });
    const rawScore    = Math.round((correct / questions.length) * 100);
    const score       = Math.max(0, rawScore - cheatPenaltyRef.current);
    const realTimeTaken = Math.round((Date.now() - (startTime || Date.now())) / 1000);
    setSaving(true);
    try {
      const res = await api.tests.submit({
        skill: selectedSkill, score, correct, total: questions.length,
        timeTaken: realTimeTaken, questions: questionDetails,
      }).catch(() => api.users.saveTest({ skill: selectedSkill, score, correct, total: questions.length, timeTaken: realTimeTaken, questions: questionDetails }));
      setNewSkillLevel(res?.skillLevel ?? null);
      if (onRefresh) await onRefresh();
      const hist = await api.users.getTests();
      const rawHistory = hist.results || [];
      const merged = rawHistory.map((entry, i) => {
        if (i === 0 && entry.skill === selectedSkill && !entry.questionDetails?.length) return { ...entry, questionDetails };
        return entry;
      });
      setHistory(merged);
      await api.tests.getSkills().then(d => setUserSkills(d.skills || [])).catch(() => {});
    } catch (e) { console.error('Save error:', e); }
    setSaving(false);
    setResult({ score, correct, total: questions.length, skill: selectedSkill, questionDetails, realTimeTaken, rawScore, penaltyApplied: cheatPenaltyRef.current, violations: cheatCountRef.current });
    setPhase('result');
  };

  // ── Abandon test: submit with heavy penalty if user navigates away mid-test ──
  // IMPORTANT: This useRef and useEffect MUST be before any early return to obey React hooks rules
  const abandonedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'active') return;
    abandonedRef.current = false; // reset on each new active phase
    const handleAbandon = async () => {
      if (abandonedRef.current) return;
      abandonedRef.current = true;
      clearInterval(timerRef.current);
      const questionDetails = questions.map((q, i) => ({
        question: q.question, options: q.options,
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        correctAnswer: q.correctAnswer || q.options[q.correctIndex] || '',
        chosenIndex: null, chosenAnswer: null, isCorrect: false,
      }));
      const answered = Object.keys(answers).length;
      const correct = Object.values(answers).filter((a, qi) => a === questions[qi]?.correctIndex).length;
      const rawScore = Math.round((correct / Math.max(questions.length, 1)) * 100);
      const score = Math.max(0, rawScore - cheatPenaltyRef.current);
      try {
        await api.tests.submit({
          skill: selectedSkill, score, correct: 0, total: questions.length, abandoned: true,
          timeTaken: Math.round((Date.now() - (startTime || Date.now())) / 1000),
          questions: questionDetails,
        }).catch(() => api.users.saveTest({ skill: selectedSkill, score, correct: 0, total: questions.length, timeTaken: 0, questions: questionDetails }));
      } catch {}
    };
    window.addEventListener('beforeunload', handleAbandon);
    return () => { window.removeEventListener('beforeunload', handleAbandon); };
  }, [phase, questions, answers, selectedSkill, startTime]);

  // ── Block SPA nav clicks (navbar/sidebar links) during active test ───────
  useEffect(() => {
    if (phase !== 'active') return;

    const handleNavClick = async (e) => {
      // Match any clickable nav element that could switch the page
      const navEl = e.target.closest('nav button, nav a, header button, header a, [data-nav]');
      if (!navEl) return;
      // Allow the Leave Test button itself — it handles its own logic
      if (navEl.dataset && navEl.dataset.leaveTest) return;
      if (navEl.closest && navEl.closest('[data-leave-test]')) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const confirmed = window.confirm(
        '\u26a0\ufe0f Leaving the test now will submit it with a penalty score.\n\nYour answers so far will be graded with a maximum of 30% for incomplete tests.\n\nAre you sure you want to leave?'
      );
      if (!confirmed) return;

      if (abandonedRef.current) return;
      abandonedRef.current = true;
      clearInterval(timerRef.current);

      const questionDetails = questions.map((q, i) => ({
        question: q.question, options: q.options,
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        correctAnswer: q.correctAnswer || q.options[q.correctIndex] || '',
        chosenIndex: answers[i] !== undefined ? answers[i] : null,
        chosenAnswer: answers[i] !== undefined ? q.options[answers[i]] : null,
        isCorrect: answers[i] === q.correctIndex,
      }));
      const answered = Object.keys(answers).length;
      const correct2 = Object.values(answers).filter((a, qi) => a === questions[qi]?.correctIndex).length;
      const rawScore = Math.round((correct2 / Math.max(questions.length, 1)) * 100);
      const score = Math.max(0, rawScore - cheatPenaltyRef.current);

      try {
        await api.tests.submit({
          skill: selectedSkill, score, correct: 0, total: questions.length, abandoned: true,
          timeTaken: Math.round((Date.now() - (startTime || Date.now())) / 1000),
          questions: questionDetails,
        }).catch(() => api.users.saveTest({ skill: selectedSkill, score, correct: 0, total: questions.length, timeTaken: 0, questions: questionDetails }));
        if (onRefresh) await onRefresh();
      } catch {}

      setResult({ score, correct: 0, total: questions.length, skill: selectedSkill, questionDetails, abandoned: true });
      setPhase('result');

      // Fire a new click now that we've switched phase (no longer intercepted)
      setTimeout(() => navEl.click(), 50);
    };

    document.addEventListener('click', handleNavClick, true); // capture phase = fires before React handlers
    return () => { document.removeEventListener('click', handleNavClick, true); };
  }, [phase, questions, answers, selectedSkill, startTime]);

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const q = questions[current];

  /* ══════════════════════════════════════════════
     SELECT PHASE — redesigned skill grid
  ══════════════════════════════════════════════ */
  if (phase === 'select') return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2>Assessments</h2>
        <p style={{ color: 'var(--ink-3)', marginTop: 6, fontSize: 15 }}>
          Take a 20-question test for any skill you've added. Your proficiency level updates automatically after each attempt.
        </p>
      </div>

      {err && <Alert type="error" style={{ marginBottom: 18 }}>{err}</Alert>}

      {/* Info strip */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          ['20 questions', 'per assessment'],
          ['~25 minutes', 'estimated time'],
          ['Auto-scored', 'instant results'],
          ['Smart-tracked', 'skill levels'],
        ].map(([val, lbl]) => (
          <div key={val} style={{ flex: 1, minWidth: 120, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', marginBottom: 3 }}>{val}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {userSkills.length === 0 ? (
        <EmptyState icon="📝" title="No skills added yet"
          description="Add your skills first in the My Skills section. Assessments are available for every skill you track."
          action={<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>Go to My Skills to get started</span>} />
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {userSkills.length} skill{userSkills.length !== 1 ? 's' : ''} available
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 36 }}>
            {userSkills.map(skill => {
              const skillTests = history.filter(t => t.skill?.toLowerCase() === skill.toLowerCase());
              const best       = skillTests.length ? Math.max(...skillTests.map(t => t.score)) : null;
              const attempts   = skillTests.length;
              const skillObj   = user?.skills?.find(s => s.name.toLowerCase() === skill.toLowerCase());

              return (
                <button key={skill} onClick={() => startTest(skill)} disabled={loadingQ}
                  style={{
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    padding: '20px 18px',
                    textAlign: 'left',
                    cursor: loadingQ ? 'not-allowed' : 'pointer',
                    transition: 'all 0.14s',
                    fontFamily: 'inherit',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!loadingQ) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = ''; }}
                >
                  {best !== null && best >= 70 && (
                    <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} title="70%+ achieved" />
                  )}
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>{skill}</div>
                  {skillObj && (
                    <div style={{ marginBottom: 8 }}>
                      <div className="progress-bar" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${skillObj.level}%` }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Level: {skillObj.level}%</div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>20 questions</div>
                  {best !== null && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)', fontWeight: 700 }}>
                      Best: {best}% · {attempts} attempt{attempts !== 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Test History */}
      {history.filter(t => !removedIds.has(t._id || t.date)).length > 0 && (
        <div className="card">
          <div className="section-header">
            <h3>Test History</h3>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{history.filter(t => !removedIds.has(t._id || t.date)).length} records</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.filter(t => !removedIds.has(t._id || t.date)).map((t, i) => {
              const key        = t._id || t.date || i;
              const isExpanded = expandedHist.has(key);
              return (
                <div key={key} style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <button onClick={() => setExpandedHist(s => { const n = new Set(s); isExpanded ? n.delete(key) : n.add(key); return n; })}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{t.skill}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                          {t.correct}/{t.total} correct · {new Date(t.createdAt || t.date).toLocaleDateString()}
                          {(t.questionDetails?.length > 0 || t.questions?.length > 0) && (
                            <span style={{ marginLeft: 8, color: 'var(--ink-2)', fontWeight: 600 }}>
                              {isExpanded ? '▲ Hide review' : '▼ View Q&A'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: scoreClr(t.score) }}>{t.score}%</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {t.correct} / {t.total} correct
                        </div>
                      </div>
                      <button onClick={() => setRemovedIds(s => new Set([...s, key]))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, lineHeight: 1, padding: '4px', borderRadius: 4 }} title="Remove">×</button>
                    </div>
                  </div>

                  {/* Expanded Q&A review */}
                  {isExpanded && (t.questionDetails?.length > 0 || t.questions?.length > 0) && (
                    <div style={{ borderTop: '1.5px solid var(--border)', padding: '16px 16px 18px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-3)', marginBottom: 12 }}>
                        Answer Review
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(t.questionDetails || t.questions || []).map((q, qi) => (
                          <div key={qi} style={{ padding: '14px 16px', borderRadius: 8, border: `1.5px solid ${q.isCorrect ? 'rgba(22,163,74,0.30)' : 'rgba(220,38,38,0.20)'}`, background: q.isCorrect ? 'rgba(22,163,74,0.05)' : 'rgba(220,38,38,0.03)' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--ink)', lineHeight: 1.55 }}>
                              <span style={{ fontSize: 12, color: 'var(--ink-3)', marginRight: 8 }}>Q{qi + 1}</span>
                              {q.question}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {(q.options || []).map((opt, oi) => {
                                const isCorrect = oi === q.correctIndex;
                                const isChosen  = oi === q.chosenIndex;
                                const isWrong   = isChosen && !isCorrect;
                                return (
                                  <div key={oi} style={{
                                    fontSize: 13.5, padding: '7px 13px', borderRadius: 6,
                                    background: isCorrect ? 'rgba(22,163,74,0.12)' : isWrong ? 'rgba(220,38,38,0.10)' : 'transparent',
                                    color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : 'var(--ink-3)',
                                    fontWeight: isCorrect || isChosen ? 700 : 400,
                                    border: isCorrect ? '1px solid rgba(22,163,74,0.30)' : isWrong ? '1px solid rgba(220,38,38,0.25)' : '1px solid transparent',
                                  }}>
                                    <span style={{ opacity: 0.55, marginRight: 8, fontSize: 12 }}>{String.fromCharCode(65 + oi)}.</span>
                                    {opt}
                                    {isCorrect && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: '#15803d', background: 'rgba(22,163,74,0.12)', padding: '1px 7px', borderRadius: 4 }}>✓ Correct</span>}
                                    {isWrong && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: '#b91c1c', background: 'rgba(220,38,38,0.10)', padding: '1px 7px', borderRadius: 4 }}>✗ Wrong</span>}
                                  </div>
                                );
                              })}
                              {q.chosenIndex === null && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', paddingLeft: 8 }}>Not answered</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════
     ACTIVE PHASE — redesigned test UI
  ══════════════════════════════════════════════ */
  if (phase === 'active') return (
    <div style={{ maxWidth: 740, margin: '0 auto' }}>

      {/* Anti-cheat warning banner */}
      {cheatWarning && (
        <div style={{ background:'rgba(220,38,38,0.10)', border:'1.5px solid rgba(220,38,38,0.4)', borderRadius:10, padding:'12px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12, animation:'fadeIn 0.2s ease' }}>
          <span style={{ fontSize:18 }}>🚨</span>
          <span style={{ fontSize:13.5, fontWeight:700, color:'#dc2626', flex:1 }}>{cheatWarning}</span>
        </div>
      )}

      {/* Penalty tracker (shown if any violations) */}
      {cheatCount > 0 && (
        <div style={{ background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'8px 16px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12.5, color:'#dc2626', fontWeight:600 }}>
            ⚠ {cheatCount} violation{cheatCount>1?'s':''} detected
          </span>
          <span style={{ fontSize:12.5, color:'#dc2626', fontWeight:700, fontFamily:"'Courier New', monospace" }}>
            -{cheatPenalty}% penalty will be applied
          </span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{selectedSkill}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)' }}>
            Question {current + 1} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>/ {questions.length}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Answered</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>{Object.keys(answers).length}<span style={{ color: 'var(--ink-3)', fontSize: 14, fontWeight: 400 }}>/{questions.length}</span></div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--surface)', border: `1.5px solid ${timeLeft < 120 ? 'rgba(192,57,43,0.4)' : 'var(--border)'}`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Time Left</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: timeLeft < 120 ? 'var(--red)' : 'var(--ink)', fontFamily: "'Courier New', monospace" }}>{fmt(timeLeft)}</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: 22, height: 5 }}>
        <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question number grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 20 }}>
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} style={{
            width: 30, height: 30, borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
            border: '1.5px solid ' + (i === current ? '#16a34a' : answers[i] !== undefined ? 'var(--border-2)' : 'var(--border)'),
            background: i === current ? '#16a34a' : answers[i] !== undefined ? 'rgba(22,163,74,0.08)' : 'var(--surface)',
            color: i === current ? '#fff' : 'var(--ink-2)',
            cursor: 'pointer', fontWeight: i === current ? 800 : 400,
          }}>{i + 1}</button>
        ))}
      </div>

      {/* Question card */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '28px 30px', marginBottom: 18, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.7, marginBottom: 26, color: 'var(--ink)' }}>
          {q?.question}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(q?.options || []).map((opt, idx) => {
            const chosen = answers[current] === idx;
            return (
              <button key={idx}
                onClick={() => setAnswers(a => ({ ...a, [current]: idx }))}
                style={{
                  padding: '14px 20px', borderRadius: 'var(--r)', textAlign: 'left',
                  border: chosen ? '2px solid #16a34a' : '1.5px solid var(--border)',
                  background: chosen ? 'rgba(22,163,74,0.08)' : 'var(--surface-2)',
                  color: 'var(--ink)', fontWeight: chosen ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.12s',
                  fontSize: 15, fontFamily: 'inherit',
                }}>
                <span style={{ fontSize: 12.5, opacity: 0.5, marginRight: 12, fontFamily: "'Courier New', monospace" }}>{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>← Previous</button>
        {current < questions.length - 1 ? (
          <button className="btn btn-primary btn-sm" onClick={() => setCurrent(c => c + 1)}>Next →</button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Spinner size={13} color="white" /> Saving…</> : `Submit (${Object.keys(answers).length}/${questions.length} answered)`}
          </button>
        )}
      </div>
      <div style={{ textAlign:'center', marginTop:14 }}>
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)', fontSize:12 }}
          onClick={async () => {
            if (!window.confirm('⚠️ Leaving mid-test will count as an abandonment and a low score (max 30%) will be recorded. Are you sure?')) return;
            abandonedRef.current = true;
            clearInterval(timerRef.current);
            const questionDetails = questions.map((q, i) => ({
              question: q.question, options: q.options,
              correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
              correctAnswer: q.correctAnswer || q.options[q.correctIndex] || '',
              chosenIndex: answers[i] !== undefined ? answers[i] : null,
              chosenAnswer: answers[i] !== undefined ? q.options[answers[i]] : null,
              isCorrect: answers[i] === q.correctIndex,
            }));
            const correct = Object.values(answers).filter((a,i) => a === questions[i]?.correctIndex).length;
            const rawScore = Math.round((correct / Math.max(questions.length,1)) * 100);
            const score = Math.max(0, rawScore - cheatPenaltyRef.current);
            setSaving(true);
            try {
              await api.tests.submit({ skill: selectedSkill, score, correct, total: questions.length, abandoned: true, timeTaken: Math.round((Date.now()-(startTime||Date.now()))/1000), questions: questionDetails })
                .catch(() => api.users.saveTest({ skill: selectedSkill, score, correct, total: questions.length, timeTaken: 0, questions: questionDetails }));
              if (onRefresh) await onRefresh();
            } catch {}
            setSaving(false);
            setResult({ score, correct, total: questions.length, skill: selectedSkill, questionDetails, abandoned: true });
            setPhase('result');
          }}>
          ✕ Leave Test (score will be penalised)
        </button>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════
     RESULT PHASE — redesigned results screen
  ══════════════════════════════════════════════ */
  if (phase === 'result') return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Score card */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '40px 44px', marginBottom: 22, boxShadow: 'var(--shadow)', textAlign: 'center' }}>
        {/* Large score display */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: scoreClr(result.score), lineHeight: 1, marginBottom: 6, letterSpacing: '-0.03em' }}>
            {result.correct}/{result.total}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            {result.skill} Assessment
          </div>
        </div>

        {/* Stats row — no percentage card */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
          {[
            ['Correct', `${result.correct}/${result.total}`],
            ['Time Taken', result.realTimeTaken < 60 ? `${result.realTimeTaken}s` : `${Math.floor(result.realTimeTaken / 60)}m ${result.realTimeTaken % 60}s`],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ textAlign: 'center', padding: '12px 24px', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', marginBottom: 4 }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Abandonment notice */}
        {result.abandoned && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '14px 20px', marginBottom: 18, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
              ⚠️ Test Abandoned — Score Penalised
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              You left the test before completing it. A maximum of 30% is awarded for incomplete tests. Always finish the test to receive your full score.
            </div>
          </div>
        )}

        {/* Penalty notice on result screen */}
        {result.penaltyApplied > 0 && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '14px 20px', marginBottom: 18, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
              🚨 Anti-Cheat Penalty Applied
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              {result.violations} tab-switch violation{result.violations > 1 ? 's' : ''} were detected during your test.
              Your raw score was <strong>{result.rawScore}%</strong>, reduced by <strong style={{ color: '#dc2626' }}>{result.penaltyApplied}%</strong> → final score: <strong style={{ color: scoreClr(result.score) }}>{result.score}%</strong>.
            </div>
          </div>
        )}

        {/* Skill level update */}
        {newSkillLevel !== null && (
          <div style={{ display: 'inline-block', padding: '10px 22px', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
            Skill level updated to <strong style={{ color: '#16a34a' }}>{newSkillLevel}%</strong>
          </div>
        )}

        {/* Score feedback */}
        <div style={{ padding: '16px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.65, marginBottom: 24, textAlign: 'left' }}>
          You answered <strong>{result.correct}</strong> out of <strong>{result.total}</strong> questions correctly, scoring <strong style={{ color: scoreClr(result.score) }}>{result.score}%</strong>. Review the answer breakdown below to identify areas for improvement. Each attempt automatically updates your skill level.
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => { setPhase('select'); setResult(null); setNewSkillLevel(null); }}>Back to Tests</button>
          <button className="btn btn-primary" onClick={() => startTest(result.skill)}>Retake Test</button>
        </div>
      </div>

      {/* Answer review */}
      {result.questionDetails?.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '28px 30px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ marginBottom: 6 }}>Answer Review</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 22 }}>
            {result.correct} correct · {result.total - result.correct} incorrect
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.questionDetails.map((q, i) => (
              <div key={i} style={{ padding: '16px 18px', borderRadius: 'var(--r)', border: `1.5px solid ${q.isCorrect ? 'rgba(22,163,74,0.30)' : 'rgba(220,38,38,0.25)'}`, background: q.isCorrect ? 'rgba(22,163,74,0.04)' : 'rgba(220,38,38,0.03)' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: q.isCorrect ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>
                    {i + 1}
                  </span>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.55, color: 'var(--ink)' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', marginRight: 8 }}>Q{i + 1}</span>
                    {q.question}
                  </div>
                </div>
                <div style={{ paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {q.options?.map((opt, oi) => {
                    const isCorrect = oi === q.correctIndex;
                    const isChosen  = oi === q.chosenIndex;
                    const isWrong   = isChosen && !isCorrect;
                    return (
                      <div key={oi} style={{
                        fontSize: 13.5, padding: '8px 14px', borderRadius: 6,
                        background: isCorrect ? 'rgba(22,163,74,0.12)' : isWrong ? 'rgba(220,38,38,0.10)' : 'transparent',
                        color: isCorrect ? '#15803d' : isWrong ? '#b91c1c' : 'var(--ink-3)',
                        fontWeight: isCorrect || isChosen ? 700 : 400,
                        border: isCorrect ? '1.5px solid rgba(22,163,74,0.35)' : isWrong ? '1.5px solid rgba(220,38,38,0.30)' : '1px solid transparent',
                      }}>
                        <span style={{ opacity: 0.55, marginRight: 8, fontSize: 12, fontFamily: "'Courier New', monospace" }}>{String.fromCharCode(65 + oi)}.</span>
                        {opt}
                        {isCorrect && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: '#15803d', background: 'rgba(22,163,74,0.12)', padding: '1px 7px', borderRadius: 4 }}>✓ Correct</span>}
                        {isWrong && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: '#b91c1c', background: 'rgba(220,38,38,0.10)', padding: '1px 7px', borderRadius: 4 }}>✗ Wrong</span>}
                      </div>
                    );
                  })}
                  {q.chosenIndex === null && <div style={{ fontSize: 13, color: 'var(--ink-3)', paddingLeft: 8 }}>Not answered</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return null;
}