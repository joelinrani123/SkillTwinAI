import { useState, useEffect } from 'react';
import { Modal, Spinner, EmptyState, Alert } from '../components/UI';
import { api } from '../services/api';

const CATEGORIES = ['Frontend','Backend','DevOps','Database','Mobile','AI/ML','Design','Other'];
const levelLabel = l => l >= 80 ? 'Expert' : l >= 60 ? 'Advanced' : l >= 40 ? 'Intermediate' : 'Beginner';

/* Green for high, secondary grey for mid, red for low */
const levelColor = l => {
  if (l >= 75) return '#16a34a'; // green
  if (l >= 50) return '#6B7280'; // secondary grey
  return '#dc2626';               // red
};

export default function SkillsPage({ user, onRefresh }) {
  const [skills,    setSkills]    = useState([]);
  const [gaps,      setGaps]      = useState([]);
  const [filter,    setFilter]    = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState({ name: '', category: 'Other' });
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState('');
  const [msg,       setMsg]       = useState('');
  const [msgType,   setMsgType]   = useState('success');

  useEffect(() => {
    api.skills.getAll()
      .then(d => { setSkills(d.skills || []); setGaps(d.gaps || []); })
      .catch(() => { setSkills(user?.skills || []); setGaps(user?.gaps || []); });
  }, []);

  const flash = (m, type = 'success') => { setMsg(m); setMsgType(type); setTimeout(() => setMsg(''), 3500); };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await api.skills.add({ name: form.name.trim(), category: form.category });
      setSkills(res.skills || []);
      setShowAdd(false);
      setForm({ name: '', category: 'Other' });
      flash('Skill added! Take an assessment to build your proficiency level.');
      if (onRefresh) onRefresh();
    } catch (e) { flash(e.message || 'Failed to add skill.', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      const res = await api.skills.remove(id);
      setSkills(res.skills || []);
      if (onRefresh) onRefresh();
    } catch (e) { flash(e.message || 'Failed to remove skill.', 'error'); }
    setDeleting('');
  };

  const handleRemoveGap = async (name) => {
    try {
      const res = await api.skills.removeGap(name);
      setGaps(res.gaps || []);
    } catch (e) { flash(e.message || 'Failed.', 'error'); }
  };

  const cats     = ['All', ...Array.from(new Set(skills.map(s => s.category || 'Other')))];
  const filtered = skills.filter(s => {
    const matchText = !filter || s.name.toLowerCase().includes(filter.toLowerCase());
    const matchCat  = catFilter === 'All' || s.category === catFilter;
    return matchText && matchCat;
  });
  const avgLevel = skills.length ? Math.round(skills.reduce((a,s) => a+(s.level||0),0)/skills.length) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>My Skills</h2>
          <p style={{ color: 'var(--ink-3)', marginTop: 6, fontSize: 16 }}>
            Add skills, then take assessments to build your proficiency. Skill levels drop 2 pts per inactive day.
          </p>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 15 }} onClick={() => { setShowAdd(true); setForm({ name: '', category: 'Other' }); }}>
          + Add Skill
        </button>
      </div>

      {msg && <Alert type={msgType} style={{ marginBottom: 16 }}>{msg}</Alert>}

      {/* Stats */}
      {skills.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 26 }}>
          {[
            ['Total Skills', skills.length,                                '#3B82F6'],
            ['Avg Level',    `${avgLevel}%`,                               levelColor(avgLevel)],
            ['Expert',       skills.filter(s=>s.level>=80).length,         '#16a34a'],
            ['Advanced',     skills.filter(s=>s.level>=60&&s.level<80).length, '#6B7280'],
            ['Intermediate', skills.filter(s=>s.level>=40&&s.level<60).length, '#6B7280'],
            ['Beginner',     skills.filter(s=>s.level<40).length,          '#dc2626'],
          ].map(([lbl,val,clr]) => (
            <div key={lbl} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 26, fontWeight: 700, color: clr, marginBottom: 4 }}>{val}</div>
              <div className="label">{lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {skills.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search skills…" style={{ width: 240, fontSize: 15 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} className={`btn btn-sm ${catFilter===c ? 'btn-primary' : 'btn-ghost'}`}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {skills.length === 0 ? (
        <EmptyState icon="◈" title="No skills added yet"
          description="Add your first skill to start tracking. Proficiency is built through assessments — not set manually."
          action={<button className="btn btn-primary btn-lg" onClick={() => setShowAdd(true)}>Add Your First Skill</button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="◎" title="No matching skills" description="Try a different search or filter." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(skill => {
            const clr = levelColor(skill.level);
            return (
              <div key={skill._id} className="card" style={{ position: 'relative', overflow: 'hidden', padding: '18px 20px 16px 24px' }}>
                {/* Coloured left border — red/amber/green */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: clr }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{skill.name}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{skill.category || 'Other'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {/* Level % in red/amber/green */}
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 700, color: clr }}>{skill.level}%</div>
                    <div style={{ fontSize: 12, color: clr, fontWeight: 600, marginTop: 2 }}>{levelLabel(skill.level)}</div>
                  </div>
                </div>
                {/* Progress bar coloured red/amber/green */}
                <div style={{ background: `${clr}22`, borderRadius: 4, overflow: 'hidden', height: 7, marginBottom: 12 }}>
                  <div style={{ width: `${skill.level}%`, height: '100%', borderRadius: 4, background: clr, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>Improve via assessments</span>
                  <button className="btn btn-xs btn-ghost" onClick={() => handleDelete(skill._id)} disabled={deleting===skill._id}
                    style={{ color: '#dc2626', borderColor: 'transparent' }}>
                    {deleting===skill._id ? <Spinner size={11} /> : 'Remove'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skill Gaps */}
      <div style={{ marginTop: 44 }}>
        <h3 style={{ marginBottom: 8 }}>Skill Gaps</h3>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 18, lineHeight: 1.65 }}>
          Skills drop here automatically when you're inactive for a day or more. Take assessments to remove a gap and rebuild your level.
        </p>
        {gaps.length === 0 ? (
          <div style={{ padding: '16px 20px', background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.22)', borderRadius: 'var(--r)', fontSize: 15, color: '#15803d' }}>
            ✓ No skill gaps — keep taking assessments to stay active!
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {gaps.map(g => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.22)', borderRadius: 8 }}>
                <span style={{ fontSize: 15, color: '#dc2626', fontWeight: 500 }}>{g}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>inactive</span>
                <button onClick={() => handleRemoveGap(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add a Skill" width={460}>
        <div style={{ padding: '4px 0' }}>
          <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.10)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.25)', marginBottom: 22, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            Proficiency starts at Beginner (30%) and only increases through assessments and learning paths.
          </div>
          <div className="form-group">
            <label className="form-label">Skill Name *</label>
            <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleAdd()} placeholder="e.g. React, Python, Docker…" autoFocus style={{ fontSize: 16 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} style={{ fontSize: 16 }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !form.name.trim()}>
              {saving ? <><Spinner size={14} color="white" /> Adding…</> : 'Add Skill'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
