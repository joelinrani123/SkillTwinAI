import { useState, useEffect } from 'react';
import { Spinner, EmptyState, Alert } from '../components/UI';

/* ── Career Goals & Roadmap Page ── */
/* New feature: Candidates can set career goals, track milestones, and visualize their progress */

const GOAL_TEMPLATES = [
  { title:'Become a Full Stack Developer', milestones:['Learn React basics','Master Node.js','Build 3 portfolio projects','Earn JS certification','Apply to 10 senior roles'], category:'Development', icon:'⚡' },
  { title:'Transition to Data Science', milestones:['Learn Python fundamentals','Complete ML course','Work on Kaggle datasets','Earn Data Science cert','Build ML portfolio project'], category:'Data', icon:'📊' },
  { title:'Land a DevOps Role', milestones:['Learn Docker & Kubernetes','Master CI/CD pipelines','Get AWS certification','Contribute to open source','Apply to DevOps positions'], category:'Infrastructure', icon:'🔧' },
  { title:'Become a UI/UX Designer', milestones:['Master Figma','Study design systems','Build 5 case studies','Learn user research','Create portfolio website'], category:'Design', icon:'🎨' },
];

const SKILL_CATEGORIES = ['Development','Data','Infrastructure','Design','Management','Security'];

function GoalCard({ goal, onToggleMilestone, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const done = goal.milestones.filter(m => m.done).length;
  const pct  = goal.milestones.length ? Math.round((done/goal.milestones.length)*100) : 0;
  const barColor = pct < 30 ? '#dc2626' : pct < 70 ? '#f97316' : '#16a34a';

  return (
    <div className="card" style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', flex:1 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(59,130,246,0.10)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{goal.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>{goal.title}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
              <span className="badge badge-blue">{goal.category}</span>
              <span style={{ fontSize:12, color:'var(--ink-3)' }}>{done}/{goal.milestones.length} milestones · {pct}% complete</span>
            </div>
            <div style={{ height:6, background:'var(--surface-3)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:4, transition:'width 0.5s ease' }} />
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button className="btn btn-ghost btn-xs" onClick={() => setExpanded(e=>!e)}>{expanded?'▲ Hide':'▼ Show'} milestones</button>
          <button className="btn btn-danger btn-xs" onClick={() => onDelete(goal.id)}>✕</button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, display:'flex', flexDirection:'column', gap:8 }}>
          {goal.milestones.map((m, i) => (
            <div key={i} onClick={() => onToggleMilestone(goal.id, i)}
              style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 10px', borderRadius:8, background:m.done?'rgba(22,163,74,0.06)':'transparent', border:`1px solid ${m.done?'rgba(22,163,74,0.15)':'var(--border)'}`, transition:'all 0.15s' }}>
              <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${m.done?'#16a34a':'var(--border-2)'}`, background:m.done?'#16a34a':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
                {m.done && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
              </div>
              <span style={{ fontSize:14, color:m.done?'#16a34a':'var(--ink-2)', textDecoration:m.done?'line-through':'none', fontWeight:m.done?500:400 }}>{typeof m === 'string' ? m : m.label}</span>
              {i === done && !m.done && <span className="badge badge-accent" style={{ fontSize:10, marginLeft:'auto' }}>Next up</span>}
            </div>
          ))}
        </div>
      )}

      {pct === 100 && (
        <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(22,163,74,0.08)', borderRadius:8, border:'1px solid rgba(22,163,74,0.2)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>🎉</span>
          <span style={{ fontSize:14, color:'#15803d', fontWeight:600 }}>Goal completed! Time to set a new challenge.</span>
        </div>
      )}
    </div>
  );
}

function AddGoalModal({ open, onClose, onAdd }) {
  const [mode, setMode] = useState('template');
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState({ title:'', category:'Development', icon:'⚡', milestones:[''] });

  const handleAdd = () => {
    if (mode === 'template' && selected !== null) {
      const tpl = GOAL_TEMPLATES[selected];
      onAdd({ ...tpl, id: Date.now(), milestones: tpl.milestones.map(m => ({ label:m, done:false })) });
    } else {
      const clean = custom.milestones.filter(m => m.trim());
      if (!custom.title.trim() || clean.length === 0) return;
      onAdd({ ...custom, id:Date.now(), milestones:clean.map(m => ({ label:m, done:false })) });
    }
    onClose();
    setSelected(null);
    setCustom({ title:'', category:'Development', icon:'⚡', milestones:[''] });
  };

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{ maxWidth:560 }}>
        <div className="modal-header">
          <h3>Add Career Goal</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink-3)' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {['template','custom'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`btn btn-sm ${mode===m?'btn-primary':'btn-ghost'}`}>
                {m==='template'?'From Template':'Custom Goal'}
              </button>
            ))}
          </div>

          {mode === 'template' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {GOAL_TEMPLATES.map((t, i) => (
                <div key={i} onClick={() => setSelected(i)}
                  style={{ padding:'14px 16px', borderRadius:10, border:`2px solid ${selected===i?'#3B82F6':'var(--border)'}`, background:selected===i?'rgba(59,130,246,0.06)':'var(--surface)', cursor:'pointer', transition:'all 0.15s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:22 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{t.title}</div>
                      <div style={{ fontSize:12, color:'var(--ink-3)' }}>{t.milestones.length} milestones · {t.category}</div>
                    </div>
                    {selected===i && <span className="badge badge-blue" style={{ marginLeft:'auto' }}>✓ Selected</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label className="form-label">Goal Title</label>
                <input value={custom.title} onChange={e => setCustom(c=>({...c,title:e.target.value}))} placeholder="e.g. Become a Senior Backend Engineer" />
              </div>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <div className="form-group" style={{ flex:1, marginBottom:0 }}>
                  <label className="form-label">Category</label>
                  <select value={custom.category} onChange={e => setCustom(c=>({...c,category:e.target.value}))}>
                    {SKILL_CATEGORIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ width:80, marginBottom:0 }}>
                  <label className="form-label">Icon</label>
                  <input value={custom.icon} onChange={e => setCustom(c=>({...c,icon:e.target.value}))} placeholder="🚀" maxLength={2} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Milestones</label>
                {custom.milestones.map((m, i) => (
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <input value={m} onChange={e => setCustom(c => { const ms=[...c.milestones]; ms[i]=e.target.value; return {...c,milestones:ms}; })} placeholder={`Milestone ${i+1}`} />
                    {custom.milestones.length>1 && <button className="btn btn-ghost btn-xs" onClick={() => setCustom(c=>({...c,milestones:c.milestones.filter((_,j)=>j!==i)}))}>✕</button>}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => setCustom(c=>({...c,milestones:[...c.milestones,'']}))}>+ Add Milestone</button>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={mode==='template'&&selected===null}>Add Goal</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CareerGoalsPage() {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('career_goals')||'[]'); } catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [success, setSuccess] = useState('');

  const save = (g) => { setGoals(g); localStorage.setItem('career_goals', JSON.stringify(g)); };

  const addGoal = (g) => { const updated=[...goals,g]; save(updated); setSuccess('Goal added successfully!'); setTimeout(()=>setSuccess(''),3000); };
  const deleteGoal = (id) => save(goals.filter(g=>g.id!==id));
  const toggleMilestone = (goalId, mIdx) => {
    save(goals.map(g => g.id!==goalId ? g : { ...g, milestones:g.milestones.map((m,i)=>i!==mIdx?m:{...m,done:!m.done}) }));
  };

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.milestones.every(m=>m.done)).length;
  const totalMilestones = goals.reduce((a,g)=>a+g.milestones.length,0);
  const doneMilestones  = goals.reduce((a,g)=>a+g.milestones.filter(m=>m.done).length,0);

  return (
    <div>
      {success && <Alert type="success" style={{ marginBottom:16 }}>{success}</Alert>}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:24 }}>
        {[
          ['🎯','Active Goals', totalGoals, 'var(--accent)'],
          ['✅','Completed', completedGoals, '#16a34a'],
          ['📌','Milestones Done', `${doneMilestones}/${totalMilestones}`, '#f97316'],
          ['📈','Overall Progress', totalMilestones?`${Math.round((doneMilestones/totalMilestones)*100)}%`:'—', '#3B82F6'],
        ].map(([icon,label,val,color]) => (
          <div key={label} className="card card-sm" style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color, marginBottom:4 }}>{val}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h3 style={{ marginBottom:4 }}>Career Roadmap</h3>
          <p style={{ fontSize:14, color:'var(--ink-3)' }}>Set goals, track milestones, and visualize your career journey</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Goal</button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon="🎯" title="No goals yet" description="Set your first career goal to start tracking your professional journey." action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add Your First Goal</button>} />
      ) : (
        goals.map(g => <GoalCard key={g.id} goal={g} onToggleMilestone={toggleMilestone} onDelete={deleteGoal} />)
      )}

      <AddGoalModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={addGoal} />
    </div>
  );
}
