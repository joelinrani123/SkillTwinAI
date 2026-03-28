import { useState, useEffect, useRef } from 'react';
import { Spinner, Alert } from '../components/UI';
import { api } from '../services/api';

function ProfileAvatar({ name, src, size = 80 }) {
  if (src) return <img src={src} alt="Profile" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />;
  const initials = (name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const cols = [['#dbeafe','#1d4ed8'],['#dcfce7','#15803d'],['#fce7f3','#9d174d'],['#ede9fe','#6d28d9'],['#fef3c7','#92400e']];
  const [bg,fg] = cols[(name?.charCodeAt(0)||0) % cols.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size*0.32, fontWeight: 700, color: fg, flexShrink: 0, border: '2px solid var(--border)', fontFamily: "Inter, sans-serif" }}>
      {initials}
    </div>
  );
}

export default function ProfilePage({ user, onRefresh }) {
  const fileRef = useRef(null);
  const isRecruiter = user?.role === 'recruiter';

  const [form, setForm] = useState({
    name: user?.name||'', title: user?.title||'', company: user?.company||'', bio: user?.bio||'',
    location: user?.location||'', github: user?.github||'', linkedin: user?.linkedin||'', avatar: user?.avatar||'',
  });
  const [projects,        setProjects]        = useState(user?.projects || []);
  const [education,       setEducation]       = useState(user?.education || []);
  const [newEdu,          setNewEdu]          = useState({ degree:'', institution:'', year:'', grade:'' });
  const [showEduForm,     setShowEduForm]     = useState(false);
  const [newProject,      setNewProject]      = useState({ name:'', description:'', link:'', tech:'' });
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [savingProj,      setSavingProj]      = useState(false);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);
  const [msg,             setMsg]             = useState('');
  const [msgType,         setMsgType]         = useState('success');

  useEffect(() => {
    if (user) {
      setForm({ name: user.name||'', title: user.title||'', company: user.company||'', bio: user.bio||'', location: user.location||'', github: user.github||'', linkedin: user.linkedin||'', avatar: user.avatar||'' });
      setProjects(user.projects || []);
      setEducation(user.education || []);
    }
  }, [user?._id]);

  const set   = (k,v) => setForm(f=>({...f,[k]:v}));
  const flash = (m, type='success') => { setMsg(m); setMsgType(type); setTimeout(()=>setMsg(''),3500); };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { flash('Photo must be under 2 MB.','error'); return; }
    setUploadingPhoto(true);
    try {
      const base64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
      setForm(f=>({...f,avatar:base64}));
      await api.users.updateProfile({ avatar: base64 });
      flash('Profile photo updated!');
      if (onRefresh) onRefresh();
    } catch(e) { flash(e.message||'Failed to upload photo.','error'); }
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await api.users.updateProfile(form); flash('Profile saved!'); if (onRefresh) onRefresh(); }
    catch(e) { flash(e.message||'Save failed.','error'); }
    setSaving(false);
  };

  const addProject = async () => {
    if (!newProject.name.trim()) return;
    setSavingProj(true);
    try {
      const entry = { ...newProject, id: Date.now().toString(), tech: newProject.tech.split(',').map(t=>t.trim()).filter(Boolean) };
      const updated = [...projects, entry];
      await api.users.updateProfile({ ...form, projects: updated });
      setProjects(updated); setNewProject({ name:'',description:'',link:'',tech:'' }); setShowProjectForm(false);
      flash('Project added!'); if (onRefresh) onRefresh();
    } catch(e) { flash(e.message||'Failed.','error'); }
    setSavingProj(false);
  };

  const removeProject = async (id) => {
    const updated = projects.filter(p=>(p.id||p._id?.toString())!==id);
    setProjects(updated);
    await api.users.updateProfile({ ...form, projects: updated }).catch(()=>{});
    if (onRefresh) onRefresh();
  };

  const addEducation = async () => {
    if (!newEdu.degree.trim() || !newEdu.institution.trim()) return;
    const updated = [...education, { ...newEdu, id: Date.now().toString() }];
    setEducation(updated);
    setNewEdu({ degree:'', institution:'', year:'', grade:'' });
    setShowEduForm(false);
    await api.users.updateProfile({ education: updated }).catch(() => {});
    if (onRefresh) onRefresh();
  };

  const removeEducation = async (idx) => {
    const updated = education.filter((_, i) => i !== idx);
    setEducation(updated);
    await api.users.updateProfile({ education: updated }).catch(() => {});
    if (onRefresh) onRefresh();
  };

  const score = user?.overallScore || 0;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h2>Profile</h2>
        <p style={{ fontSize: 16, color: 'var(--ink-3)', marginTop: 6 }}>Your professional profile visible to recruiters.</p>
      </div>

      {msg && <Alert type={msgType} style={{ marginBottom: 18 }}>{msg}</Alert>}

      {/* Header card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProfileAvatar name={form.name} src={form.avatar} size={80} />
          <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} title="Change photo"
            style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            {uploadingPhoto
              ? <Spinner size={12} color="white" />
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:'none' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{form.name||'Your Name'}</div>
          <div style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 10 }}>{form.title||'Add your job title'}{form.location ? ` · ${form.location}` : ''}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {score > 0 && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>Score: {score}%</span>}
            <span className="badge">{user?.role === 'user' ? 'Candidate' : user?.role || 'Candidate'}</span>
            {form.github   && <a href={form.github}   target="_blank" rel="noreferrer" className="badge badge-blue"  style={{ textDecoration:'none' }}>GitHub</a>}
            {form.linkedin && <a href={form.linkedin} target="_blank" rel="noreferrer" className="badge badge-teal" style={{ textDecoration:'none' }}>LinkedIn</a>}
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'right', flexShrink: 0 }}>Click the icon<br/>to change photo</div>
      </div>

      {/* Edit form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 22 }}>Edit Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div className="form-group"><label className="form-label">Full Name</label><input value={form.name}     onChange={e=>set('name',e.target.value)}     placeholder="Your full name" /></div>
          <div className="form-group"><label className="form-label">Job Title</label><input value={form.title}   onChange={e=>set('title',e.target.value)}    placeholder="e.g. Frontend Developer" /></div>
          {isRecruiter && <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Company Name</label><input value={form.company} onChange={e=>set('company',e.target.value)} placeholder="e.g. Acme Corp" /></div>}
          <div className="form-group"><label className="form-label">Location</label><input value={form.location} onChange={e=>set('location',e.target.value)} placeholder="City, Country" /></div>
          <div className="form-group"><label className="form-label">GitHub URL</label><input value={form.github}  onChange={e=>set('github',e.target.value)}   placeholder="https://github.com/username" /></div>
          <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">LinkedIn URL</label><input value={form.linkedin} onChange={e=>set('linkedin',e.target.value)} placeholder="https://linkedin.com/in/username" /></div>
          <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Bio</label><textarea rows={3} value={form.bio} onChange={e=>set('bio',e.target.value)} placeholder="A short description of yourself…" /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', paddingTop: 8 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner size={14} color="white" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Summary stats — candidates only */}
      {!isRecruiter && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 18 }}>Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[
              { label: 'Skills',         value: (user?.skills||[]).length },
              { label: 'Certifications', value: (user?.certifications||[]).filter(c=>c.completed).length },
              { label: 'Projects',       value: projects.length },
              { label: 'Tests Taken',    value: (user?.testResults||[]).length },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', padding: '18px 12px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 30, color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>{value}</div>
                <div className="label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education — candidates only */}
      {!isRecruiter && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3>Educational Qualifications</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowEduForm(s=>!s)}>
              {showEduForm ? '✕ Cancel' : '+ Add Education'}
            </button>
          </div>

          {showEduForm && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Degree / Qualification *</label><input value={newEdu.degree} onChange={e=>setNewEdu(p=>({...p,degree:e.target.value}))} placeholder="e.g. B.Tech Computer Science" /></div>
                <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Institution *</label><input value={newEdu.institution} onChange={e=>setNewEdu(p=>({...p,institution:e.target.value}))} placeholder="University / College name" /></div>
                <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Year of Completion</label><input value={newEdu.year} onChange={e=>setNewEdu(p=>({...p,year:e.target.value}))} placeholder="e.g. 2024" /></div>
                <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Grade / CGPA</label><input value={newEdu.grade} onChange={e=>setNewEdu(p=>({...p,grade:e.target.value}))} placeholder="e.g. 8.5 CGPA / First Class" /></div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={addEducation} disabled={!newEdu.degree.trim()||!newEdu.institution.trim()}>
                  Add Education
                </button>
              </div>
            </div>
          )}

          {education.length === 0 && !showEduForm ? (
            <div style={{ textAlign:'center', padding:'30px 0', color:'var(--ink-3)', fontSize:15 }}>No education added yet. Click "+ Add Education" to add your qualifications.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {education.map((e, idx) => (
                <div key={idx} style={{ padding:'14px 18px', background:'var(--surface-2)', borderRadius:10, border:'1px solid var(--border)', display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:3 }}>{e.degree}</div>
                    <div style={{ fontSize:14, color:'var(--ink-2)' }}>{e.institution}</div>
                    <div style={{ display:'flex', gap:10, marginTop:6, flexWrap:'wrap' }}>
                      {e.year  && <span className="badge" style={{ fontSize:12 }}>📅 {e.year}</span>}
                      {e.grade && <span className="badge badge-green" style={{ fontSize:12 }}>🎓 {e.grade}</span>}
                    </div>
                  </div>
                  <button onClick={() => removeEducation(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-3)', fontSize:20, padding:'2px 4px', flexShrink:0, lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects — candidates only */}
      {!isRecruiter && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3>Projects</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowProjectForm(s=>!s)}>
              {showProjectForm ? '✕ Cancel' : '+ Add Project'}
            </button>
          </div>

          {showProjectForm && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Project Name *</label><input value={newProject.name} onChange={e=>setNewProject(p=>({...p,name:e.target.value}))} placeholder="My Project" /></div>
                <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Link</label><input value={newProject.link} onChange={e=>setNewProject(p=>({...p,link:e.target.value}))} placeholder="https://github.com/…" /></div>
                <div className="form-group" style={{ marginBottom:0, gridColumn:'1/-1' }}><label className="form-label">Technologies (comma-separated)</label><input value={newProject.tech} onChange={e=>setNewProject(p=>({...p,tech:e.target.value}))} placeholder="React, Node.js, MongoDB…" /></div>
                <div className="form-group" style={{ marginBottom:0, gridColumn:'1/-1' }}><label className="form-label">Description</label><textarea rows={2} value={newProject.description} onChange={e=>setNewProject(p=>({...p,description:e.target.value}))} placeholder="What does this project do?" /></div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={addProject} disabled={savingProj||!newProject.name.trim()}>
                  {savingProj ? <Spinner size={13} color="white" /> : 'Add Project'}
                </button>
              </div>
            </div>
          )}

          {projects.length === 0 && !showProjectForm ? (
            <div style={{ textAlign:'center', padding:'30px 0', color:'var(--ink-3)', fontSize:15 }}>No projects added yet. Click "+ Add Project" to showcase your work.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {projects.map(p => (
                <div key={p.id||p._id} style={{ padding:'16px 20px', background:'var(--surface-2)', borderRadius:10, border:'1px solid var(--border)', display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:16, fontWeight:600, color:'var(--ink)' }}>{p.name}</span>
                      {(p.link||p.url) && <a href={p.link||p.url} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'var(--accent)', textDecoration:'none', padding:'2px 10px', borderRadius:5, background:'var(--accent-dim)', border:'1px solid var(--border)' }}>View →</a>}
                    </div>
                    {p.description && <div style={{ fontSize:15, color:'var(--ink-2)', lineHeight:1.65, marginBottom:8 }}>{p.description}</div>}
                    {(Array.isArray(p.tech)?p.tech:[]).length > 0 && <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>{p.tech.map(t=><span key={t} className="tag">{t}</span>)}</div>}
                  </div>
                  <button onClick={() => removeProject(p.id||p._id?.toString())} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-3)', fontSize:20, padding:'2px 4px', flexShrink:0, lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}