import { useState, useEffect, useRef } from 'react';
import { Spinner, Avatar, Modal, EmptyState, Alert, SkillBar } from '../components/UI';
import { api } from '../services/api';

const scoreColor = s => s >= 60 ? '#16a34a' : s >= 40 ? '#6B7280' : '#dc2626';
const STATUS_LABEL = { pending:'Pending', reviewed:'Reviewed', shortlisted:'Shortlisted', selected:'Selected', rejected:'Rejected' };
const STATUS_COLOR = { pending:'var(--ink-3)', reviewed:'var(--blue)', shortlisted:'#3B82F6', selected:'#3B82F6', rejected:'var(--red)' };

/* ── Candidate Card ─────────────────────────────── */
function CandidateCard({ c, onView, onShortlist, isShortlisted }) {
  const score = c.overallScore || 0;
  const certs = (c.certifications||[]).filter(x=>x.completed);
  return (
    <div className="card card-sm" style={{ transition:'all var(--tx)', cursor:'pointer' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--border-3)'; e.currentTarget.style.boxShadow='var(--shadow)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow=''; }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar name={c.name} size={38} />
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}>{c.name}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)' }}>{c.title||'No title set'}{c.location?` · ${c.location}`:''}</div>
          </div>
        </div>
        {score>0 && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'Courier New, monospace', fontSize:18, fontWeight:700, color:scoreColor(score) }}>{score}%</div>
            <div style={{ fontSize:10, color:'var(--ink-3)' }}>score</div>
          </div>
        )}
      </div>

      {(c.skills||[]).slice(0,3).map(s=>(
        <div key={s.name} style={{ marginBottom:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontSize:12, fontWeight:500 }}>{s.name}</span>
            <span style={{ fontSize:11, fontFamily:'Courier New, monospace', color:scoreColor(s.level) }}>{s.level}%</span>
          </div>
          <div className="progress-bar" style={{ height:3 }}>
            <div className="progress-fill" style={{ width:`${s.level}%`, background:scoreColor(s.level) }} />
          </div>
        </div>
      ))}

      {certs.length>0 && (
        <div style={{ marginTop:8, display:'flex', gap:4, flexWrap:'wrap' }}>
          {certs.slice(0,3).map((x,i)=><span key={i} className="badge badge-teal" style={{ fontSize:10 }}>🏅 {x.name}</span>)}
          {certs.length>3 && <span className="badge" style={{ fontSize:10 }}>+{certs.length-3}</span>}
        </div>
      )}

      <div style={{ display:'flex', gap:6, marginTop:12 }}>
        <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center', fontSize:12 }} onClick={()=>onView(c)}>View Profile</button>
        <button className={`btn btn-sm ${isShortlisted?'btn-success':'btn-primary'}`} onClick={()=>onShortlist(c)} style={{ fontSize:12 }}>
          {isShortlisted?'✓ Saved':'Shortlist'}
        </button>
      </div>
    </div>
  );
}

