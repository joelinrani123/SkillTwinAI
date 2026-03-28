import { useState, useEffect } from 'react';
import { Avatar, Spinner, EmptyState, Alert, Modal } from '../components/UI';
import { api } from '../services/api';

const scoreColor = s => s >= 60 ? '#16a34a' : s >= 40 ? '#6B7280' : '#dc2626';

function Stat({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--ink)', lineHeight: 1, marginBottom: 5 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{value} · {pct}%</span>
      </div>
      <div className="progress-bar" style={{ height: 7 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color || 'var(--accent)' }} />
      </div>
    </div>
  );
}

/* ── OVERVIEW ── */
function OverviewTab({ stats, users, loading }) {
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={26} /></div>;
  const candidates = users.filter(u => u.role === 'candidate');
  const recruiters = users.filter(u => u.role === 'recruiter');
  const admins     = users.filter(u => u.role === 'admin');
  const total      = users.length || 1;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), count: users.filter(u => u.createdAt?.slice(0, 10) === ds).length };
  });
  const maxBar = Math.max(...last7.map(x => x.count), 1);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <Stat label="Total Users"    value={total - 1}          color="var(--accent)" />
        <Stat label="Candidates"     value={candidates.length}  color="#3B82F6" />
        <Stat label="Recruiters"     value={recruiters.length}  color="var(--green)" />
        <Stat label="Job Postings"   value={stats?.jobPostings ?? '—'} color="#3B82F6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Stat label="Total Tests"    value={stats?.totalTests ?? stats?.testsTaken ?? '—'} color="var(--purple)" />
        <Stat label="Avg Score"      value={stats?.avgScore ? `${stats.avgScore}%` : '—'}  color={scoreColor(stats?.avgScore || 0)} />
        <Stat label="Certificates"   value={stats?.certificates ?? '—'} color="var(--blue)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="section-header"><h3>User Breakdown</h3></div>
          <Bar label="Candidates" value={candidates.length} max={total} color="#3B82F6" />
          <Bar label="Recruiters" value={recruiters.length} max={total} color="var(--green)" />
          <Bar label="Admins"     value={admins.length}     max={total} color="var(--purple)" />
        </div>
        <div className="card">
          <div className="section-header"><h3>New Users — Last 7 Days</h3></div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {last7.map(({ label, count }) => (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 9, color: count > 0 ? 'var(--accent)' : 'var(--ink-4)', fontWeight: 700 }}>{count > 0 ? count : ''}</div>
                <div style={{ width: '100%', height: Math.max(4, Math.round((count / maxBar) * 64)), background: count > 0 ? 'var(--accent)' : 'var(--surface-3)', borderRadius: 3 }} />
                <div style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header"><h3>Recently Registered</h3><span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Latest 8</span></div>
        {users.slice(0, 8).map(u => (
          <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
            <Avatar name={u.name} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{u.email}</div>
            </div>
            <span className={`badge ${u.role === 'admin' ? 'badge-purple' : u.role === 'recruiter' ? 'badge-teal' : 'badge-blue'}`} style={{ fontSize: 11 }}>{u.role}</span>
            {u.overallScore > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(u.overallScore), minWidth: 36, textAlign: 'right' }}>{u.overallScore}%</span>}
            <div style={{ fontSize: 11, color: 'var(--ink-4)', minWidth: 68, textAlign: 'right' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── USER DETAIL MODAL ── */
function UserDetailModal({ u, open, onClose, onRoleChange, onDelete, onResetSkills }) {
  const [tab, setTab] = useState('info');
  if (!u) return null;
  const skills = u.skills || [];
  const certs  = (u.certifications || []).filter(c => c.completed);
  return (
    <Modal open={open} onClose={() => { onClose(); setTab('info'); }} title={u.name} width={600}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)', marginBottom: 14 }}>
        <Avatar name={u.name} size={46} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{u.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{u.email}</div>
          <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge ${u.role === 'admin' ? 'badge-purple' : u.role === 'recruiter' ? 'badge-teal' : 'badge-blue'}`}>{u.role}</span>
            {u.overallScore > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(u.overallScore) }}>{u.overallScore}%</span>}
          </div>
        </div>
      </div>
      <div className="tabs" style={{ marginBottom: 14 }}>
        {[['info','Info'],['skills',`Skills (${skills.length})`],['certs',`Certs (${certs.length})`]].map(([id,lbl]) => (
          <button key={id} className={`tab${tab===id?' active':''}`} onClick={() => setTab(id)}>{lbl}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
            {[['Title', u.title||'—'],['Location', u.location||'—'],['Joined', u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'],['Projects', (u.projects||[]).length]].map(([l,v]) => (
              <div key={l} style={{ padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>
          {u.bio && <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)', marginBottom: 14 }}>{u.bio}</div>}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase' }}>Change Role</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['candidate','recruiter','admin'].map(r => (
                <button key={r} className={`btn btn-sm ${u.role===r?'btn-primary':'btn-ghost'}`} onClick={() => onRoleChange(u._id, r)} style={{ textTransform: 'capitalize' }}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onResetSkills(u._id)}>↺ Reset Skills</button>
            <button className="btn btn-danger btn-sm" onClick={() => { onDelete(u._id); onClose(); }}>🗑 Delete User</button>
          </div>
        </div>
      )}
      {tab === 'skills' && (
        skills.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>No skills.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 14px' }}>
            {skills.sort((a,b)=>b.level-a.level).map(s => (
              <div key={s.name} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(s.level) }}>{s.level}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${s.level}%`, background: scoreColor(s.level) }} /></div>
              </div>
            ))}
          </div>
      )}
      {tab === 'certs' && (
        certs.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>No certificates.</div>
        : certs.map((c,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: 'rgba(5,150,105,0.07)', borderRadius: 'var(--r)', border: '1px solid rgba(5,150,105,0.16)', marginBottom: 7 }}>
              <span>🏅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                {c.issuedAt && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{new Date(c.issuedAt).toLocaleDateString()}</div>}
              </div>
              {c.earnedScore && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{c.earnedScore}%</span>}
            </div>
          ))
      )}
    </Modal>
  );
}

