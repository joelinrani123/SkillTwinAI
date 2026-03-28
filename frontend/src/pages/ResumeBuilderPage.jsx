import { useState } from 'react';
import { Alert } from '../components/UI';

/* ── Resume Builder Page ── */
/* Candidates can build and preview a professional resume from their profile data */

const TEMPLATES = [
  { id:'modern', name:'Modern', desc:'Clean, minimal with accent color headers' },
  { id:'classic', name:'Classic', desc:'Traditional layout preferred by enterprises' },
  { id:'tech',    name:'Tech',    desc:'Skills-first with tech-focused formatting' },
];

function ResumePreview({ data, template }) {
  const accentColor = template==='tech' ? '#2563eb' : template==='modern' ? '#1F2937' : '#333';
  return (
    <div style={{ background:'#fff', width:'100%', minHeight:800, padding:'48px 52px', fontFamily:'Georgia,serif', color:'#111', fontSize:13, lineHeight:1.6, border:'1px solid #e5e7eb', borderRadius:8, boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>

      {/* Header */}
      <div style={{ borderBottom:`3px solid ${accentColor}`, paddingBottom:18, marginBottom:22 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:accentColor, marginBottom:4, letterSpacing:'-0.01em' }}>{data.name || 'Your Name'}</h1>
        <div style={{ fontSize:14, color:'#555', fontWeight:400, marginBottom:8 }}>{data.title || 'Software Engineer'}</div>
        <div style={{ display:'flex', gap:20, fontSize:12, color:'#777', flexWrap:'wrap' }}>
          {data.email && <span>✉ {data.email}</span>}
          {data.phone && <span>📞 {data.phone}</span>}
          {data.location && <span>📍 {data.location}</span>}
          {data.linkedin && <span>🔗 {data.linkedin}</span>}
          {data.github && <span>💻 {data.github}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:accentColor, marginBottom:8, borderBottom:`1px solid ${accentColor}22`, paddingBottom:4 }}>Professional Summary</div>
          <p style={{ fontSize:13, color:'#444', lineHeight:1.7 }}>{data.summary}</p>
        </div>
      )}

      {/* Skills */}
      {data.skills?.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:accentColor, marginBottom:8, borderBottom:`1px solid ${accentColor}22`, paddingBottom:4 }}>Skills</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {data.skills.map(s => (
              <span key={s.name} style={{ padding:'3px 10px', borderRadius:4, background:`${accentColor}10`, color:accentColor, fontSize:12, fontWeight:600, border:`1px solid ${accentColor}25` }}>
                {s.name}{s.level ? ` · ${s.level}%` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experience?.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:accentColor, marginBottom:8, borderBottom:`1px solid ${accentColor}22`, paddingBottom:4 }}>Work Experience</div>
          {data.experience.map((e,i) => (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{e.role}</div>
                <div style={{ fontSize:11, color:'#888' }}>{e.duration}</div>
              </div>
              <div style={{ fontSize:12, color:'#555', marginBottom:4 }}>{e.company}</div>
              <p style={{ fontSize:12.5, color:'#444', lineHeight:1.65 }}>{e.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education?.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:accentColor, marginBottom:8, borderBottom:`1px solid ${accentColor}22`, paddingBottom:4 }}>Education</div>
          {data.education.map((e,i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{e.degree}</span>
                <span style={{ fontSize:11, color:'#888' }}>{e.year}</span>
              </div>
              <div style={{ fontSize:12, color:'#555' }}>{e.institution}</div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {data.certifications?.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:accentColor, marginBottom:8, borderBottom:`1px solid ${accentColor}22`, paddingBottom:4 }}>Certifications</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {data.certifications.map((c,i) => (
              <span key={i} style={{ fontSize:12, padding:'2px 10px', border:`1px solid ${accentColor}30`, borderRadius:4, color:'#444' }}>🏅 {typeof c==='string'?c:c.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumeBuilderPage({ user }) {
  const [template, setTemplate] = useState('modern');
  const [tab, setTab] = useState('info');
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('resume_data')||'null');
      if (stored) return stored;
    } catch {}
    return {
      name: user?.name || '',
      title: user?.title || '',
      email: user?.email || '',
      phone: '',
      location: user?.location || '',
      linkedin: '',
      github: '',
      summary: '',
      skills: (user?.skills||[]).slice(0,10),
      experience: [{ role:'', company:'', duration:'', description:'' }],
      education: [{ degree:'', institution:'', year:'' }],
      certifications: (user?.certifications||[]).filter(c=>c.completed).map(c=>c.name||c),
    };
  });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const saveData = () => {
    localStorage.setItem('resume_data', JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addExp  = () => set('experience', [...data.experience, { role:'', company:'', duration:'', description:'' }]);
  const addEdu  = () => set('education', [...data.education, { degree:'', institution:'', year:'' }]);
  const remExp  = (i) => set('experience', data.experience.filter((_,j)=>j!==i));
  const remEdu  = (i) => set('education', data.education.filter((_,j)=>j!==i));

  const setExp  = (i, k, v) => set('experience', data.experience.map((e,j)=>j!==i?e:{...e,[k]:v}));
  const setEdu  = (i, k, v) => set('education', data.education.map((e,j)=>j!==i?e:{...e,[k]:v}));

  const TABS = ['info','experience','education','preview'];

  return (
    <div>
      {saved && <Alert type="success" style={{ marginBottom:16 }}>Resume data saved locally!</Alert>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h3 style={{ marginBottom:4 }}>Resume Builder</h3>
          <p style={{ fontSize:14, color:'var(--ink-3)' }}>Build a professional resume from your profile data</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={saveData}>💾 Save Draft</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 Print / Export PDF</button>
        </div>
      </div>

      {/* Template picker */}
      <div style={{ display:'flex', gap:10, marginBottom:24 }}>
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => setTemplate(t.id)}
            style={{ padding:'10px 16px', borderRadius:9, border:`2px solid ${template===t.id?'#3B82F6':'var(--border)'}`, background:template===t.id?'rgba(59,130,246,0.08)':'var(--surface)', cursor:'pointer', fontFamily:"Inter,sans-serif", transition:'all 0.15s' }}>
            <div style={{ fontSize:13, fontWeight:700, color:template===t.id?'#3B82F6':'var(--ink)', marginBottom:2 }}>{t.name}</div>
            <div style={{ fontSize:11, color:'var(--ink-3)' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:tab==='preview'?'1fr':'1fr 1fr', gap:20 }}>
        {/* Form */}
        {tab !== 'preview' && (
          <div>
            <div className="tabs" style={{ marginBottom:20 }}>
              {TABS.filter(t=>t!=='preview').map(t => (
                <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
                  {t==='info'?'Basic Info':t==='experience'?'Experience':'Education'}
                </button>
              ))}
            </div>

            {tab === 'info' && (
              <div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Full Name</label><input value={data.name} onChange={e=>set('name',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Job Title</label><input value={data.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Full Stack Developer" /></div>
                  <div className="form-group"><label className="form-label">Email</label><input value={data.email} onChange={e=>set('email',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input value={data.phone} onChange={e=>set('phone',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Location</label><input value={data.location} onChange={e=>set('location',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">LinkedIn URL</label><input value={data.linkedin} onChange={e=>set('linkedin',e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">GitHub URL</label><input value={data.github} onChange={e=>set('github',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Professional Summary</label><textarea value={data.summary} onChange={e=>set('summary',e.target.value)} rows={4} placeholder="A brief professional summary (2–3 sentences)..." /></div>
              </div>
            )}

            {tab === 'experience' && (
              <div>
                {data.experience.map((e,i) => (
                  <div key={i} className="card card-sm" style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>Experience #{i+1}</div>
                      {data.experience.length>1 && <button className="btn btn-danger btn-xs" onClick={()=>remExp(i)}>Remove</button>}
                    </div>
                    <div className="grid-2">
                      <div className="form-group"><label className="form-label">Role / Position</label><input value={e.role} onChange={ev=>setExp(i,'role',ev.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Company</label><input value={e.company} onChange={ev=>setExp(i,'company',ev.target.value)} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Duration (e.g. Jan 2022 – Present)</label><input value={e.duration} onChange={ev=>setExp(i,'duration',ev.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Description / Achievements</label><textarea value={e.description} onChange={ev=>setExp(i,'description',ev.target.value)} rows={3} /></div>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" onClick={addExp}>+ Add Experience</button>
              </div>
            )}

            {tab === 'education' && (
              <div>
                {data.education.map((e,i) => (
                  <div key={i} className="card card-sm" style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>Education #{i+1}</div>
                      {data.education.length>1 && <button className="btn btn-danger btn-xs" onClick={()=>remEdu(i)}>Remove</button>}
                    </div>
                    <div className="grid-2">
                      <div className="form-group"><label className="form-label">Degree / Qualification</label><input value={e.degree} onChange={ev=>setEdu(i,'degree',ev.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Institution</label><input value={e.institution} onChange={ev=>setEdu(i,'institution',ev.target.value)} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Year</label><input value={e.year} onChange={ev=>setEdu(i,'year',ev.target.value)} placeholder="e.g. 2020 – 2024" /></div>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" onClick={addEdu}>+ Add Education</button>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--ink-2)' }}>Live Preview</span>
            <button className={`btn btn-sm ${tab==='preview'?'btn-ghost':'btn-outline'}`} onClick={() => setTab(tab==='preview'?'info':'preview')}>
              {tab==='preview'?'← Back to Edit':'Full Preview ↗'}
            </button>
          </div>
          <ResumePreview data={data} template={template} />
        </div>
      </div>
    </div>
  );
}
