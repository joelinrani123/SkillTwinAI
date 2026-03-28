import { useState, useEffect } from 'react';
import { Spinner, EmptyState, Alert } from '../components/UI';
import { api } from '../services/api';

/* ── Certificate PDF ─────────────────────────────── */
function openCertificatePDF(cert, userName) {
  const certNum = `STAI-${String(cert._id || '').slice(-8).toUpperCase()}`;
  const date    = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const grade   = cert.earnedScore >= 90 ? 'Distinction' : cert.earnedScore >= 75 ? 'Merit' : 'Pass';

  const html = `<!DOCTYPE html><html><head>
<title>Certificate — ${cert.skillName || cert.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:297mm;height:210mm;background:#fff;}
@page{size:A4 landscape;margin:0;}
@media print{.no-print{display:none!important;}}
.cert{width:297mm;height:210mm;position:relative;overflow:hidden;background:#fafafa;font-family:"Inter",sans-serif;}
.border-outer{position:absolute;inset:12px;border:1.5px solid #d6dae0;border-radius:4px;}
.border-inner{position:absolute;inset:22px;border:1px solid rgba(74,108,247,0.15);border-radius:3px;}
.top-bar{position:absolute;top:0;left:0;right:0;height:5px;background:#4a6cf7;}
.content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 100px;}
.org{font-family:"Courier New",monospace;font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#9da5b0;margin-bottom:10px;text-align:center;}
.line{width:50px;height:1.5px;background:#4a6cf7;margin:0 auto 16px;}
.certifies{font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9da5b0;margin-bottom:10px;}
.name{font-family:'Inter',sans-serif;font-size:42px;color:#111318;line-height:1.1;text-align:center;margin-bottom:10px;}
.name-line{width:180px;height:1px;background:#d6dae0;margin:0 auto 16px;}
.sub{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9da5b0;margin-bottom:8px;}
.skill{font-family:'Inter',sans-serif;font-size:28px;font-weight:700;color:#111318;margin-bottom:12px;text-align:center;}
.grade-row{display:flex;align-items:center;gap:14px;}
.grade-badge{display:inline-block;padding:5px 16px;border-radius:4px;font-size:12px;font-weight:700;color:#fff;background:#4a6cf7;}
.grade-text{font-size:13px;color:#3a3f4a;}
.footer{position:absolute;bottom:36px;left:100px;right:100px;display:flex;justify-content:space-between;align-items:flex-end;}
.fc{text-align:center;min-width:130px;}
.fline{height:1px;background:#d6dae0;margin-bottom:6px;}
.fval{font-family:"Courier New",monospace;font-size:10px;color:#111318;letter-spacing:0.04em;}
.flabel{font-family:"Courier New",monospace;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:#9da5b0;margin-top:2px;}
.seal{width:68px;height:68px;}
.print-btn{position:fixed;bottom:20px;right:20px;background:#4a6cf7;color:#fff;border:none;padding:11px 24px;cursor:pointer;font-size:13px;font-family:"Inter",sans-serif;font-weight:700;border-radius:6px;}
</style></head><body>
<div class="cert">
  <div class="top-bar"></div>
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="content">
    <div class="org">SkillTwinAI &nbsp;·&nbsp; Certificate of Achievement</div>
    <div class="line"></div>
    <div class="certifies">This certifies that</div>
    <div class="name">${userName || 'Candidate'}</div>
    <div class="name-line"></div>
    <div class="sub">has successfully completed the learning path for</div>
    <div class="skill">${cert.skillName || cert.name}</div>
    <div class="grade-row">
      <span class="grade-badge">${grade}</span>
      <span class="grade-text">Assessment Score: <strong>${cert.earnedScore || 75}%</strong></span>
    </div>
  </div>
  <div class="footer">
    <div class="fc"><div class="fline"></div><div class="fval">${date}</div><div class="flabel">Date Issued</div></div>
    <svg class="seal" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke="#d6dae0" stroke-width="1.5"/>
      <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(74,108,247,0.2)" stroke-width="0.8"/>
      <text x="40" y="36" text-anchor="middle" font-size="7.5" font-family="Georgia" fill="#111318" letter-spacing="1">SKILLTWIN</text>
      <text x="40" y="46" text-anchor="middle" font-size="7.5" font-family="Georgia" fill="#111318" letter-spacing="1">AI</text>
      <text x="40" y="56" text-anchor="middle" font-size="5.5" font-family="monospace" fill="#9da5b0" letter-spacing="2">VERIFIED</text>
    </svg>
    <div class="fc"><div class="fline"></div><div class="fval">${certNum}</div><div class="flabel">Certificate No.</div></div>
  </div>
</div>
<button class="print-btn no-print" onclick="window.print()">Save as PDF</button>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

/* ── Cert Card ───────────────────────────────────── */
function CertCard({ cert, user }) {
  const date    = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const certNum = `STAI-${String(cert._id || '').slice(-8).toUpperCase()}`;
  const grade   = cert.earnedScore >= 90 ? 'Distinction' : cert.earnedScore >= 75 ? 'Merit' : 'Pass';

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '36px 40px', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#3B82F6' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12, fontFamily: '"Courier New", monospace'}}>SkillTwinAI · Certificate of Achievement</div>
        <div style={{ width: 40, height: 2, background: '#3B82F6', margin: '0 auto 20px' }} />
        <div style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>This certifies that</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 32, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 10 }}>{user?.name || 'Candidate'}</div>
        <div style={{ width: 120, height: 1, background: 'var(--border-2)', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>has successfully completed the learning path for</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>{cert.skillName || cert.name}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '8px 20px', background: 'rgba(59,130,246,0.10)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.25)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#3B82F6' }}>{grade}</span>
          <span style={{ color: 'var(--border-2)' }}>·</span>
          <span style={{ fontSize: 15, color: 'var(--ink-2)' }}>Score: <strong>{cert.earnedScore || 75}%</strong></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, fontFamily: '"Courier New", monospace' }}>{certNum}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginTop: 3 }}>Certificate No.</div>
          </div>
          <button onClick={() => openCertificatePDF(cert, user?.name)} className="btn btn-primary">Download PDF</button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{date}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginTop: 3 }}>Date Issued</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Module Row ──────────────────────────────────── */
function ModuleRow({ mod, index, onComplete, completing }) {
  const [expanded, setExpanded] = useState(false);
  const isDone    = mod.completed || (mod.tasks && mod.tasks.every(t => t.completed));
  const keyPoints = Array.isArray(mod.keyPoints) && mod.keyPoints.length > 0 ? mod.keyPoints : [];

  const parseContent = (raw) => {
    if (!raw) return [];
    const blocks = [];
    let currentTopic  = null;
    let currentPoints = [];
    let inCodeBlock   = false;
    let codeLines     = [];
    const flush = () => {
      if (currentTopic || currentPoints.length > 0) {
        blocks.push({ heading: currentTopic, points: [...currentPoints] });
        currentTopic  = null;
        currentPoints = [];
      }
    };
    const lines = raw.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const rawLine = lines[li];
      const line    = rawLine.trim();
      // Code block handling
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true; codeLines = [];
        } else {
          inCodeBlock = false;
          currentPoints.push({ type: 'code', text: codeLines.join('\n') });
          codeLines = [];
        }
        continue;
      }
      if (inCodeBlock) { codeLines.push(rawLine); continue; }
      if (!line) continue;
      const isHeading = (line.endsWith(':') && line.length < 80 && !line.includes('.')) || /^#{1,3}\s/.test(line);
      if (isHeading) { flush(); currentTopic = line.replace(/^#+\s*/, '').replace(/:$/, '').trim(); continue; }
      const isBullet = /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line);
      if (isBullet)  { currentPoints.push({ type: 'bullet', text: line.replace(/^[-*•]|\d+\.\s*/, '').trim() }); continue; }
      // Paragraphs: long lines stay as prose
      currentPoints.push({ type: 'para', text: line });
    }
    flush();
    return blocks;
  };

  const blocks = parseContent(mod.readingContent);

  return (
    <div style={{
      border: `1.5px solid ${isDone ? 'rgba(22,163,74,0.35)' : 'var(--border)'}`,
      borderRadius: 12, overflow: 'hidden', marginBottom: 14,
      background: isDone ? 'rgba(22,163,74,0.03)' : 'var(--surface)',
    }}>
      <button onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 18,
        padding: '20px 26px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: isDone ? '#16a34a' : 'var(--surface-2)',
          border: `2px solid ${isDone ? '#16a34a' : 'var(--border-2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: isDone ? '#fff' : 'var(--ink-3)',
        }}>
          {isDone ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <polyline points="3,9 7,13 15,5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: isDone ? '#16a34a' : 'var(--ink)', marginBottom: 4 }}>{mod.title}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
            {isDone ? 'Completed' : `${mod.estimatedMins || 15} min read · Click to expand`}
          </div>
        </div>
        <div style={{ fontSize: 22, color: 'var(--ink-4)', fontWeight: 300 }}>{expanded ? '−' : '+'}</div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '30px 32px' }}>
          {blocks.length > 0 ? blocks.map((block, bi) => (
            <div key={bi} style={{ marginBottom: 36, paddingBottom: 30, borderBottom: bi < blocks.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {block.heading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 4, height: 24, background: '#3B82F6', borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', fontFamily: "Inter, sans-serif" }}>{block.heading}</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {block.points.map((pt, pi) => {
                  if (pt.type === 'code') return (
                    <pre key={pi} style={{ background: '#1e1e2e', border: '1px solid #2d2d3d', borderRadius: 10, padding: '20px 24px', fontSize: 14, fontFamily: '"Courier New", monospace', lineHeight: 1.8, color: '#cdd6f4', overflowX: 'auto', whiteSpace: 'pre', margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>{pt.text}</pre>
                  );
                  if (pt.type === 'bullet') return (
                    <div key={pi} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 11 }} />
                      <span style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.85 }}>{pt.text}</span>
                    </div>
                  );
                  // prose paragraph
                  return <p key={pi} style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.9, margin: 0 }}>{pt.text}</p>;
                })}
              </div>
            </div>
          )) : (
            <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 8, color: 'var(--ink-3)', fontSize: 16 }}>Content loading…</div>
          )}

          {keyPoints.length > 0 && (
            <div style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '22px 26px', marginTop: 10, marginBottom: 26 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Key Takeaways</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {keyPoints.map((pt, ki) => (
                  <div key={ki} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#3B82F6', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{ki + 1}</div>
                    <span style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.8 }}>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isDone ? (
            <button onClick={() => onComplete(mod.id)} disabled={!!completing}
              style={{ fontSize: 15, padding: '11px 26px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: completing ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: completing ? 0.7 : 1, fontFamily: "Inter, sans-serif", transition: 'opacity 0.15s' }}>
              {completing === mod.id ? <><Spinner size={15} color="white" /> Saving…</> : 'Mark as Complete'}
            </button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: 'rgba(22,163,74,0.12)', border: '1.5px solid rgba(22,163,74,0.35)', borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#15803d' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polyline points="2,8 6,12 14,4" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Module Completed
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Path Detail ─────────────────────────────────── */
function PathDetailView({ path, onModuleComplete, completing }) {
  const done  = path.modules.filter(m => m.completed || (m.tasks && m.tasks.every(t => t.completed))).length;
  const total = path.modules.length;

  return (
    <div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{path.skillName}</div>
            <div style={{ fontSize: 15, color: 'var(--ink-3)' }}>{done} of {total} modules completed</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 700, color: path.certUnlocked ? '#16a34a' : 'var(--ink)' }}>{path.progress}%</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>complete</div>
          </div>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${path.progress}%`, transition: 'width 0.6s ease' }} />
        </div>
        {path.certUnlocked && (
          <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 8, fontSize: 15, fontWeight: 600, color: '#15803d' }}>
            🎉 Certificate for {path.skillName} has been issued! Go to the Certificates tab to download it.
          </div>
        )}
      </div>

      {path.modules.map((mod, i) => (
        <ModuleRow key={mod.id} mod={mod} index={i} onComplete={onModuleComplete} completing={completing} />
      ))}
    </div>
  );
}

/* ── Start New Path ──────────────────────────────── */
function StartPathPanel({ onStarted }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [starting,  setStarting]  = useState('');
  const [searching, setSearching] = useState(false);
  const [err,       setErr]       = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true); setErr('');
    try {
      const d = await api.certs.search(query);
      setResults(d.results || []);
    } catch (e) { setErr(e.message); }
    setSearching(false);
  };

  const start = async (skillName) => {
    setStarting(skillName); setErr('');
    try { await api.certs.startPath(skillName); onStarted(skillName); }
    catch (e) { setErr(e.message); }
    setStarting('');
  };

  return (
    <div>
      {/* Intro banner */}
      <div style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '28px 32px', marginBottom: 28 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
          Start a Learning Path
        </div>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.75, margin: 0 }}>
          Search for any skill or technology to begin a structured learning path. Each path contains <strong>8 in-depth modules</strong> with rich reading content, key takeaways, and practical knowledge — written by AI and reviewed for accuracy. Complete all 8 modules to earn a verified certificate.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="e.g. React, Machine Learning, Docker, Python…"
          style={{ flex: 1, fontSize: 16, padding: '14px 18px' }}
        />
        <button className="btn btn-primary btn-lg" onClick={search} disabled={!query.trim() || searching}>
          {searching ? <Spinner size={15} color="white" /> : 'Search'}
        </button>
      </div>

      {err && <Alert type="error" style={{ marginBottom: 16 }}>{err}</Alert>}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map(r => (
            <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12 }}>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}>{r}</div>
                <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>8 comprehensive modules · Earn a verified certificate on completion</div>
              </div>
              <button className="btn btn-primary" onClick={() => start(r)} disabled={!!starting} style={{ fontSize: 15, flexShrink: 0 }}>
                {starting === r ? <><Spinner size={13} color="white" /> Starting…</> : 'Start Path'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────── */
export default function CertsPage({ user, onRefresh }) {
  const [certs,       setCerts]       = useState([]);
  const [paths,       setPaths]       = useState([]);
  const [tab,         setTab]         = useState('paths');
  const [activeSkill, setActiveSkill] = useState(null);
  const [msg,         setMsg]         = useState('');
  const [msgType,     setMsgType]     = useState('success');
  const [loading,     setLoading]     = useState(true);
  const [completing,  setCompleting]  = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([api.certs.getAll(), api.certs.getPaths()]);
      setCerts(c.certifications || []);
      setPaths(p.paths || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (m, type = 'success') => { setMsg(m); setMsgType(type); setTimeout(() => setMsg(''), 5000); };

  const handleModuleComplete = async (skillName, moduleId) => {
    setCompleting(moduleId);
    try {
      const path = paths.find(p => p.skillName === skillName);
      if (!path) return;
      const mod = path.modules.find(m => m.id === moduleId);
      await fetch(`${import.meta.env.VITE_API_URL || '/api'}/certifications/path/${encodeURIComponent(skillName)}/complete-module`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('st_token')}` },
        body: JSON.stringify({ moduleId }),
      });
      flash(`Module "${mod?.title || moduleId}" completed!`);
      await load();
      if (onRefresh) onRefresh();
    } catch (e) { flash(e.message || 'Failed to complete module', 'error'); }
    setCompleting('');
  };

  const handleStarted = async (skillName) => {
    flash(`Learning path for "${skillName}" started! Generating 8 in-depth modules…`);
    await load();
    setActiveSkill(skillName);
    setTab('paths');
  };

  const tabs = [
    ['paths',  `My Paths (${paths.length})`],
    ['earned', `Certificates (${certs.length})`],
    ['search', 'Start New Path'],
  ];

  const activePath = activeSkill ? paths.find(p => p.skillName === activeSkill) : null;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2>Certifications</h2>
        <p style={{ color: 'var(--ink-3)', marginTop: 8, fontSize: 16 }}>
          Start a learning path, read 8 comprehensive modules, and earn a verified certificate.
        </p>
      </div>

      {msg && <Alert type={msgType} style={{ marginBottom: 18 }}>{msg}</Alert>}

      {/* Tabs */}
      <div style={{ marginBottom: 28 }}>
        <div className="tabs">
          {tabs.map(([id, label]) => (
            <button key={id} className={`tab${tab === id ? ' active' : ''}`}
              style={{ fontSize: 16, padding: '12px 22px' }}
              onClick={() => { setTab(id); if (id !== 'paths') setActiveSkill(null); }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spinner size={30} /></div>
      ) : (
        <>
          {/* My Paths */}
          {tab === 'paths' && (
            activePath ? (
              <div>
                <button className="btn btn-ghost" onClick={() => setActiveSkill(null)} style={{ marginBottom: 22, fontSize: 15 }}>← Back to all paths</button>
                <PathDetailView
                  path={activePath}
                  onModuleComplete={(modId) => handleModuleComplete(activePath.skillName, modId)}
                  completing={completing}
                />
              </div>
            ) : paths.length === 0 ? (
              <EmptyState icon="◎" title="No learning paths started"
                description="Search for any skill to begin a structured 8-module learning path."
                action={<button className="btn btn-primary btn-lg" onClick={() => setTab('search')}>Find a Certification</button>} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paths.map(path => {
                  const done  = path.modules.filter(m => m.completed || (m.tasks && m.tasks.every(t => t.completed))).length;
                  const total = path.modules.length;
                  return (
                    <div key={path._id}
                      style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '20px 26px', cursor: 'pointer', display: 'flex', gap: 18, alignItems: 'center', transition: 'box-shadow 0.14s, border-color 0.14s' }}
                      onClick={() => setActiveSkill(path.skillName)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: path.certUnlocked ? 'rgba(22,163,74,0.12)' : 'var(--surface-2)', border: `2px solid ${path.certUnlocked ? '#16a34a' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: path.certUnlocked ? '#16a34a' : 'var(--ink-3)' }}>
                        {path.certUnlocked
                          ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><polyline points="3,11 8.5,16.5 19,6" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : '◎'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>{path.skillName}</div>
                        <div className="progress-bar" style={{ height: 7, marginBottom: 6 }}>
                          <div className="progress-fill" style={{ width: `${path.progress}%`, background: path.certUnlocked ? '#16a34a' : '#3B82F6' }} />
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{done}/{total} modules · {path.progress}% complete</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {path.certUnlocked
                          ? <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d', background: 'rgba(22,163,74,0.12)', padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(22,163,74,0.25)' }}>Certified</span>
                          : <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>Continue →</span>}
                      </div>
                    </div>
                  );
                })}
                <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 8, fontSize: 15 }} onClick={() => setTab('search')}>+ Start another path</button>
              </div>
            )
          )}

          {/* Earned Certs */}
          {tab === 'earned' && (
            certs.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 26 }}>
                {certs.map(cert => <CertCard key={cert._id} cert={cert} user={user} />)}
              </div>
            ) : (
              <EmptyState icon="◈" title="No certificates earned yet"
                description="Complete all 8 modules of any learning path to earn a verified certificate."
                action={<button className="btn btn-primary btn-lg" onClick={() => setTab('search')}>Start a Learning Path</button>} />
            )
          )}

          {/* Search */}
          {tab === 'search' && <StartPathPanel onStarted={handleStarted} />}
        </>
      )}
    </div>
  );
}