/* ── Candidate Detail Modal ─────────────────────── */
function CandidateModal({ c, open, onClose, onShortlist, isShortlisted, onSendMessage }) {
  const [tab, setTab] = useState('overview');
  const [fullProfile, setFullProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ⚠️ All hooks MUST come before any conditional return
  useEffect(() => {
    if (!c?._id) return;
    if (open) {
      setLoadingProfile(true);
      setFullProfile(null);
      api.candidates.getOne(c._id).then(d => {
        if (d && d.candidate) {
          setFullProfile({ ...d.candidate, practiceHistory: d.practiceHistory || null });
        } else {
          setFullProfile(d || null);
        }
        setLoadingProfile(false);
      }).catch(() => setLoadingProfile(false));
    } else {
      setFullProfile(null);
      setTab('overview');
    }
  }, [open, c?._id]);

  if (!c) return null;

  const profile = fullProfile || c;
  const allSkills = [...(profile.skills||[])].sort((a,b)=>b.level-a.level);
  const certs = (profile.certifications||[]).filter(x=>x.completed);
  const projects = profile.projects || [];
  const education = profile.education || [];
  const practiceHistory = (fullProfile?.practiceHistory) || null;

  return (
    <Modal open={open} onClose={()=>{onClose();setTab('overview');setFullProfile(null);}} title="Candidate Profile" width={720}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:16, padding:'14px 16px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
        <Avatar name={profile.name} size={56} src={profile.avatar || ''} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>{profile.name}</div>
          <div style={{ fontSize:13, color:'var(--ink-2)', marginBottom:6 }}>{profile.title||'No title set'}{profile.location?` · ${profile.location}`:''}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {profile.overallScore>0 && (
              <span style={{ fontSize:13, fontWeight:700, color:scoreColor(profile.overallScore), padding:'2px 10px', background:'rgba(0,0,0,0.05)', borderRadius:20, border:'1px solid rgba(0,0,0,0.08)' }}>
                Score: {profile.overallScore}%
              </span>
            )}
            {certs.length>0 && <span style={{ fontSize:12, color:'#3B82F6', fontWeight:600 }}>🏅 {certs.length} cert{certs.length>1?'s':''}</span>}
            {profile.github   && <a href={profile.github}   target="_blank" rel="noreferrer" className="badge badge-blue"  style={{ textDecoration:'none' }}>GitHub</a>}
            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="badge badge-teal" style={{ textDecoration:'none' }}>LinkedIn</a>}
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom:16 }}>
        {[['overview','Overview'],['skills',`Skills (${allSkills.length})`],['certs',`Certs (${certs.length})`],['projects',`Projects (${projects.length})`],['education',`Education (${education.length})`],['activity','Test Activity']].map(([id,lbl])=>(
          <button key={id} className={`tab${tab===id?' active':''}`} onClick={()=>setTab(id)}>{lbl}</button>
        ))}
      </div>

      {loadingProfile ? (
        <div style={{ textAlign:'center', padding:30 }}><Spinner size={22} /></div>
      ) : <>
        {tab==='overview' && (
          <div>
            {profile.bio && <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.7, marginBottom:14 }}>{profile.bio}</p>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
              {[['Score', profile.overallScore?`${profile.overallScore}%`:'—', scoreColor(profile.overallScore||0)],['Skills',allSkills.length,'#3B82F6'],['Certs',certs.length,'#3B82F6'],['Projects',projects.length,'var(--ink-2)']].map(([l,v,clr])=>(
                <div key={l} style={{ textAlign:'center', padding:'10px 6px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:18, fontWeight:700, color:clr }}>{v}</div>
                  <div className="label" style={{ fontSize:10, marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
            {allSkills.length>0 && (
              <div style={{ marginBottom:12 }}>
                <div className="label" style={{ marginBottom:8 }}>Top Skills</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
                  {allSkills.slice(0,6).map((s,i)=><SkillBar key={s.name} name={s.name} level={s.level} category={s.category} delay={i} />)}
                </div>
              </div>
            )}
            {(profile.gaps||[]).length>0 && (
              <div>
                <div className="label" style={{ marginBottom:8 }}>Skill Gaps</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {profile.gaps.map(g=><span key={g} className="badge badge-red">{g}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
        {tab==='skills' && (
          allSkills.length===0 ? <div style={{ textAlign:'center', padding:30, color:'var(--ink-3)', fontSize:14 }}>No skills listed.</div> :
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 20px' }}>
            {allSkills.map((s,i)=><SkillBar key={s.name} name={s.name} level={s.level} category={s.category} delay={i} />)}
          </div>
        )}
        {tab==='certs' && (
          certs.length===0 ? <div style={{ textAlign:'center', padding:30, color:'var(--ink-3)', fontSize:14 }}>No certificates earned.</div> :
          certs.map((x,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(59,130,246,0.10)', borderRadius:'var(--r)', border:'1px solid rgba(59,130,246,0.25)', marginBottom:8 }}>
              <span style={{ fontSize:18 }}>🏅</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{x.name}</div>
                {x.issuedAt && <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>Issued {new Date(x.issuedAt).toLocaleDateString()}</div>}
              </div>
              <span className="badge badge-teal">Verified</span>
            </div>
          ))
        )}
        {tab==='projects' && (
          projects.length===0 ? <div style={{ textAlign:'center', padding:30, color:'var(--ink-3)', fontSize:14 }}>No projects added.</div> :
          projects.map((p,i)=>(
            <div key={i} style={{ padding:'12px 14px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:14, fontWeight:600 }}>{p.name}</span>
                {p.link && <a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#3B82F6', textDecoration:'none', padding:'2px 8px', borderRadius:5, background:'rgba(59,130,246,0.10)' }}>↗ View</a>}
              </div>
              {p.description && <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.6, marginBottom:6 }}>{p.description}</div>}
              {(Array.isArray(p.tech)?p.tech:[]).length>0 && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {(Array.isArray(p.tech)?p.tech:[]).map(t=><span key={t} className="tag" style={{ fontSize:11 }}>{t}</span>)}
                </div>
              )}
            </div>
          ))
        )}
        {tab==='education' && (
          education.length===0 ? <div style={{ textAlign:'center', padding:30, color:'var(--ink-3)', fontSize:14 }}>No education qualifications listed.</div> :
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {education.map((e,i)=>(
              <div key={i} style={{ padding:'14px 18px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:3 }}>{e.degree}</div>
                <div style={{ fontSize:13, color:'var(--ink-2)', marginBottom:6 }}>{e.institution}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {e.year  && <span className="badge" style={{ fontSize:11 }}>📅 {e.year}</span>}
                  {e.grade && <span className="badge badge-green" style={{ fontSize:11 }}>🎓 {e.grade}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==='activity' && (
          practiceHistory ? (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[['Total Tests',practiceHistory.totalTests,'var(--ink)'],['Avg Score',practiceHistory.averageScore?`${practiceHistory.averageScore}%`:'—',scoreColor(practiceHistory.averageScore||0)],['Last 30d',practiceHistory.testsLast30Days,'var(--blue)'],['Skills',practiceHistory.uniqueSkillsTested,'var(--ink)']].map(([lbl,val,clr])=>(
                  <div key={lbl} style={{ textAlign:'center', padding:'10px 6px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:clr }}>{val??'—'}</div>
                    <div className="label" style={{ fontSize:10, marginTop:3 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {practiceHistory.recentTestHistory?.length>0 && (
                <div>
                  <div className="label" style={{ marginBottom:10 }}>Recent Assessments</div>
                  {practiceHistory.recentTestHistory.slice(0,8).map((t,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)', marginBottom:5 }}>
                      <div><span style={{ fontSize:13, fontWeight:500 }}>{t.skill}</span><span style={{ fontSize:11, color:'var(--ink-3)', marginLeft:8 }}>{t.correct}/{t.total} correct</span></div>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'var(--ink-3)' }}>{new Date(t.date).toLocaleDateString()}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:scoreColor(t.score) }}>{t.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : <div style={{ textAlign:'center', padding:30 }}><Spinner size={20} /></div>
        )}
      </>}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:14, borderTop:'1px solid var(--border)', marginTop:4 }}>
        <button className="btn btn-ghost btn-sm" onClick={()=>{onClose();setTab('overview');setFullProfile(null);}}>Close</button>
        <button className="btn btn-outline btn-sm" onClick={()=>onSendMessage(c)}>💬 Message</button>
        <button className={`btn btn-sm ${isShortlisted?'btn-success':'btn-primary'}`} onClick={()=>onShortlist(c)}>
          {isShortlisted?'✓ Shortlisted':'Shortlist'}
        </button>
      </div>
    </Modal>
  );
}

/* ── Send Message Modal ─────────────────────────── */
function SendMessageModal({ candidate, open, onClose }) {
  const [body,     setBody]     = useState('');
  const [subject,  setSubject]  = useState('');
  const [isSelect, setIsSelect] = useState(false);
  const [jobs,     setJobs]     = useState([]);
  const [jobId,    setJobId]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    if (open) {
      api.jobs.getRecruiterJobs().then(d=>setJobs(d.jobs||[])).catch(()=>{});
    }
  }, [open]);

  useEffect(() => {
    if (isSelect && jobId) {
      const job = jobs.find(j=>j._id===jobId);
      if (job) {
        setSubject(`Selection Notification — ${job.title}`);
        setBody(`Dear ${candidate?.name||'Candidate'},\n\nWe are pleased to inform you that you have been selected for the position of ${job.title}.\n\nCongratulations! We will be in touch shortly with the next steps.\n\nBest regards`);
      }
    } else if (!isSelect) {
      setSubject(''); setBody('');
    }
  }, [isSelect, jobId]);

  const send = async () => {
    if (!body.trim()) { setErr('Message cannot be empty'); return; }
    setSending(true); setErr('');
    try {
      const job = jobs.find(j=>j._id===jobId);
      await api.messages.send({
        toUserId: candidate._id, message: body.trim(),
        subject: subject.trim(), isSelection: isSelect,
        jobId: jobId||undefined, jobTitle: job?.title||'',
      });
      onClose();
      setBody(''); setSubject(''); setIsSelect(false); setJobId('');
    } catch(e) { setErr(e.message||'Failed to send'); }
    setSending(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Message — ${candidate?.name||''}`} width={520}>
      {err && <Alert type="error" style={{ marginBottom:12 }}>{err}</Alert>}
      <div className="form-group">
        <label className="form-label">Subject</label>
        <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject line" />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14, color:'var(--ink-2)', userSelect:'none' }}>
          <input type="checkbox" checked={isSelect} onChange={e=>setIsSelect(e.target.checked)} style={{ width:'auto' }} />
          This is a selection notification
        </label>
      </div>
      {isSelect && (
        <div className="form-group">
          <label className="form-label">Job</label>
          <select value={jobId} onChange={e=>setJobId(e.target.value)}>
            <option value="">— Choose a job —</option>
            {jobs.map(j=><option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea rows={6} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write your message here…" />
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={send} disabled={sending}>
          {sending?<><Spinner size={12} color="white" /> Sending…</>:'Send Message'}
        </button>
      </div>
    </Modal>
  );
}

/* ── Candidate Search ───────────────────────────── */
function CandidateSearch({ shortlisted, onShortlistChange }) {
  const [query,    setQuery]    = useState({ skill:'', minScore:'', maxScore:'', cert:'' });
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [err,      setErr]      = useState('');
  const [selected, setSelected] = useState(null);
  const [msgTarget, setMsgTarget] = useState(null);

  const search = async () => {
    setLoading(true); setErr(''); setSearched(true);
    const p = {};
    if (query.skill)    p.skill    = query.skill;
    if (query.minScore) p.minScore = query.minScore;
    if (query.maxScore) p.maxScore = query.maxScore;
    if (query.cert)     p.cert     = query.cert;
    try {
      const d = await api.candidates.getAll(p);
      setResults(d.candidates||[]);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const shortlist = async c => {
    if (shortlisted.some(s=>s._id===c._id)) return;
    try { await api.candidates.shortlist(c._id); onShortlistChange([...shortlisted,c]); }
    catch(e) { alert(e.message); }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:10, alignItems:'flex-end' }}>
          <div><label className="form-label">Skill</label><input value={query.skill} onChange={e=>setQuery(q=>({...q,skill:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="React, Python…" /></div>
          <div><label className="form-label">Min Score (%)</label><input type="number" min="0" max="100" value={query.minScore} onChange={e=>setQuery(q=>({...q,minScore:e.target.value}))} placeholder="e.g. 60" /></div>
          <div><label className="form-label">Max Score (%)</label><input type="number" min="0" max="100" value={query.maxScore} onChange={e=>setQuery(q=>({...q,maxScore:e.target.value}))} placeholder="e.g. 100" /></div>
          <div><label className="form-label">Certificate</label><input value={query.cert} onChange={e=>setQuery(q=>({...q,cert:e.target.value}))} placeholder="JavaScript…" /></div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-primary" onClick={search} disabled={loading} style={{ height:40 }}>
              {loading?<Spinner size={14} color="white" />:'Search'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setQuery({skill:'',minScore:'',maxScore:'',cert:''});setResults([]);setSearched(false);}} style={{ height:40 }}>Clear</button>
          </div>
        </div>
      </div>

      {err && <Alert type="error" style={{ marginBottom:16 }}>{err}</Alert>}

      {!searched ? (
        <EmptyState icon="🔍" title="Search for candidates" description="Filter by skill, score range, or certification to find the right talent." />
      ) : loading ? (
        <div style={{ textAlign:'center', padding:60 }}><Spinner size={28} /></div>
      ) : !results.length ? (
        <EmptyState icon="😕" title="No candidates found" description="Try adjusting your search filters." />
      ) : (
        <>
          <div style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'Courier New, monospace', marginBottom:12 }}>
            {results.length} candidate{results.length!==1?'s':''} found
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
            {results.map(c=>(
              <CandidateCard key={c._id} c={c}
                onView={setSelected}
                onShortlist={shortlist}
                isShortlisted={shortlisted.some(s=>s._id===c._id)}
              />
            ))}
          </div>
        </>
      )}

      <CandidateModal c={selected} open={!!selected}
        onClose={()=>setSelected(null)}
        onShortlist={shortlist}
        isShortlisted={shortlisted.some(s=>s._id===selected?._id)}
        onSendMessage={c=>{ setMsgTarget(c); setSelected(null); }}
      />
      <SendMessageModal candidate={msgTarget} open={!!msgTarget} onClose={()=>setMsgTarget(null)} />
    </div>
  );
}

/* ── Job Postings ───────────────────────────────── */
function JobPostings() {
  const [jobs,         setJobs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [alertMsg,     setAlertMsg]     = useState({ text:'', type:'success' });
  const [applicantsJob,setApplicantsJob]= useState(null);
  const [applicants,   setApplicants]   = useState([]);
  const [loadingApps,  setLoadingApps]  = useState(false);
  const [msgTarget,    setMsgTarget]    = useState(null);
  const [viewCandidate,setViewCandidate]= useState(null);
  const [form, setForm] = useState({ title:'', company:'', location:'', type:'Full-time', salary:'', description:'', skills:'', minScore:'', remote:false });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => {
    setLoading(true);
    api.jobs.getRecruiterJobs()
      .then(d => setJobs(d.jobs||[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const flash = (text, type='success') => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text:'', type:'success' }), 3500);
  };

  const post = async () => {
    if (!form.title.trim()) { flash('Job title is required.', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        skills:   form.skills.split(',').map(s=>s.trim()).filter(Boolean),
        minScore: form.minScore ? Number(form.minScore) : 0,
      };
      await api.jobs.post(payload);
      load();
      setForm({ title:'',company:'',location:'',type:'Full-time',salary:'',description:'',skills:'',minScore:'',remote:false });
      setShowForm(false);
      flash('Job posted successfully!');
    } catch(e) { flash(e.message||'Failed to post.', 'error'); }
    setSaving(false);
  };

  const del = async id => {
    if (!window.confirm('Delete this job posting?')) return;
    await api.jobs.delete(id).catch(()=>{});
    load();
    flash('Job deleted.');
  };

  const viewApplicants = async job => {
    setApplicantsJob(job); setLoadingApps(true);
    const d = await api.jobs.getApplicants(job._id).catch(()=>({applicants:[]}));
    setApplicants(d.applicants||[]);
    setLoadingApps(false);
  };

  const updateStatus = async (jobId, appId, status) => {
    await api.jobs.updateAppStatus(jobId, appId, status).catch(()=>{});
    viewApplicants(applicantsJob);
    load();
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, color:'var(--ink-3)', fontFamily:'Courier New, monospace' }}>
          {jobs.length} active posting{jobs.length!==1?'s':''}
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowForm(s=>!s)}>
          {showForm?'✕ Cancel':'+ Post a Job'}
        </button>
      </div>

      {alertMsg.text && <Alert type={alertMsg.type} style={{ marginBottom:14 }}>{alertMsg.text}</Alert>}

      {showForm && (
        <div className="card" style={{ marginBottom:20 }}>
          <h3 style={{ marginBottom:16 }}>New Job Posting</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['title','Job Title *','Senior React Developer'],['company','Company','Acme Corp'],['location','Location','Bangalore, India'],['salary','Salary','₹12–18 LPA']].map(([k,lbl,ph])=>(
              <div key={k} className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">{lbl}</label>
                <input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} />
              </div>
            ))}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Type</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)}>
                {['Full-time','Part-time','Contract','Internship'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Minimum Score (%)</label>
              <input type="number" min="0" max="100" value={form.minScore} onChange={e=>set('minScore',e.target.value)} placeholder="e.g. 60" />
            </div>
            <div className="form-group" style={{ marginBottom:0, gridColumn:'1 / -1' }}>
              <label className="form-label">Required Skills (comma-separated)</label>
              <input value={form.skills} onChange={e=>set('skills',e.target.value)} placeholder="React, Node.js, TypeScript" />
            </div>
            <div className="form-group" style={{ marginBottom:0, gridColumn:'1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Role overview, responsibilities…" />
            </div>
            <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--ink-2)' }}>
                <input type="checkbox" checked={form.remote} onChange={e=>set('remote',e.target.checked)} style={{ width:'auto' }} />
                Remote-friendly
              </label>
              <button className="btn btn-primary btn-sm" onClick={post} disabled={saving}>
                {saving?<><Spinner size={12} color="white" /> Posting…</>:'Post Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:60 }}><Spinner size={28} /></div>
      ) : !jobs.length ? (
        <EmptyState icon="💼" title="No job postings yet" description="Post your first job to start receiving applications from top candidates." action={<button className="btn btn-primary btn-sm" onClick={()=>setShowForm(true)}>Post a Job</button>} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {jobs.map(job=>(
            <div key={job._id} className="card card-sm" style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{job.title}</div>
                  <span className="badge">{job.type}</span>
                  {job.remote && <span className="badge badge-teal">Remote</span>}
                  {job.minScore>0 && <span className="badge badge-amber">Min {job.minScore}%</span>}
                </div>
                <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:6 }}>
                  {job.company}{job.location?` · ${job.location}`:''}{job.salary?` · ${job.salary}`:''}
                </div>
                {(job.skills||[]).length>0 && (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {job.skills.map(s=><span key={s} className="tag" style={{ fontSize:11 }}>{s}</span>)}
                  </div>
                )}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'Courier New, monospace', fontSize:20, fontWeight:700, color:'var(--accent)' }}>{job.applicants||0}</div>
                <div className="label" style={{ fontSize:10 }}>applicants</div>
                <div style={{ display:'flex', gap:6, marginTop:8 }}>
                  <button className="btn btn-ghost btn-xs" onClick={()=>viewApplicants(job)}>View Applicants</button>
                  <button className="btn btn-danger btn-xs" onClick={()=>del(job._id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Applicants Modal */}
      <Modal open={!!applicantsJob} onClose={()=>setApplicantsJob(null)} title={`Applicants — ${applicantsJob?.title||''}`} width={660}>
        {loadingApps ? (
          <div style={{ textAlign:'center', padding:40 }}><Spinner size={24} /></div>
        ) : !applicants.length ? (
          <EmptyState icon="👥" title="No applicants yet" description="Applicants appear here once candidates apply." />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:12, color:'var(--ink-3)', fontFamily:'Courier New, monospace', marginBottom:4 }}>
              {applicants.length} applicant{applicants.length!==1?'s':''} · sorted by score
            </div>
            {applicants.map(app=>(
              <div key={app.applicationId} style={{ padding:'12px 14px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Avatar name={app.name} size={32} />
                    <div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{app.name}</div>
                      <div style={{ fontSize:12, color:'var(--ink-3)' }}>{app.email} · Applied {new Date(app.appliedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontFamily:'Courier New, monospace', fontSize:16, fontWeight:700, color:scoreColor(app.score||0) }}>{app.score||0}%</span>
                    <span style={{ fontSize:11, color:STATUS_COLOR[app.status]||'var(--ink-3)', fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background:'var(--surface)', borderRadius:10, border:`1px solid ${STATUS_COLOR[app.status]||'var(--border)'}` }}>{STATUS_LABEL[app.status]}</span>
                  </div>
                </div>
                {app.cover && (
                  <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.5, marginBottom:10, paddingLeft:42 }}>"{app.cover}"</div>
                )}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', paddingLeft:42 }}>
                  {['pending','reviewed','shortlisted','selected','rejected'].map(s=>(
                    <button key={s}
                      className={`btn btn-xs ${app.status===s?'btn-primary':'btn-ghost'}`}
                      onClick={()=>updateStatus(applicantsJob._id,app.applicationId,s)}
                      style={{ textTransform:'capitalize', fontSize:11 }}>
                      {s}
                    </button>
                  ))}
                  <button className="btn btn-xs btn-outline"
                    onClick={()=>{ setViewCandidate({_id: String(app.candidateId), name:app.name}); }}>
                    👤 Profile
                  </button>
                  <button className="btn btn-xs btn-outline"
                    onClick={()=>{ setMsgTarget({_id:app.candidateId,name:app.name}); setApplicantsJob(null); }}>
                    💬 Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <SendMessageModal candidate={msgTarget} open={!!msgTarget} onClose={()=>setMsgTarget(null)} />
      <CandidateModal c={viewCandidate} open={!!viewCandidate} onClose={()=>setViewCandidate(null)}
        onShortlist={()=>{}} isShortlisted={false}
        onSendMessage={c=>{ setMsgTarget(c); setViewCandidate(null); }} />
    </div>
  );
}
function RecruiterInbox({ user }) {
  const [contacts,    setContacts]   = useState([]);
  const [thread,      setThread]     = useState(null);
  const [msgs,        setMsgs]       = useState([]);
  const [reply,       setReply]      = useState('');
  const [sending,     setSending]    = useState(false);
  const [loading,     setLoading]    = useState(true);
  const [showNew,     setShowNew]    = useState(false);
  const [searchQ,     setSearchQ]    = useState('');
  const [found,       setFound]      = useState([]);
  const [newBody,     setNewBody]    = useState('');
  const [newSubject,  setNewSubject] = useState('');
  const [newTarget,   setNewTarget]  = useState(null);
  const [deletingId,  setDeletingId] = useState(null);
  const [hoveredMsgId,setHoveredMsgId] = useState(null);
  const bottomRef = useRef(null);
  const threadRef = useRef(thread);
  threadRef.current = thread;

  const loadContacts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, inbox] = await Promise.all([
        api.messages.getContacts().catch(() => ({ contacts: [] })),
        api.messages.getInbox().catch(() => ({ inbox:[], sent:[] })),
      ]);
      let contacts = c.contacts || [];
      if (contacts.length === 0 && inbox.inbox?.length > 0) {
        const fromMap = {};
        for (const m of inbox.inbox) {
          const id = m.from?._id || m.from;
          if (id && !fromMap[id]) {
            fromMap[id] = { _id: id, name: m.from?.name||'Unknown', role: m.from?.role, avatar: m.from?.avatar||'', unread: inbox.inbox.filter(x=>(x.from?._id||x.from)===id&&!x.read).length, lastMessage: m.message, lastAt: m.createdAt };
          }
        }
        contacts = Object.values(fromMap);
      }
      setContacts(contacts);
    } catch {}
    if (!silent) setLoading(false);
  };

  useEffect(() => { loadContacts(); const iv = setInterval(()=>{ loadContacts(true); pollThread(); }, 8000); return ()=>clearInterval(iv); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const pollThread = async () => {
    const t = threadRef.current;
    if (!t) return;
    try {
      const d = await api.messages.getThread(t._id).catch(()=>({messages:[]}));
      setMsgs(prev => { const n = d.messages||[]; return n.length !== prev.length ? n : prev; });
    } catch {}
  };

  const openThread = async (contact) => {
    setThread(contact);
    const d = await api.messages.getThread(contact._id).catch(()=>({messages:[]}));
    setMsgs(d.messages||[]);
    await loadContacts(true);
  };

  const sendReply = async () => {
    if (!reply.trim()||!thread) return;
    setSending(true);
    try {
      await api.messages.send({ toUserId: thread._id, message: reply.trim() });
      setReply('');
      const d = await api.messages.getThread(thread._id).catch(()=>({messages:[]}));
      setMsgs(d.messages||[]);
      await loadContacts(true);
    } catch {}
    setSending(false);
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    setDeletingId(msgId);
    try {
      await api.messages.deleteMessage(msgId);
      setMsgs(prev => prev.filter(m => m._id !== msgId));
      await loadContacts(true);
    } catch {}
    setDeletingId(null);
  };

  const searchCandidates = async () => {
    if (!searchQ.trim()) return;
    const d = await api.candidates.getAll({ search: searchQ }).catch(()=>({candidates:[]}));
    setFound(d.candidates||[]);
  };

  const startNew = async () => {
    if (!newTarget || !newBody.trim()) return;
    setSending(true);
    try {
      await api.messages.send({ toUserId: newTarget._id, message: newBody.trim(), subject: newSubject.trim() });
      setShowNew(false); setNewBody(''); setNewSubject(''); setSearchQ(''); setFound([]); setNewTarget(null);
      await loadContacts(true);
      setThread(newTarget);
      const d = await api.messages.getThread(newTarget._id).catch(()=>({messages:[]}));
      setMsgs(d.messages||[]);
    } catch {}
    setSending(false);
  };

  const isMyMsg = m => String(m.from?._id||m.from) === String(user?._id||user?.id);
  const totalUnread = contacts.reduce((a,c)=>a+(c.unread||0),0);

  if (loading) return <div style={{ textAlign:'center', padding:40 }}><Spinner size={24} /></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, color:'var(--ink-3)' }}>
          {totalUnread>0 && <span style={{ color:'#3B82F6', fontWeight:600 }}>{totalUnread} unread · </span>}
          Messages from candidates
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowNew(true)}>+ New Message</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:14, minHeight:480 }}>
        {/* Contacts */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {contacts.length===0 ? (
            <div style={{ padding:'20px 14px', textAlign:'center', color:'var(--ink-3)', fontSize:13, background:'var(--surface)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
              No conversations yet.
            </div>
          ) : contacts.map(contact=>(
            <div key={contact._id} onClick={()=>openThread(contact)}
              style={{ padding:'10px 12px', cursor:'pointer', borderRadius:'var(--r)', background:thread?._id===contact._id?'rgba(59,130,246,0.10)':'var(--surface)', border:`1px solid ${thread?._id===contact._id?'var(--border-3)':'var(--border)'}`, borderLeft:`3px solid ${contact.unread>0?'#3B82F6':thread?._id===contact._id?'#3B82F6':'transparent'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <Avatar name={contact.name} size={26} src={contact.avatar||''} />
                  <div style={{ fontSize:13, fontWeight:contact.unread>0?700:500 }}>{contact.name}</div>
                </div>
                {contact.unread>0 && <span className="unread-dot">{contact.unread}</span>}
              </div>
              {contact.lastMessage && <div style={{ fontSize:11, color:'var(--ink-3)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{contact.lastMessage}</div>}
            </div>
          ))}
        </div>

        {/* Thread */}
        <div className="card" style={{ display:'flex', flexDirection:'column', minHeight:480, padding:'14px 16px' }}>
          {!thread ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--ink-3)', gap:10 }}>
              <div style={{ fontSize:28 }}>💬</div>
              <div style={{ fontSize:13 }}>Select a conversation to read</div>
              <button className="btn btn-primary btn-sm" onClick={()=>setShowNew(true)}>Start a conversation</button>
            </div>
          ) : (
            <>
              <div style={{ paddingBottom:12, marginBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                <Avatar name={thread.name} size={32} src={thread.avatar||''} />
                <div style={{ fontSize:14, fontWeight:600 }}>{thread.name}</div>
                <div style={{ marginLeft:'auto', fontSize:11, color:'var(--ink-4)' }}>auto-refreshing</div>
              </div>
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:12, maxHeight:320 }}>
                {msgs.length===0 ? (
                  <div style={{ textAlign:'center', color:'var(--ink-3)', padding:20, fontSize:13 }}>No messages yet.</div>
                ) : msgs.map(m=>{
                  const mine = isMyMsg(m);
                  const hovered = hoveredMsgId === m._id;
                  return (
                    <div key={m._id}
                      style={{ display:'flex', justifyContent:mine?'flex-end':'flex-start', gap:6, alignItems:'flex-end', position:'relative' }}
                      onMouseEnter={()=>setHoveredMsgId(m._id)}
                      onMouseLeave={()=>setHoveredMsgId(null)}
                    >
                      {!mine && <Avatar name={m.from?.name||'?'} size={22} src={m.from?.avatar||''} />}
                      <div style={{ maxWidth:'78%' }}>
                        {m.isSelection && <div style={{ fontSize:11, color:'#3B82F6', fontWeight:600, marginBottom:2, paddingLeft:4 }}>📋 Selection Notification{m.jobTitle?` — ${m.jobTitle}`:''}</div>}
                        <div style={{ display:'flex', alignItems:'flex-end', gap:5, flexDirection:mine?'row-reverse':'row' }}>
                          <div className={mine?'bubble-sent':'bubble-recv'} style={{ padding:'9px 13px', fontSize:13, lineHeight:1.55 }}>
                            {m.message}
                          </div>
                          {mine && hovered && (
                            <button
                              onClick={()=>handleDeleteMessage(m._id)}
                              disabled={deletingId===m._id}
                              title="Delete message"
                              style={{ background:'rgba(220,38,38,0.10)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:6, cursor:'pointer', color:'#dc2626', fontSize:12, padding:'3px 7px', lineHeight:1, flexShrink:0, marginBottom:4 }}
                            >
                              {deletingId===m._id ? <Spinner size={9} /> : '🗑'}
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize:10, color:'var(--ink-4)', marginTop:2, textAlign:mine?'right':'left', fontFamily:'Courier New, monospace', paddingLeft:4 }}>
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {mine && <Avatar name={user?.name||'?'} size={22} src={user?.avatar||''} />}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:10 }}>
                <div style={{ fontSize:11, color:'var(--ink-4)', marginBottom:6 }}>💡 Hover over your sent messages to delete them.</div>
                <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                  <textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendReply();}}} placeholder="Reply... (Enter to send, Shift+Enter for new line)" style={{ flex:1, resize:'none', minHeight:60, fontSize:14, marginBottom:0 }} />
                  <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={sending||!reply.trim()} style={{ flexShrink:0, height:60 }}>
                    {sending?<Spinner size={13} color="white" />:'Send'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New message modal */}
      {showNew && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowNew(false)}>
          <div className="modal-box" style={{ maxWidth:500 }}>
            <div style={{ padding:'22px 24px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h3>New Message to Candidate</h3>
                <button onClick={()=>setShowNew(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink-3)', lineHeight:1, padding:4 }}>×</button>
              </div>
            </div>
            <div style={{ padding:'0 24px 24px' }}>
              <div className="form-group">
                <label className="form-label">Search Candidate</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchCandidates()} placeholder="Candidate name..." />
                  <button className="btn btn-ghost btn-sm" style={{ flexShrink:0 }} onClick={searchCandidates}>Search</button>
                </div>
              </div>
              {found.length>0 && (
                <div style={{ marginBottom:12, border:'1.5px solid var(--border)', borderRadius:'var(--r)', maxHeight:160, overflowY:'auto' }}>
                  {found.map(u=>(
                    <div key={u._id} onClick={()=>{ setNewTarget(u); setSearchQ(u.name); setFound([]); }}
                      style={{ padding:'9px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <Avatar name={u.name} size={26} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{u.name}</div>
                        <div style={{ fontSize:11, color:'var(--ink-3)' }}>{u.title||'Candidate'} · Score: {u.overallScore||0}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {newTarget && (
                <div style={{ padding:'8px 12px', background:'rgba(59,130,246,0.10)', borderRadius:'var(--r)', fontSize:13, color:'#3B82F6', marginBottom:12, fontWeight:600 }}>
                  To: {newTarget.name}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Subject (optional)</label>
                <input value={newSubject} onChange={e=>setNewSubject(e.target.value)} placeholder="e.g. Interview Invitation" />
              </div>
              <div className="form-group" style={{ marginBottom:20 }}>
                <label className="form-label">Message</label>
                <textarea value={newBody} onChange={e=>setNewBody(e.target.value)} placeholder="Your message..." style={{ minHeight:90 }} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setShowNew(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={startNew} disabled={!newTarget||!newBody.trim()||sending}>
                  {sending?<><Spinner size={13} color="white" /> Sending...</>:'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Recruiter Analytics ────────────────────────── */
function RecruiterAnalytics() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.jobs.getRecruiterJobs().then(d => {
      setJobs(d.jobs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={28} /></div>;

  const totalApplicants = jobs.reduce((a, j) => a + (j.applicants || 0), 0);
  const activeJobs = jobs.filter(j => !j.closed).length;
  const topJob = [...jobs].sort((a,b) => (b.applicants||0) - (a.applicants||0))[0];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          ['Total Postings', jobs.length, 'var(--accent)', 'stat-card-accent'],
          ['Total Applicants', totalApplicants, '#3B82F6', 'stat-card-teal'],
          ['Active Jobs', activeJobs, 'var(--green)', 'stat-card-green'],
          ['Avg Applicants/Job', jobs.length ? Math.round(totalApplicants / jobs.length) : 0, '#3B82F6', 'stat-card-amber'],
        ].map(([label, value, color, cls]) => (
          <div key={label} className={`stat-card ${cls}`}>
            <div className="stat-number" style={{ color, marginBottom: 6 }}>{value}</div>
            <div className="label">{label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="section-header">
          <h3>Job Performance</h3>
          {topJob && <span className="badge badge-teal">Top: {topJob.title} ({topJob.applicants || 0} apps)</span>}
        </div>
        {jobs.length === 0 ? (
          <EmptyState icon="📊" title="No data yet" description="Post jobs to see analytics here." />
        ) : (
          <div>
            {jobs.map(job => {
              const pct = totalApplicants > 0 ? Math.round(((job.applicants || 0) / totalApplicants) * 100) : 0;
              return (
                <div key={job._id} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{job.title}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{job.applicants || 0} applicants · {pct}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 9 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Saved Candidates ───────────────────────────── */
function SavedCandidates({ shortlisted, onShortlistChange }) {
  const [selected, setSelected] = useState(null);
  const [msgTarget, setMsgTarget] = useState(null);
  const remove = async (c) => {
    const updated = shortlisted.filter(s => s._id !== c._id);
    onShortlistChange(updated);
    try { await api.candidates.unshortlist(c._id); } catch {}
  };
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>{shortlisted.length} saved candidate{shortlisted.length !== 1 ? 's' : ''}</p>
      </div>
      {shortlisted.length === 0 ? (
        <EmptyState icon="🔖" title="No saved candidates" description="Shortlist candidates from the search tab to save them here." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {shortlisted.map(c => (
            <div key={c._id} className="card card-sm">
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <Avatar name={c.name} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{c.title || 'No title'}</div>
                </div>
                {c.overallScore > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: scoreColor(c.overallScore) }}>{c.overallScore}%</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>score</div>
                  </div>
                )}
              </div>
              {(c.skills || []).slice(0, 3).map(s => (
                <div key={s.name} style={{ marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: scoreColor(s.level), fontWeight: 700 }}>{s.level}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 4 }}>
                    <div className="progress-fill" style={{ width: `${s.level}%`, background: scoreColor(s.level) }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSelected(c)}>View Profile</button>
                <button className="btn btn-outline btn-sm" onClick={() => setMsgTarget(c)}>Message</button>
                <button className="btn btn-danger btn-xs" onClick={() => remove(c)} title="Remove from saved">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <CandidateModal c={selected} open={!!selected} onClose={() => setSelected(null)} onShortlist={() => {}} isShortlisted={true} onSendMessage={c => { setMsgTarget(c); setSelected(null); }} />
      <SendMessageModal candidate={msgTarget} open={!!msgTarget} onClose={() => setMsgTarget(null)} />
    </div>
  );
}

/* ── Interview Scheduler ─────────────────────────── */
const INTERVIEW_TYPES = ['Video Call','Phone Call','In-Person','Technical','HR Round'];
const INTERVIEW_STATUS = { scheduled:'Scheduled', completed:'Completed', cancelled:'Cancelled', rescheduled:'Rescheduled' };
const STATUS_CLR = { scheduled:'#3B82F6', completed:'#16a34a', cancelled:'#dc2626', rescheduled:'#f97316' };

function InterviewScheduler({ user, shortlisted }) {
  const [interviews, setInterviews] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState({ candidateId:'', candidateName:'', jobTitle:'', type:INTERVIEW_TYPES[0], date:'', time:'', notes:'' });
  const todayStr = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.interviews.getAll();
      setInterviews(d.interviews || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Also load all candidates for dropdown
    api.candidates.getAll({}).then(d => setCandidates(d.candidates || [])).catch(() => {});
  }, []);

  const addInterview = async () => {
    if (!form.candidateId || !form.date || !form.time) return;
    setSaving(true);
    try {
      const d = await api.interviews.schedule({
        candidateId:   form.candidateId,
        candidateName: form.candidateName,
        jobTitle:      form.jobTitle,
        type:          form.type,
        date:          form.date,
        time:          form.time,
        notes:         form.notes,
        company:       user?.company || user?.name || '',
      });
      setInterviews(prev => [...prev, d.interview]);
      setShowAdd(false);
      setForm({ candidateId:'', candidateName:'', jobTitle:'', type:INTERVIEW_TYPES[0], date:'', time:'', notes:'' });
    } catch (e) { alert(e.message || 'Failed to schedule interview'); }
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    try {
      const d = await api.interviews.update(id, { status });
      setInterviews(prev => prev.map(i => i._id===id ? d.interview : i));
    } catch {}
  };

  const remove = async (id) => {
    try {
      await api.interviews.remove(id);
      setInterviews(prev => prev.filter(i => i._id!==id));
    } catch {}
  };

  const filtered  = filter==='all' ? interviews : interviews.filter(i=>i.status===filter);
  const upcoming  = interviews.filter(i => i.date >= todayStr && i.status==='scheduled');

  if (loading) return <div style={{ textAlign:'center', padding:40 }}><Spinner size={24} /></div>;

  return (
    <div>
      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:24 }}>
        {[
          ['📅','Total Interviews', interviews.length, 'var(--accent)'],
          ['⏰','Upcoming', upcoming.length, '#3B82F6'],
          ['✅','Completed', interviews.filter(i=>i.status==='completed').length, '#16a34a'],
          ['❌','Cancelled', interviews.filter(i=>i.status==='cancelled').length, '#dc2626'],
        ].map(([icon,label,val,color])=>(
          <div key={label} className="card card-sm" style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color, marginBottom:4 }}>{val}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', gap:8 }}>
          {['all','scheduled','completed','cancelled'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              className={`btn btn-sm ${filter===s?'btn-primary':'btn-ghost'}`} style={{ textTransform:'capitalize' }}>{s}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)}>+ Schedule Interview</button>
      </div>

      {/* Interview list */}
      {filtered.length===0 ? (
        <EmptyState icon="📅" title="No interviews" description="Schedule your first interview to get started." action={<button className="btn btn-primary" onClick={()=>setShowAdd(true)}>Schedule Interview</button>} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[...filtered].sort((a,b)=>a.date.localeCompare(b.date)).map(iv=>(
            <div key={iv._id} className="card card-sm" style={{ borderLeft:`4px solid ${STATUS_CLR[iv.status]||'var(--border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{iv.candidateName}</div>
                    <span className="badge" style={{ background:`${STATUS_CLR[iv.status]}18`, color:STATUS_CLR[iv.status], borderColor:`${STATUS_CLR[iv.status]}30`, fontSize:11 }}>{INTERVIEW_STATUS[iv.status]}</span>
                    <span className="badge badge-blue" style={{ fontSize:11 }}>{iv.type}</span>
                    {iv.jobTitle && <span className="badge" style={{ fontSize:11 }}>💼 {iv.jobTitle}</span>}
                  </div>
                  <div style={{ display:'flex', gap:20, fontSize:13, color:'var(--ink-3)' }}>
                    <span>📅 {new Date(iv.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span>
                    <span>🕐 {iv.time}</span>
                  </div>
                  {iv.notes && <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:6 }}>Note: {iv.notes}</div>}
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {iv.status==='scheduled' && <>
                    <button className="btn btn-success btn-xs" onClick={()=>updateStatus(iv._id,'completed')}>✓ Done</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>updateStatus(iv._id,'rescheduled')}>↻ Reschedule</button>
                    <button className="btn btn-danger btn-xs" onClick={()=>updateStatus(iv._id,'cancelled')}>Cancel</button>
                  </>}
                  <button className="btn btn-ghost btn-xs" onClick={()=>remove(iv._id)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal-box" style={{ maxWidth:520 }}>
            <div className="modal-header"><h3>Schedule Interview</h3><button onClick={()=>setShowAdd(false)} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--ink-3)' }}>×</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Candidate *</label>
                <select value={form.candidateId} onChange={e => {
                  const c = candidates.find(c=>c._id===e.target.value);
                  setForm(f=>({...f, candidateId:e.target.value, candidateName:c?.name||''}));
                }}>
                  <option value="">Choose a candidate...</option>
                  {candidates.map(c=><option key={c._id} value={c._id}>{c.name} {c.title?`— ${c.title}`:''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Job Title / Role (optional)</label>
                <input value={form.jobTitle} onChange={e=>setForm(f=>({...f,jobTitle:e.target.value}))} placeholder="e.g. Frontend Developer" />
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Interview Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    {INTERVIEW_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Date *</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} min={todayStr} /></div>
                <div className="form-group"><label className="form-label">Time *</label><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes (optional)</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Any prep notes or agenda items..." /></div>
              <p style={{ fontSize:12, color:'var(--ink-3)', marginBottom:16 }}>
                📧 The candidate will be notified about this interview in their portal.
              </p>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={addInterview} disabled={saving||!form.candidateId||!form.date||!form.time}>
                  {saving ? <><Spinner size={13} color="white" /> Scheduling…</> : 'Schedule & Notify Candidate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Hiring Pipeline (Kanban) ────────────────────── */
const PIPELINE_STAGES = ['Applied','Screening','Interview','Offer','Hired','Rejected'];
const STAGE_COLORS = { Applied:'#6B7280', Screening:'#3B82F6', Interview:'#f97316', Offer:'#8b5cf6', Hired:'#16a34a', Rejected:'#dc2626' };

function HiringPipeline() {
  const [pipeline, setPipeline] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recruiter_pipeline')||'null'); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(!pipeline);
  const [dragItem, setDragItem] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(()=>{
    if (pipeline) return;
    setLoading(true);
    api.jobs.getRecruiterJobs().then(d=>{
      const jobs = d.jobs||[];
      const initial = {};
      PIPELINE_STAGES.forEach(s=>initial[s]=[]);
      // populate with applicants from all jobs
      const promises = jobs.map(j=>api.jobs.getApplicants(j._id).catch(()=>({applicants:[]})));
      Promise.all(promises).then(results=>{
        results.forEach((r,ji)=>{
          (r.applicants||[]).forEach(app=>{
            const stage = app.status==='selected'?'Hired':app.status==='rejected'?'Rejected':app.status==='shortlisted'?'Offer':app.status==='reviewed'?'Interview':app.status==='pending'?'Applied':'Screening';
            initial[stage].push({ id:`${jobs[ji]._id}-${app._id}`, name:app.user?.name||app.name||'Candidate', jobTitle:jobs[ji].title, score:app.user?.overallScore||0, jobId:jobs[ji]._id, appId:app._id });
          });
        });
        setPipeline(initial);
        localStorage.setItem('recruiter_pipeline', JSON.stringify(initial));
        setLoading(false);
      });
    }).catch(()=>{ setPipeline(PIPELINE_STAGES.reduce((a,s)=>({...a,[s]:[]}),{})); setLoading(false); });
  },[]);

  const moveCard = (toStage) => {
    if (!dragItem || dragItem.stage===toStage) { setDragItem(null); setDragOver(null); return; }
    const updated = {};
    PIPELINE_STAGES.forEach(s=>{
      updated[s] = pipeline[s].filter(c=>c.id!==dragItem.card.id);
    });
    updated[toStage] = [...(updated[toStage]||[]), {...dragItem.card}];
    setPipeline(updated);
    localStorage.setItem('recruiter_pipeline', JSON.stringify(updated));
    setDragItem(null); setDragOver(null);
  };

  const addSampleCard = () => {
    const sample = { id:`sample-${Date.now()}`, name:'Demo Candidate', jobTitle:'Senior Developer', score:78 };
    const updated = {...pipeline, Applied:[...(pipeline.Applied||[]), sample]};
    setPipeline(updated);
    localStorage.setItem('recruiter_pipeline', JSON.stringify(updated));
  };

  if (loading) return <div style={{ textAlign:'center',padding:60 }}><Spinner size={28}/></div>;

  const totalCards = PIPELINE_STAGES.reduce((a,s)=>a+(pipeline[s]?.length||0),0);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:14, color:'var(--ink-3)' }}>{totalCards} applicant{totalCards!==1?'s':''} across {PIPELINE_STAGES.length} stages</div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={addSampleCard}>+ Add Sample</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>{ localStorage.removeItem('recruiter_pipeline'); setPipeline(null); setLoading(true); window.location.reload(); }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:12 }}>
        {PIPELINE_STAGES.map(stage=>(
          <div key={stage}
            onDragOver={e=>{ e.preventDefault(); setDragOver(stage); }}
            onDrop={()=>moveCard(stage)}
            onDragLeave={()=>setDragOver(null)}
            style={{ minWidth:200, flex:'0 0 200px', background:dragOver===stage?'rgba(59,130,246,0.06)':'var(--surface-2)', borderRadius:12, border:`2px solid ${dragOver===stage?'#3B82F6':'var(--border)'}`, padding:'0 0 12px', transition:'all 0.15s' }}>
            {/* Column header */}
            <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:STAGE_COLORS[stage] }} />
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{stage}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', background:'var(--surface-3)', borderRadius:20, padding:'2px 8px' }}>{pipeline[stage]?.length||0}</span>
              </div>
            </div>
            {/* Cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'0 10px' }}>
              {(pipeline[stage]||[]).map(card=>(
                <div key={card.id} draggable
                  onDragStart={()=>setDragItem({ card, stage })}
                  style={{ background:'var(--surface)', borderRadius:9, padding:'11px 12px', border:'1px solid var(--border)', cursor:'grab', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', transition:'box-shadow 0.15s', userSelect:'none' }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow)'}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:3, color:'var(--ink)' }}>{card.name}</div>
                  <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:card.score?6:0 }}>{card.jobTitle}</div>
                  {card.score>0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ flex:1, height:3, background:'var(--surface-3)', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${card.score}%`, background:card.score>=60?'#16a34a':card.score>=40?'#f97316':'#dc2626', borderRadius:2 }} />
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:card.score>=60?'#16a34a':'#f97316', fontFamily:'"Courier New",monospace' }}>{card.score}%</span>
                    </div>
                  )}
                  <div style={{ fontSize:10, color:'var(--ink-4)', marginTop:4, textAlign:'right' }}>⠿ drag to move</div>
                </div>
              ))}
              {(pipeline[stage]||[]).length===0 && (
                <div style={{ textAlign:'center', padding:'20px 10px', fontSize:12, color:'var(--ink-4)', border:'2px dashed var(--border)', borderRadius:8 }}>Drop here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main RecruiterPage ─────────────────────────── */
export default function RecruiterPage({ page, setPage, user }) {
  const [shortlisted, setShortlisted] = useState([]);

  // Load saved candidates from backend on mount, fallback to localStorage
  useEffect(() => {
    api.candidates.getShortlisted()
      .then(d => {
        if (d.candidates && d.candidates.length > 0) {
          setShortlisted(d.candidates);
          localStorage.setItem('recruiter_saved', JSON.stringify(d.candidates));
        } else {
          const saved = JSON.parse(localStorage.getItem('recruiter_saved') || '[]');
          setShortlisted(saved);
        }
      })
      .catch(() => {
        const saved = JSON.parse(localStorage.getItem('recruiter_saved') || '[]');
        setShortlisted(saved);
      });
  }, []);

  const handleShortlistChange = (list) => {
    setShortlisted(list);
    localStorage.setItem('recruiter_saved', JSON.stringify(list));
  };

  const tabs = [
    { id:'recruiter',              label:'Find Candidates' },
    { id:'recruiter-jobs',         label:'Job Postings' },
    { id:'recruiter-saved',        label:`Saved (${shortlisted.length})` },
    { id:'recruiter-analytics',    label:'Analytics' },
    { id:'recruiter-inbox',        label:'Inbox' },
    { id:'recruiter-interviews',   label:'Interviews' },
  ];

  const PAGE_TITLES = {
    'recruiter':             ['Find Candidates',      'Search and evaluate developers by skill, score, and certification'],
    'recruiter-jobs':        ['Job Postings',         'Create and manage your open roles'],
    'recruiter-saved':       ['Saved Candidates',     'Your shortlisted candidates for quick access'],
    'recruiter-analytics':   ['Recruiter Analytics',  'Job performance metrics and applicant insights'],
    'recruiter-inbox':       ['Inbox',                'Full two-way messaging with candidates'],
    'recruiter-interviews':  ['Interview Scheduler',  'Schedule, track, and manage all candidate interviews'],
    'recruiter-pipeline':    ['Hiring Pipeline',      'Kanban-style view of all applicants across your jobs'],
  };

  const [title, subtitle] = PAGE_TITLES[page] || ['Recruiter', ''];

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h2>{title}</h2>
        <p style={{ color:'var(--ink-3)', marginTop:6, fontSize:15 }}>{subtitle}</p>
      </div>
      <div style={{ marginBottom:24 }}>
        <div className="tabs" style={{ flexWrap:'wrap' }}>
          {tabs.map(t=>(
            <button key={t.id} className={`tab${page===t.id?' active':''}`} onClick={()=>setPage(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      {page==='recruiter'            && <CandidateSearch shortlisted={shortlisted} onShortlistChange={handleShortlistChange} />}
      {page==='recruiter-jobs'       && <JobPostings />}
      {page==='recruiter-saved'      && <SavedCandidates shortlisted={shortlisted} onShortlistChange={handleShortlistChange} />}
      {page==='recruiter-analytics'  && <RecruiterAnalytics />}
      {page==='recruiter-inbox'      && <RecruiterInbox user={user} />}
      {page==='recruiter-interviews' && <InterviewScheduler user={user} shortlisted={shortlisted} />}
    </div>
  );
}