/* ── USER MANAGEMENT ── */
function UserManagementTab({ users, setUsers }) {
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy,     setSortBy]     = useState('createdAt');
  const [msg,        setMsg]        = useState({ text: '', type: 'success' });
  const [viewUser,   setViewUser]   = useState(null);

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'success' }), 3000); };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this user?')) return;
    try { await api.admin.deleteUser(id); setUsers(u => u.filter(x => x._id !== id)); flash('User deleted.'); }
    catch (e) { flash(e.message || 'Failed', 'error'); }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.admin.updateRole(id, role);
      setUsers(u => u.map(x => x._id === id ? { ...x, role } : x));
      setViewUser(v => v?._id === id ? { ...v, role } : v);
      flash('Role updated.');
    } catch (e) { flash(e.message || 'Failed', 'error'); }
  };

  const handleResetSkills = async (id) => {
    if (!confirm('Reset all skill levels to 0 for this user?')) return;
    try {
      await api.admin.resetSkills(id);
      setUsers(u => u.map(x => x._id === id ? { ...x, skills: (x.skills||[]).map(s=>({...s,level:0})), overallScore:0 } : x));
      flash('Skills reset.');
    } catch (e) { flash(e.message || 'Failed', 'error'); }
  };

  const filtered = users
    .filter(u => {
      const ms = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
      const mr = !roleFilter || u.role === roleFilter;
      return ms && mr;
    })
    .sort((a, b) => {
      if (sortBy === 'name')  return (a.name||'').localeCompare(b.name||'');
      if (sortBy === 'score') return (b.overallScore||0) - (a.overallScore||0);
      if (sortBy === 'role')  return (a.role||'').localeCompare(b.role||'');
      return new Date(b.createdAt||0) - new Date(a.createdAt||0);
    });

  return (
    <div>
      {msg.text && <Alert type={msg.type} style={{ marginBottom: 12 }}>{msg.text}</Alert>}
      <div style={{ display: 'flex', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <input style={{ flex: 1, minWidth: 180 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 140 }}>
          <option value="">All Roles</option>
          <option value="candidate">Candidate</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 155 }}>
          <option value="createdAt">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="score">Highest score</option>
          <option value="role">By role</option>
        </select>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> users</div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Score</th><th>Skills</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={u.name} size={30} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                      {u.title && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{u.title}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{u.email}</td>
                <td>
                  <select value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)}
                    style={{ width: 'auto', padding: '3px 6px', fontSize: 12, border: '1px solid var(--border-2)', borderRadius: 5 }}>
                    <option value="candidate">Candidate</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{u.overallScore > 0 ? <span style={{ fontWeight: 700, color: scoreColor(u.overallScore), fontSize: 13 }}>{u.overallScore}%</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{(u.skills||[]).length}</td>
                <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => setViewUser(u)}>View</button>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(u._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <EmptyState icon="👥" title="No users found" description="Adjust your search or filter." />}

      <UserDetailModal u={viewUser} open={!!viewUser} onClose={() => setViewUser(null)}
        onRoleChange={handleRoleChange} onDelete={handleDelete} onResetSkills={handleResetSkills} />
    </div>
  );
}

