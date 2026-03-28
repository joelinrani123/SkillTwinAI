import { useState, useEffect } from 'react';
import { Spinner, EmptyState } from '../components/UI';
import { api } from '../services/api';

const PRIORITY_COLOR = { high: '#dc2626', medium: '#6B7280', low: '#16a34a' };
const PRIORITY_BG    = { high: 'rgba(220,38,38,0.08)', medium: 'rgba(107,114,128,0.10)', low: 'rgba(22,163,74,0.08)' };
const TYPE_ICON      = { course: '🎓', video: '🎥', book: '📚', practice: '⚡', article: '📰', tutorial: '🛠️' };

const DAILY_TIPS = [
  "Consistency beats intensity — 30 minutes daily outperforms 5-hour weekend cramming.",
  "Apply what you learn immediately — build a small project for every new concept.",
  "Teach someone else: explaining a concept cements your own understanding.",
  "Use spaced repetition: revisit topics after 1 day, 1 week, then 1 month.",
  "Focus on understanding, not memorising — real-world problems require thinking, not recall.",
  "Read documentation directly — it's always more accurate than third-party tutorials.",
  "Work on open-source projects to gain real collaborative experience.",
  "Code every single day — even just 20 lines keeps your skills sharp.",
  "Review your test mistakes: they show exactly where your gaps are.",
  "Set a specific goal for each study session before you start.",
];

function ProgressRing({ value, size = 60, stroke = 5, color = '#3B82F6' }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - (value || 0) / 100);
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        style={{ transition:'stroke-dashoffset 0.6s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform:'rotate(90deg)', transformOrigin:'center', fontSize: size*0.22, fontWeight:700, fill:'var(--ink)' }}>
        {value}%
      </text>
    </svg>
  );
}

