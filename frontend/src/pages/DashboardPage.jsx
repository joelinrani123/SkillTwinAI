import { useState, useEffect, useRef } from 'react';
import { SkillBar, EmptyState, Spinner } from '../components/UI';
import { api } from '../services/api';

const scoreColor = s => s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';

/* ── Floating AI Chatbot ─────────────────────────── */
function FloatingChatbot({ user }) {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([
    { role: 'ai', text: `Hello ${user?.name?.split(' ')[0] || 'there'} — I'm your AI career coach. Ask me anything about skills, jobs, or your career path.` }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [unread,  setUnread]  = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); }
  }, [open, msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const newMsgs = [...msgs, { role: 'user', text }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const history = newMsgs.slice(1).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
      const res = await api.ai.chat(history, { user });
      setMsgs(m => [...m, { role: 'ai', text: res.message || res.reply || 'Sorry, something went wrong.' }]);
      if (!open) setUnread(u => u + 1);
    } catch { setMsgs(m => [...m, { role: 'ai', text: 'Could not reach the server. Try again.' }]); }
    setLoading(false);
  };

  return (
    <>
      <div style={{ position:'fixed',bottom:88,right:24,width:340,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,0.18)',display:'flex',flexDirection:'column',overflow:'hidden',zIndex:1000,transition:'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',transform:open?'scale(1) translateY(0)':'scale(0.88) translateY(16px)',opacity:open?1:0,pointerEvents:open?'all':'none',maxHeight:open?460:0 }}>
        <div style={{ padding:'13px 16px',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:9 }}>
            <div style={{ width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.16)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'white',letterSpacing:'0.04em' }}>AI</div>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:'white' }}>Career Coach</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,0.65)',display:'flex',alignItems:'center',gap:4 }}>
                <span style={{ width:5,height:5,borderRadius:'50%',background:'#86efac',display:'inline-block' }} />Always available
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.15)',border:'none',borderRadius:6,padding:'4px 9px',color:'white',cursor:'pointer',fontSize:12 }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:9,maxHeight:300 }}>
          {msgs.map((m,i) => (
            <div key={i} style={{ display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
              <div className={m.role==='user'?'chat-msg-user':'chat-msg-ai'} style={{ fontSize:13,padding:'9px 13px',lineHeight:1.55,maxWidth:'86%' }}>{m.text}</div>
            </div>
          ))}
          {loading && <div style={{ display:'flex' }}><div className="chat-msg-ai" style={{ padding:'9px 14px' }}><Spinner size={12} /></div></div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding:'9px 11px',borderTop:'1px solid var(--border)',display:'flex',gap:7,flexShrink:0 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask about your career path…" style={{ flex:1,fontSize:13,padding:'8px 11px',borderRadius:8 }} />
          <button className="btn btn-primary btn-sm" onClick={send} disabled={loading||!input.trim()} style={{ flexShrink:0,padding:'7px 12px' }}>
            {loading?<Spinner size={11} color="white" />:'↑'}
          </button>
        </div>
      </div>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ position:'fixed',bottom:24,right:24,width:52,height:52,borderRadius:'50%',background:'var(--accent)',border:'none',cursor:'pointer',boxShadow:'0 4px 20px var(--accent-glow)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,zIndex:1001,transition:'transform 0.2s ease' }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.09)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
        title="AI Career Coach">
        {open ? '✕' : '✦'}
        {!open&&unread>0&&<span style={{ position:'absolute',top:0,right:0,width:16,height:16,borderRadius:'50%',background:'var(--red)',color:'white',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid var(--bg)' }}>{unread}</span>}
      </button>
    </>
  );
}

/* ── Dashboard ───────────────────────────────────── */
export default function DashboardPage({ user, setPage }) {
  const [tests,        setTests]        = useState([]);
  const [insights,     setInsights]     = useState(null);
  const [loadingTests, setLoadingTests] = useState(true);

  const skills     = user?.skills || [];
  const gaps       = user?.gaps   || [];
  const score      = user?.overallScore || 0;
  const certs      = user?.certifications || [];
  const earnedCerts = certs.filter(c => c.completed);
  const topSkills  = [...skills].sort((a,b) => b.level - a.level).slice(0, 5);
  const proficient = skills.filter(s => s.level >= 70).length;

  useEffect(() => {
    api.users.getTests().then(d => setTests(d.results || [])).catch(() => {}).finally(() => setLoadingTests(false));
    api.analysis.predict().then(d => setInsights(d)).catch(() => {});
  }, []);

  const recentTests = tests.slice(0, 5);
  const avgScore    = recentTests.length ? Math.round(recentTests.reduce((a,t) => a+(t.score||0), 0) / recentTests.length) : null;

  return (
    <div>

      {/* ── Welcome strip ── */}
      <div style={{ marginBottom:26,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
        <div>
          <h2 style={{ margin:0 }}>Welcome back, {user?.name?.split(' ')[0] || 'there'}</h2>
          <p style={{ margin:'5px 0 0',fontSize:14,color:'var(--ink-3)' }}>
            {new Date().toLocaleDateString('en-IN',{ weekday:'long', month:'long', day:'numeric' })}
          </p>
        </div>
        {score > 0 && (
          <div style={{ display:'flex',alignItems:'center',gap:10,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 18px',boxShadow:'var(--shadow-sm)' }}>
            <div style={{ fontSize:26,fontWeight:900,color:scoreColor(score),lineHeight:1,fontFamily: "Inter, sans-serif" }}>{score}</div>
            <div>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)' }}>Overall</div>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)' }}>Score</div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4 KPI cards ── */}
      <div className="grid-4" style={{ marginBottom:22 }}>
        {[
          { label:'Skills',      value:skills.length||'—',                       note:`${proficient} expert`,                                     color:'#6366f1', page:'skills'   },
          { label:'Avg Score',   value:avgScore!=null?`${avgScore}%`:'—',        note:tests.length?`${tests.length} tests`:'No tests yet',         color:avgScore!=null?scoreColor(avgScore):'#6366f1', page:'tests' },
          { label:'Certificates',value:earnedCerts.length||'—',                  note:'earned',                                                   color:'#3B82F6', page:'certs'    },
          { label:'Career Level',value:insights?.careerLevel||'—',               note:insights?.readinessScore?`${insights.readinessScore}% ready`:'profile readiness', color:'#8b5cf6', page:'analysis' },
        ].map((c,i) => (
          <div key={c.label} className="card fade-up"
            style={{ animationDelay:`${i*0.05}s`,cursor:'pointer',borderTop:`3px solid ${c.color}`,transition:'all 0.14s' }}
            onClick={() => setPage(c.page)}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div style={{ fontSize:11.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:8 }}>{c.label}</div>
            <div style={{ fontSize:24,fontWeight:900,color:'var(--ink)',lineHeight:1.1,marginBottom:4 }}>{c.value}</div>
            <div style={{ fontSize:12,color:'var(--ink-4)' }}>{c.note}</div>
          </div>
        ))}
      </div>

      {/* ── AI insights strip (if available) ── */}
      {insights?.topSkills?.length > 0 && (
        <div className="card fade-up" style={{ marginBottom:20,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap',borderLeft:'3px solid var(--accent)',background:'var(--surface-2)',padding:'14px 20px' }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:5 }}>AI Insights</div>
            {insights.careerLevel && <span className="badge badge-accent" style={{ fontSize:11 }}>{insights.careerLevel}</span>}
          </div>
          {insights.readinessScore && (
            <div>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:4 }}>Readiness</div>
              <span style={{ fontSize:16,fontWeight:800,color:'var(--green)' }}>{insights.readinessScore}%</span>
            </div>
          )}
          <div>
            <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:6 }}>Top Skills</div>
            <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
              {insights.topSkills.slice(0,4).map(s => <span key={s} className="badge badge-green">{s}</span>)}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={() => setPage('analysis')}>Full Analysis →</button>
        </div>
      )}

      {/* ── Main 2-col layout ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18 }}>

        {/* Top skills */}
        <div className="card fade-up" style={{ animationDelay:'0.08s' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <h3 style={{ margin:0,fontSize:16 }}>Top Skills</h3>
            <button className="btn btn-ghost btn-xs" onClick={() => setPage('skills')}>Manage →</button>
          </div>
          {topSkills.length ? (
            topSkills.map((s,i) => <SkillBar key={s._id||s.name} name={s.name} level={s.level} category={s.category} delay={i} />)
          ) : (
            <EmptyState icon="◈" title="No skills yet" description="Add your first skill to get started."
              action={<button className="btn btn-primary btn-sm" onClick={() => setPage('skills')}>Add Skills</button>} />
          )}
        </div>

        {/* Recent tests */}
        <div className="card fade-up" style={{ animationDelay:'0.12s' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <h3 style={{ margin:0,fontSize:16 }}>Recent Tests</h3>
            <button className="btn btn-ghost btn-xs" onClick={() => setPage('tests')}>Take test →</button>
          </div>
          {loadingTests ? (
            <div style={{ padding:'24px 0',textAlign:'center' }}><Spinner size={20} /></div>
          ) : recentTests.length ? (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {recentTests.map((t,i) => (
                <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'var(--surface-2)',borderRadius:'var(--r)',border:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600 }}>{t.skill||'Unknown'}</div>
                    <div style={{ fontSize:11.5,color:'var(--ink-3)',marginTop:2 }}>{t.correct||0}/{t.total||0} correct</div>
                  </div>
                  <div style={{ fontSize:17,fontWeight:800,color:scoreColor(t.score||0),fontFamily:"'Courier New', monospace" }}>
                    {t.score||0}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="◎" title="No tests yet" description="Take a skill assessment to track your progress." />
          )}
        </div>
      </div>

      {/* ── Bottom row: certs + gaps ── */}
      <div className="grid-2">
        <div className="card fade-up" style={{ animationDelay:'0.16s' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <h3 style={{ margin:0,fontSize:16 }}>Certificates</h3>
            <button className="btn btn-ghost btn-xs" onClick={() => setPage('certs')}>View all →</button>
          </div>
          {earnedCerts.length ? (
            <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
              {earnedCerts.slice(0,3).map((c,i) => (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--surface-2)',borderRadius:'var(--r)',border:'1px solid var(--border)' }}>
                  <span style={{ fontSize:16,flexShrink:0 }}>◈</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:600 }}>{c.name}</div>
                    <div style={{ fontSize:11.5,color:'#3B82F6',marginTop:1 }}>+{c.scoreBoost||5} pts</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="◈" title="No certificates yet" description="Score 70%+ on an assessment to earn one."
              action={<button className="btn btn-primary btn-sm" onClick={() => setPage('tests')}>Take a test</button>} />
          )}
        </div>

        <div className="card fade-up" style={{ animationDelay:'0.20s' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <h3 style={{ margin:0,fontSize:16 }}>Skill Gaps</h3>
            <button className="btn btn-ghost btn-xs" onClick={() => setPage('learning')}>Learning path →</button>
          </div>
          {gaps.length > 0 ? (
            <div style={{ display:'flex',flexWrap:'wrap',gap:7 }}>
              {gaps.map(g => <span key={g} className="badge badge-amber" style={{ fontSize:12 }}>{g}</span>)}
            </div>
          ) : (
            <EmptyState icon="✓" title="No skill gaps identified" description="Your skill profile looks complete." />
          )}
        </div>
      </div>

      <FloatingChatbot user={user} />
    </div>
  );
}