/* ── JOB MANAGEMENT ── */
function JobManagementTab() {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState({ text: '', type: 'success' });

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'success' }), 3000); };
  useEffect(() => { api.jobs.getAll().then(d => { setJobs(d.jobs||[]); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const del = async id => {
    if (!confirm('Delete this job posting?')) return;
    try { await api.jobs.delete(id); setJobs(j => j.filter(x => x._id !== id)); flash('Job deleted.'); }
    catch (e) { flash(e.message||'Failed', 'error'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={24} /></div>;

  return (
    <div>
      {msg.text && <Alert type={msg.type} style={{ marginBottom: 12 }}>{msg.text}</Alert>}
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>{jobs.length} total postings across all recruiters</div>
      {jobs.length === 0
        ? <EmptyState icon="💼" title="No job postings" description="No recruiters have posted jobs yet." />
        : <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Job</th><th>Company</th><th>Type</th><th>Applicants</th><th>Min Score</th><th>Posted</th><th>Action</th></tr></thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job._id}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{job.title}</div>
                      {job.location && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{job.location}</div>}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{job.company||'—'}</td>
                    <td><span className="badge">{job.type}</span></td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{job.applicants||0}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{job.minScore>0?`${job.minScore}%`:'—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}</td>
                    <td><button className="btn btn-danger btn-xs" onClick={() => del(job._id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}

/* ── ANALYTICS ── */
function AnalyticsTab({ stats, users }) {
  const candidates = users.filter(u => u.role === 'candidate');
  const withSkills = candidates.filter(u => (u.skills||[]).length > 0);
  const avgSkills  = withSkills.length ? Math.round(withSkills.reduce((a,u) => a+(u.skills||[]).length, 0) / withSkills.length) : 0;

  const skillCount = {};
  candidates.forEach(u => (u.skills||[]).forEach(s => { skillCount[s.name] = (skillCount[s.name]||0)+1; }));
  const topSkills = Object.entries(skillCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxSkill  = topSkills[0]?.[1]||1;

  const buckets = {'0-20':0,'21-40':0,'41-60':0,'61-80':0,'81-100':0};
  candidates.filter(u=>u.overallScore>0).forEach(u=>{
    const s=u.overallScore;
    if(s<=20)buckets['0-20']++;else if(s<=40)buckets['21-40']++;else if(s<=60)buckets['41-60']++;else if(s<=80)buckets['61-80']++;else buckets['81-100']++;
  });
  const maxBucket = Math.max(...Object.values(buckets),1);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <Stat label="Avg Score"       value={stats?.avgScore ? `${stats.avgScore}%` : '—'} color={scoreColor(stats?.avgScore||0)} />
        <Stat label="Users w/ Skills" value={withSkills.length}  color="#3B82F6" />
        <Stat label="Avg Skills/User" value={avgSkills}          color="var(--accent)" />
        <Stat label="Total Certs"     value={stats?.certificates??'—'} color="var(--green)" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="section-header"><h3>Most Common Skills</h3></div>
          {topSkills.length===0
            ? <div style={{ fontSize:13,color:'var(--ink-3)' }}>No skill data yet.</div>
            : topSkills.map(([name,count]) => <Bar key={name} label={name} value={count} max={maxSkill} color="var(--accent)" />)}
        </div>
        <div className="card">
          <div className="section-header"><h3>Score Distribution</h3></div>
          <div style={{ display:'flex',gap:6,alignItems:'flex-end',height:100,marginBottom:8 }}>
            {Object.entries(buckets).map(([range,count]) => (
              <div key={range} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                <div style={{ fontSize:10,color:'var(--ink-3)',fontWeight:700 }}>{count||''}</div>
                <div style={{ width:'100%',height:Math.max(4,Math.round((count/maxBucket)*80)),background:count>0?'var(--accent)':'var(--surface-3)',borderRadius:3 }} />
                <div style={{ fontSize:10,color:'var(--ink-4)' }}>{range}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11,color:'var(--ink-3)',textAlign:'center' }}>Score % ranges</div>
        </div>
      </div>
    </div>
  );
}

/* ── BROADCAST ── */
function BroadcastTab({ users }) {
  const [subject,setSubject]=useState('');
  const [body,   setBody]   =useState('');
  const [role,   setRole]   =useState('');
  const [sending,setSending]=useState(false);
  const [msg,    setMsg]    =useState({text:'',type:'success'});
  const [sent,   setSent]   =useState([]);

  const targets = role ? users.filter(u=>u.role===role) : users;

  const send = async () => {
    if(!body.trim()){setMsg({text:'Message required.',type:'error'});return;}
    if(!targets.length){setMsg({text:'No recipients.',type:'error'});return;}
    setSending(true);
    let ok=0,fail=0;
    for(const u of targets){
      try{ await api.messages.send({toUserId:u._id,message:body.trim(),subject:subject.trim()||'Platform Announcement'}); ok++; }
      catch{ fail++; }
    }
    setSending(false);
    setSent(p=>[{subject:subject||'Announcement',role:role||'all',count:ok,date:new Date().toLocaleString()},...p]);
    setMsg({text:`Sent to ${ok} user${ok!==1?'s':''}${fail>0?` (${fail} failed)`:''}.`,type:'success'});
    setSubject('');setBody('');
    setTimeout(()=>setMsg({text:'',type:'success'}),4000);
  };

  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 320px',gap:16 }}>
      <div className="card">
        <h3 style={{ marginBottom:16 }}>Send Broadcast Message</h3>
        {msg.text && <Alert type={msg.type} style={{ marginBottom:12 }}>{msg.text}</Alert>}
        
        <div className="card">
          <h3 style={{ marginBottom:16 }}>Platform</h3>
          <div className="form-group">
            <label className="form-label">Platform name</label>
            <input value={settings.systemName} onChange={e=>set('systemName',e.target.value)} />
          </div>
          <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'10px 12px',background:settings.maintenanceMode?'rgba(217,119,6,0.07)':'var(--surface-2)',borderRadius:'var(--r)',border:'1px solid var(--border)',marginBottom:10 }}>
            <input type="checkbox" checked={settings.maintenanceMode} onChange={e=>set('maintenanceMode',e.target.checked)} style={{ width:'auto' }} />
            <div>
              <div style={{ fontSize:13,fontWeight:600 }}>Maintenance Mode</div>
              <div style={{ fontSize:11.5,color:'var(--ink-3)' }}>Blocks non-admin logins</div>
            </div>
            {settings.maintenanceMode&&<span className="badge badge-amber" style={{ marginLeft:'auto' }}>ON</span>}
          </label>
          <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'10px 12px',background:'var(--surface-2)',borderRadius:'var(--r)',border:'1px solid var(--border)' }}>
            <input type="checkbox" checked={settings.allowRegistration} onChange={e=>set('allowRegistration',e.target.checked)} style={{ width:'auto' }} />
            <div>
              <div style={{ fontSize:13,fontWeight:600 }}>Allow Registration</div>
              <div style={{ fontSize:11.5,color:'var(--ink-3)' }}>New users can sign up</div>
            </div>
          </label>
        </div>
      </div>
      <div className="card" style={{ border:'1px solid rgba(220,38,38,0.18)',background:'rgba(220,38,38,0.025)',marginBottom:16 }}>
        <h3 style={{ marginBottom:6 }}>⚠️ Danger Zone</h3>
        <p style={{ fontSize:13,color:'var(--ink-3)',marginBottom:14 }}>These actions are irreversible.</p>
        <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>alert('Export CSV — backend endpoint required.')}>📤 Export Users CSV</button>
          <button className="btn btn-danger btn-sm" onClick={()=>alert('Would clear all test history in production.')}>Clear All Test History</button>
          <button className="btn btn-danger btn-sm" onClick={()=>alert('Would reset all skill levels in production.')}>Reset All Skill Levels</button>
        </div>
      </div>
      <div style={{ display:'flex',justifyContent:'flex-end' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<><Spinner size={12} color="white"/> Saving…</>:'✓ Save Settings'}</button>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function AdminPage({ user, page, setPage }) {
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.admin.stats(), api.admin.users()])
      .then(([s,u]) => { setStats(s); setUsers(u.users||[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activePage = page || 'admin';
  const tabs = [
    { id:'admin',           label:'📊 Overview' },
    { id:'admin-users',     label:`👥 Users (${users.length})` },
    { id:'admin-jobs',      label:'💼 Jobs' },
    { id:'admin-analytics', label:'📈 Analytics' },
    { id:'admin-broadcast', label:'📢 Broadcast' },
    { id:'admin-settings',  label:'⚙️ Settings' },
  ];

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2>Admin Panel</h2>
        <p style={{ color:'var(--ink-3)',marginTop:3,fontSize:13.5 }}>Manage users, jobs, analytics, and platform settings.</p>
      </div>
      <div style={{ marginBottom:20 }}>
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab${activePage===t.id?' active':''}`} onClick={()=>setPage(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      {activePage==='admin'           && <OverviewTab     stats={stats} users={users} loading={loading} />}
      {activePage==='admin-users'     && <UserManagementTab users={users} setUsers={setUsers} />}
      {activePage==='admin-jobs'      && <JobManagementTab />}
      {activePage==='admin-analytics' && <AnalyticsTab stats={stats} users={users} />}
      {activePage==='admin-broadcast' && <BroadcastTab users={users} />}
      {activePage==='admin-settings'  && <SystemSettingsTab />}
    </div>
  );
}