export default function LearningPage({ user, setPage }) {
  const [recs,      setRecs]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setTab]       = useState('overview');
  const [error,     setError]     = useState(false);
  const [checked,   setChecked]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('stai_daily_tasks') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    const uid = user?._id || user?.id;
    if (!uid) { setLoading(false); return; }
    api.ai.recommend(uid)
      .then(d => setRecs(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user]);

  const toggleCheck = (key) => {
    const updated = { ...checked, [key]: !checked[key] };
    setChecked(updated);
    localStorage.setItem('stai_daily_tasks', JSON.stringify(updated));
  };

  const skills        = user?.skills  || [];
  const gaps          = user?.gaps    || [];
  const score         = user?.overallScore || 0;
  const certs         = (user?.certifications || []).filter(c => c.completed);

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:80, gap:16 }}>
      <Spinner size={32} />
      <div style={{ fontSize:14, color:'var(--ink-3)' }}>Generating your personalised learning roadmap…</div>
    </div>
  );

  const roadmap       = recs?.roadmap       || [];
  const resources     = recs?.resources     || [];
  const nextCerts     = recs?.nextCerts     || [];
  const skillsToLearn = recs?.skillsToLearn || gaps.slice(0, 5).map(g => ({ name: g, reason: 'Identified as a skill gap in your profile. Focus here to boost your score.', priority: 'high', estimatedWeeks: 3 }));
  const weeklyPlan    = recs?.weeklyPlan    || [];
  const careerSummary = recs?.careerSummary || null;
  const todayTip      = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];

  // Compute a simple "learning readiness" from skills + tests
  const proficientCount = skills.filter(s => s.level >= 70).length;
  const learningScore   = skills.length ? Math.round((proficientCount / skills.length) * 100) : 0;

  const tabs = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'roadmap',   label: '🗺️ Roadmap' },
    { id: 'skills',    label: `🎯 Skills (${skillsToLearn.length})` },
    { id: 'certs',     label: `🏅 Certs (${nextCerts.length})` },
    { id: 'resources', label: `📚 Resources (${resources.length})` },
    { id: 'weekly',    label: '📅 Weekly Plan' },
    { id: 'goals',     label: '✅ Daily Goals' },
  ];

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2>Learning Hub</h2>
        <p style={{ color:'var(--ink-3)', marginTop:6, fontSize:15 }}>
          Your personalised learning roadmap, powered by AI — tailored to your skills, assessments, and career trajectory.
        </p>
      </div>

      {/* Daily tip banner */}
      <div style={{ background:'linear-gradient(135deg,rgba(59,130,246,0.10),rgba(99,102,241,0.08))', border:'1px solid rgba(59,130,246,0.20)', borderRadius:12, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:14 }}>
        <span style={{ fontSize:22, flexShrink:0 }}>💡</span>
        <div>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#3B82F6', marginBottom:4 }}>Today's Learning Tip</div>
          <div style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.65 }}>{todayTip}</div>
        </div>
      </div>

      {/* Career summary */}
      {careerSummary && (
        <div className="card" style={{ marginBottom:20, borderLeft:'4px solid var(--accent)', background:'var(--accent-dim)' }}>
          <div style={{ fontSize:11, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, fontWeight:700 }}>AI Career Assessment</div>
          <p style={{ fontSize:15, color:'var(--ink)', lineHeight:1.7, margin:0 }}>{careerSummary}</p>
        </div>
      )}

      {!skills.length && (
        <div className="card" style={{ marginBottom:20, borderLeft:'3px solid #3B82F6' }}>
          <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.65 }}>
            <strong>Get started:</strong> Add your skills and take assessments to unlock AI-powered recommendations tailored to your profile.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom:22, overflowX:'auto' }}>
        <div className="tabs" style={{ display:'flex', gap:4, flexWrap:'nowrap', minWidth:'max-content' }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab${activeTab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {/* Progress rings */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14 }}>
            {[
              { label:'Skill Mastery',   value:learningScore,                      color:'#3B82F6' },
              { label:'Profile Score',   value:score,                              color:'#16a34a' },
              { label:'Certs Earned',    value:certs.length ? Math.min(certs.length*20,100):0, color:'#6366f1' },
              { label:'Skills Added',    value:skills.length ? Math.min(skills.length*10,100):0, color:'#f97316' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ textAlign:'center', padding:'20px 14px' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                  <ProgressRing value={value} color={color} />
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink-2)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Skill gap spotlight */}
          {gaps.length > 0 && (
            <div className="card" style={{ borderLeft:'3px solid #dc2626' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ margin:0 }}>🚨 Skill Gaps to Address</h3>
                <button className="btn btn-ghost btn-xs" onClick={()=>setTab('skills')}>See recommendations →</button>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {gaps.map(g => <span key={g} className="badge badge-red" style={{ fontSize:12 }}>{g}</span>)}
              </div>
              <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:12, lineHeight:1.6 }}>
                These gaps were identified from your assessment scores. Start a learning path on the <strong>Certifications</strong> page to fill them.
              </div>
            </div>
          )}

          {/* Top priority skills */}
          {skillsToLearn.length > 0 && (
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ margin:0 }}>🎯 Top Priority Skills</h3>
                <button className="btn btn-ghost btn-xs" onClick={()=>setTab('skills')}>View all</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {skillsToLearn.filter(s=>s.priority==='high'||!s.priority).slice(0,3).map((skill,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:PRIORITY_BG[skill.priority]||'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🎯</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{skill.name}</div>
                      {skill.reason && <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.45 }}>{skill.reason.slice(0,100)}{skill.reason.length>100?'…':''}</div>}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                      {skill.priority && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:PRIORITY_BG[skill.priority], color:PRIORITY_COLOR[skill.priority], fontWeight:600 }}>{skill.priority}</span>}
                      {skill.estimatedWeeks && <span style={{ fontSize:11, color:'var(--ink-3)' }}>{skill.estimatedWeeks}w</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="card" style={{ borderTop:'3px solid #3B82F6', textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>📝</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Take an Assessment</div>
              <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.6, marginBottom:14 }}>Test your knowledge to identify gaps and boost your score.</div>
              {setPage && <button className="btn btn-primary btn-sm" onClick={()=>setPage('tests')}>Start Test</button>}
            </div>
            <div className="card" style={{ borderTop:'3px solid #16a34a', textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>🏅</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Start a Learning Path</div>
              <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.6, marginBottom:14 }}>Earn a verified certificate by completing structured modules.</div>
              {setPage && <button className="btn btn-primary btn-sm" style={{ background:'#16a34a' }} onClick={()=>setPage('certs')}>Browse Paths</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── ROADMAP ── */}
      {activeTab==='roadmap' && (
        <div className="card">
          <h3 style={{ marginBottom:6 }}>Your Personalised Learning Roadmap</h3>
          <p style={{ fontSize:13, color:'var(--ink-3)', marginBottom:22, lineHeight:1.6 }}>
            Follow these steps in order. Each step builds on the previous, ensuring a solid foundation before moving ahead.
          </p>
          {roadmap.length ? (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {roadmap.map((step, i) => (
                <div key={i} style={{ display:'flex', gap:18, paddingBottom:i<roadmap.length-1?28:0 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14, fontWeight:700 }}>{i+1}</div>
                    {i<roadmap.length-1 && <div style={{ width:2, flex:1, background:'var(--border)', marginTop:6 }} />}
                  </div>
                  <div style={{ flex:1, paddingTop:6, paddingBottom:4 }}>
                    <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>{step.title}</div>
                    {step.description && <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.7, marginBottom:10 }}>{step.description}</div>}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {step.duration && <span className="badge">⏱ {step.duration}</span>}
                      {step.outcome  && <span style={{ fontSize:12, color:'#16a34a', background:'rgba(22,163,74,0.10)', padding:'3px 10px', borderRadius:10 }}>✓ {step.outcome}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="🗺️" title="No roadmap yet" description="Add skills and take tests to generate your personalised roadmap." />}
        </div>
      )}

      {/* ── SKILLS TO LEARN ── */}
      {activeTab==='skills' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:4, lineHeight:1.65 }}>
            Skills recommended based on your current profile, assessments, and identified gaps. Prioritise high-urgency items first.
          </div>
          {skillsToLearn.length ? skillsToLearn.map((skill,i)=>(
            <div key={i} className="card" style={{ display:'flex', alignItems:'flex-start', gap:16, borderLeft:`3px solid ${PRIORITY_COLOR[skill.priority]||'var(--border)'}` }}>
              <div style={{ width:44, height:44, borderRadius:12, background:PRIORITY_BG[skill.priority]||'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🎯</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{skill.name}</div>
                  {skill.priority && <span style={{ fontSize:10, padding:'2px 9px', borderRadius:10, background:PRIORITY_BG[skill.priority], color:PRIORITY_COLOR[skill.priority], fontWeight:700, textTransform:'uppercase' }}>{skill.priority} priority</span>}
                </div>
                {skill.reason && <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.65, marginBottom:8 }}>{skill.reason}</div>}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {skill.estimatedWeeks && <span className="badge">⏱ ~{skill.estimatedWeeks} weeks to learn</span>}
                  {setPage && <button className="btn btn-ghost btn-xs" onClick={()=>setPage('certs')}>Start learning path →</button>}
                </div>
              </div>
            </div>
          )) : <EmptyState icon="🎯" title="No skills suggested" description="Your profile looks well-rounded! Add more gaps or take tests for recommendations." />}
        </div>
      )}

      {/* ── CERTIFICATIONS ── */}
      {activeTab==='certs' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:4, lineHeight:1.65 }}>
            Certifications recommended based on your skill level and career trajectory. Earning these will boost your profile score.
          </div>
          {nextCerts.length ? nextCerts.map((cert,i)=>(
            <div key={i} className="card" style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
              <div style={{ fontSize:36, flexShrink:0 }}>🏅</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{cert.name}</div>
                  {cert.difficulty && <span className={`badge badge-${cert.difficulty==='beginner'?'green':cert.difficulty==='intermediate'?'amber':'blue'}`}>{cert.difficulty}</span>}
                </div>
                {cert.reason && <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.65, marginBottom:10 }}>{cert.reason}</div>}
                {setPage && <button className="btn btn-ghost btn-xs" onClick={()=>setPage('certs')}>Start certification →</button>}
              </div>
            </div>
          )) : <EmptyState icon="🏅" title="No certifications suggested" description="Take more assessments to unlock personalised certification recommendations." />}
        </div>
      )}

      {/* ── RESOURCES ── */}
      {activeTab==='resources' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:4, lineHeight:1.65 }}>
            Curated learning resources tailored to your skill profile and goals. Sorted by relevance.
          </div>
          {resources.length ? resources.map((r,i)=>(
            <div key={i} className="card" style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
              <div style={{ width:46, height:46, borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                {TYPE_ICON[r.type]||'📖'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{r.title}</div>
                  {r.free  && <span className="badge badge-green"  style={{ fontSize:10 }}>Free</span>}
                  {r.type  && <span className="badge"              style={{ fontSize:10, textTransform:'capitalize' }}>{r.type}</span>}
                </div>
                {r.platform && <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:5 }}>Platform: <strong>{r.platform}</strong></div>}
                {r.why && <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.6, marginBottom:8 }}>{r.why}</div>}
                {r.url && r.url!=='' && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs" style={{ textDecoration:'none' }}>
                    Open Resource ↗
                  </a>
                )}
              </div>
            </div>
          )) : <EmptyState icon="📚" title="No resources yet" description="Resources will appear once AI analyses your skills and goals." />}
        </div>
      )}

      {/* ── WEEKLY PLAN ── */}
      {activeTab==='weekly' && (
        <div>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:18, lineHeight:1.65 }}>
            A structured weekly schedule to build consistent learning habits. Aim for at least 30 minutes of focused practice per session.
          </div>
          {weeklyPlan.length ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
              {weeklyPlan.map((item,i)=>(
                <div key={i} className="card" style={{ borderTop:'3px solid var(--accent)' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{item.day}</div>
                  <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.6, marginBottom:10 }}>{item.task}</div>
                  {item.duration && <span className="badge" style={{ fontSize:11 }}>⏱ {item.duration}</span>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📅" title="No weekly plan" description="Your weekly schedule will be generated once you have skill data and test history." />
          )}
        </div>
      )}

      {/* ── DAILY GOALS ── */}
      {activeTab==='goals' && (
        <div>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:18, lineHeight:1.65 }}>
            Tick off daily learning tasks to build a strong habit. Your progress resets each day — stay consistent!
          </div>
          <div className="card" style={{ marginBottom:18 }}>
            <h3 style={{ marginBottom:16 }}>📋 Today's Learning Checklist</h3>
            {[
              { key:'read',    label:'Read or watch a learning resource for 20+ minutes',          icon:'📖' },
              { key:'code',    label:'Write or review code for at least 30 minutes',               icon:'💻' },
              { key:'test',    label:'Take or review a skill assessment',                          icon:'📝' },
              { key:'review',  label:'Revisit a concept you learned last week (spaced repetition)', icon:'🔁' },
              { key:'note',    label:'Write down 3 things you learned today',                      icon:'✍️' },
              { key:'project', label:'Work on a personal or open-source project',                  icon:'🛠️' },
            ].map(task => (
              <div key={task.key}
                onClick={()=>toggleCheck(task.key)}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', marginBottom:8, borderRadius:'var(--r)', border:`1.5px solid ${checked[task.key]?'rgba(22,163,74,0.35)':'var(--border)'}`, background:checked[task.key]?'rgba(22,163,74,0.06)':'var(--surface-2)', cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${checked[task.key]?'#16a34a':'var(--border-2)'}`, background:checked[task.key]?'#16a34a':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                  {checked[task.key] && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize:13 }}>{task.icon}</span>
                <span style={{ fontSize:14, color:checked[task.key]?'var(--ink-3)':'var(--ink)', textDecoration:checked[task.key]?'line-through':'none', flex:1 }}>{task.label}</span>
              </div>
            ))}
            <div style={{ marginTop:14, padding:'12px 16px', background:'var(--surface-2)', borderRadius:'var(--r)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'var(--ink-3)' }}>
                {Object.values(checked).filter(Boolean).length} / 6 tasks completed today
              </span>
              <div style={{ width:120, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'#16a34a', borderRadius:3, width:`${(Object.values(checked).filter(Boolean).length/6)*100}%`, transition:'width 0.3s ease' }} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom:14 }}>🧠 Learning Principles</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['Deliberate Practice', 'Focus on the things you find hard, not what feels comfortable. Growth happens at the edge of your abilities.'],
                ['Retrieval Practice',  'Test yourself regularly instead of re-reading. The act of trying to remember strengthens memory far more than reviewing.'],
                ['Interleaving',        'Mix up different topics or skills in a single session rather than blocking one topic. It is harder but leads to better long-term retention.'],
                ['The Feynman Method',  'Try to explain a concept in simple language as if teaching a child. Gaps in your explanation reveal gaps in your understanding.'],
                ['Active Recall',       'Close your notes and try to write down everything you remember. This is more effective than highlighting or re-reading.'],
              ].map(([title, desc])=>(
                <div key={title} style={{ padding:'12px 16px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{title}</div>
                  <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.65 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft:'3px solid var(--red)', marginTop:20 }}>
          <div style={{ fontSize:14, color:'var(--ink-2)' }}>
            Could not load AI recommendations. Your profile summary and goals are still shown. Please check your connection and refresh to try again.
          </div>
        </div>
      )}
    </div>
  );
}


