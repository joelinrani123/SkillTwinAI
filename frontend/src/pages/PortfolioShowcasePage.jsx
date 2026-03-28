import { useState, useEffect } from 'react';
import { Spinner, Alert, EmptyState } from '../components/UI';
import { api } from '../services/api';

const THEME_PRESETS = [
  { id: 'midnight', label: 'Midnight', bg: '#0f172a', surface: '#1e293b', accent: '#6366f1', text: '#f1f5f9', sub: '#94a3b8' },
  { id: 'ocean',    label: 'Ocean',    bg: '#0c1a2e', surface: '#112240', accent: '#64ffda', text: '#ccd6f6', sub: '#8892b0' },
  { id: 'rose',     label: 'Rose',     bg: '#1a0a0a', surface: '#2d1515', accent: '#f43f5e', text: '#fef2f2', sub: '#fda4af' },
  { id: 'forest',   label: 'Forest',   bg: '#0a1a0e', surface: '#14261a', accent: '#22c55e', text: '#f0fdf4', sub: '#86efac' },
  { id: 'light',    label: 'Light',    bg: '#f8fafc', surface: '#ffffff', accent: '#6366f1', text: '#1e293b', sub: '#64748b' },
];

function ShareModal({ open, onClose, url }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  if (!open) return null;
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'32px 36px',maxWidth:460,width:'90%',boxShadow:'var(--shadow-lg)' }}>
        <h3 style={{ marginBottom:8 }}>Share Your Portfolio</h3>
        <p style={{ color:'var(--ink-3)',fontSize:14,marginBottom:20 }}>Copy this link and send it to recruiters or add it to your profiles.</p>
        <div style={{ display:'flex',gap:8,marginBottom:24 }}>
          <input value={url} readOnly style={{ flex:1,fontSize:13,padding:'10px 12px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--ink)' }} />
          <button className="btn btn-primary btn-sm" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
        <div style={{ display:'flex',gap:10,marginBottom:20 }}>
          <a href={'https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url)} target="_blank" rel="noopener noreferrer"
            style={{ flex:1,textAlign:'center',padding:'10px',background:'#0077b5',color:'#fff',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none' }}>LinkedIn</a>
          <a href={'https://twitter.com/intent/tweet?url='+encodeURIComponent(url)+'&text=Check+out+my+skill+portfolio!'} target="_blank" rel="noopener noreferrer"
            style={{ flex:1,textAlign:'center',padding:'10px',background:'#1da1f2',color:'#fff',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none' }}>Twitter/X</a>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width:'100%' }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function PortfolioPreview({ user, theme, sections, testimonials, customBio }) {
  const t = THEME_PRESETS.find(p => p.id === theme) || THEME_PRESETS[0];
  const skills   = sections.skills   ? (user?.skills || []) : [];
  const certs    = sections.certs    ? (user?.certifications||[]).filter(c=>c.completed) : [];
  const projects = sections.projects ? (user?.projects || []) : [];
  const bio = customBio || user?.bio || ('Passionate developer with expertise in '+(user?.skills||[]).slice(0,3).map(s=>s.name).join(', ')+'.');
  const score = user?.overallScore || 0;

  return (
    <div style={{ background:t.bg,color:t.text,fontFamily:"Inter,sans-serif",minHeight:500,overflow:'hidden',fontSize:14 }}>
      <div style={{ background:t.surface,borderBottom:'1px solid '+t.accent+'33',padding:'40px 48px',display:'flex',alignItems:'center',gap:28,flexWrap:'wrap' }}>
        <div style={{ width:72,height:72,borderRadius:'50%',background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color:t.bg,flexShrink:0 }}>
          {(user?.name||'U')[0].toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:26,fontWeight:900,color:t.text,margin:0 }}>{user?.name||'Your Name'}</div>
          <div style={{ color:t.accent,fontWeight:600,fontSize:14,marginTop:4 }}>{user?.title||'Full Stack Developer'}</div>
          {user?.location&&<div style={{ color:t.sub,fontSize:13,marginTop:3 }}>{'📍 '+user.location}</div>}
          {score>0&&(
            <div style={{ marginTop:10,display:'inline-flex',alignItems:'center',gap:8,background:t.accent+'22',border:'1px solid '+t.accent+'44',borderRadius:20,padding:'4px 14px' }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:t.accent }} />
              <span style={{ fontSize:13,fontWeight:700,color:t.accent }}>{'Overall Score: '+score+'%'}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:'36px 48px',display:'flex',flexDirection:'column',gap:32 }}>
        {sections.bio&&(
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:t.accent,marginBottom:12 }}>About</div>
            <p style={{ margin:0,color:t.sub,lineHeight:1.7,maxWidth:600 }}>{bio}</p>
          </div>
        )}
        {sections.skills&&skills.length>0&&(
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:t.accent,marginBottom:14 }}>Skills</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10 }}>
              {skills.map(s=>(
                <div key={s._id||s.name} style={{ background:t.surface,border:'1px solid '+t.accent+'22',borderRadius:8,padding:'10px 14px' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                    <span style={{ fontWeight:600,fontSize:13 }}>{s.name}</span>
                    <span style={{ color:t.accent,fontWeight:700,fontSize:12 }}>{s.level+'%'}</span>
                  </div>
                  <div style={{ height:4,background:t.bg,borderRadius:2,overflow:'hidden' }}>
                    <div style={{ height:'100%',width:s.level+'%',background:t.accent,borderRadius:2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.certs&&certs.length>0&&(
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:t.accent,marginBottom:14 }}>Certifications</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
              {certs.map((c,i)=>(
                <div key={i} style={{ background:t.surface,border:'1px solid '+t.accent+'33',borderRadius:20,padding:'6px 14px',fontSize:12.5,fontWeight:600,display:'flex',alignItems:'center',gap:6 }}>
                  <span style={{ color:t.accent }}>◈</span>{c.name}
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.projects&&projects.length>0&&(
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:t.accent,marginBottom:14 }}>Projects</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12 }}>
              {projects.map((p,i)=>(
                <div key={i} style={{ background:t.surface,border:'1px solid '+t.accent+'22',borderRadius:10,padding:'16px 18px' }}>
                  <div style={{ fontWeight:700,marginBottom:6,fontSize:14 }}>{p.name}</div>
                  {p.description&&<p style={{ color:t.sub,fontSize:12.5,margin:'0 0 10px',lineHeight:1.6 }}>{p.description}</p>}
                  {(p.tech||[]).length>0&&(
                    <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                      {p.tech.map((tech,j)=><span key={j} style={{ background:t.accent+'18',color:t.accent,fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600 }}>{tech}</span>)}
                    </div>
                  )}
                  {(p.link||p.url)&&<a href={p.link||p.url} target="_blank" rel="noopener noreferrer" style={{ color:t.accent,fontSize:12,marginTop:8,display:'block' }}>View →</a>}
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.testimonials&&testimonials.length>0&&(
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:t.accent,marginBottom:14 }}>Testimonials</div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {testimonials.map((tm,i)=>(
                <div key={i} style={{ background:t.surface,border:'1px solid '+t.accent+'22',borderRadius:10,padding:'16px 20px',borderLeft:'3px solid '+t.accent }}>
                  <p style={{ margin:'0 0 8px',color:t.text,fontStyle:'italic',lineHeight:1.6,fontSize:13.5 }}>{'"'+tm.text+'"'}</p>
                  <div style={{ fontSize:12,fontWeight:700,color:t.accent }}>{tm.author}</div>
                  {tm.role&&<div style={{ fontSize:11.5,color:t.sub }}>{tm.role}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortfolioShowcasePage({ user }) {
  const [theme, setTheme]           = useState('midnight');
  const [sections, setSections]     = useState({ bio:true,skills:true,certs:true,projects:true,testimonials:true });
  const [customBio, setCustomBio]   = useState('');
  const [testimonials, setTestimonials] = useState([]);
  const [newT, setNewT]             = useState({ text:'',author:'',role:'' });
  const [showShare, setShowShare]   = useState(false);
  const [saved, setSaved]           = useState(false);
  const [activeTab, setActiveTab]   = useState('design');

  const portfolioUrl = window.location.origin+'?portfolio='+(user?._id||'demo');
  const toggleSection = k => setSections(s => ({...s,[k]:!s[k]}));
  const addTestimonial = () => {
    if (!newT.text.trim()||!newT.author.trim()) return;
    setTestimonials(t=>[...t,{...newT}]);
    setNewT({text:'',author:'',role:''});
  };
  const removeTestimonial = i => setTestimonials(t=>t.filter((_,idx)=>idx!==i));
  const handleSave = () => { setSaved(true); setTimeout(()=>setSaved(false),2000); };

  const skills   = user?.skills||[];
  const certs    = (user?.certifications||[]).filter(c=>c.completed);
  const projects = user?.projects||[];

  return (
    <div>
      <div style={{ marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,flexWrap:'wrap' }}>
        <div>
          <h2>Portfolio Showcase</h2>
          <p style={{ color:'var(--ink-3)',marginTop:6,fontSize:15 }}>Build a beautiful, shareable portfolio page — send your link directly to recruiters instead of a resume.</p>
        </div>
        <div style={{ display:'flex',gap:10,flexShrink:0 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleSave}>{saved?'✓ Saved':'Save Changes'}</button>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowShare(true)}>Share Portfolio ↗</button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'300px 1fr',gap:20,alignItems:'start' }}>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div className="tabs" style={{ marginBottom:0 }}>
            {[['design','Design'],['content','Content'],['testimonials','Testimonials']].map(([id,label])=>(
              <button key={id} className={'tab'+(activeTab===id?' active':'')} onClick={()=>setActiveTab(id)}>{label}</button>
            ))}
          </div>

          {activeTab==='design'&&(
            <div className="card" style={{ padding:'20px' }}>
              <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:14 }}>Color Theme</div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {THEME_PRESETS.map(p=>(
                  <button key={p.id} onClick={()=>setTheme(p.id)}
                    style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:8,border:'1.5px solid '+(theme===p.id?'var(--accent)':'var(--border)'),background:theme===p.id?'var(--accent-faint)':'var(--surface-2)',cursor:'pointer',transition:'all 0.12s',fontFamily:'inherit',fontWeight:theme===p.id?700:400,color:'var(--ink)' }}>
                    <div style={{ display:'flex',gap:5 }}>
                      <div style={{ width:16,height:16,borderRadius:'50%',background:p.bg,border:'1px solid var(--border)' }} />
                      <div style={{ width:16,height:16,borderRadius:'50%',background:p.surface }} />
                      <div style={{ width:16,height:16,borderRadius:'50%',background:p.accent }} />
                    </div>
                    <span style={{ fontSize:13 }}>{p.label}</span>
                    {theme===p.id&&<span style={{ marginLeft:'auto',fontSize:14,color:'var(--accent)' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab==='content'&&(
            <div className="card" style={{ padding:'20px' }}>
              <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:14 }}>Visible Sections</div>
              <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:20 }}>
                {[
                  ['bio','About / Bio',true],
                  ['skills','Skills ('+skills.length+')',skills.length>0],
                  ['certs','Certificates ('+certs.length+')',certs.length>0],
                  ['projects','Projects ('+projects.length+')',projects.length>0],
                  ['testimonials','Testimonials',true],
                ].map(([key,label,hasData])=>(
                  <label key={key} style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer',opacity:hasData?1:0.5 }}>
                    <div onClick={()=>hasData&&toggleSection(key)}
                      style={{ width:18,height:18,borderRadius:4,border:'1.5px solid '+(sections[key]&&hasData?'var(--accent)':'var(--border)'),background:sections[key]&&hasData?'var(--accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.1s',flexShrink:0 }}>
                      {sections[key]&&hasData&&<span style={{ fontSize:11,color:'white',fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13,fontWeight:600 }}>{label}</span>
                    {!hasData&&<span style={{ fontSize:11,color:'var(--ink-4)',marginLeft:'auto' }}>no data</span>}
                  </label>
                ))}
              </div>
              <div style={{ borderTop:'1px solid var(--border)',paddingTop:16 }}>
                <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:10 }}>Custom Bio</div>
                <textarea value={customBio} onChange={e=>setCustomBio(e.target.value)}
                  placeholder="Write a personal bio for your portfolio…"
                  rows={4} style={{ width:'100%',fontSize:13,padding:'10px 12px',borderRadius:8,resize:'vertical',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--ink)',fontFamily:'inherit',lineHeight:1.6,boxSizing:'border-box' }} />
              </div>
            </div>
          )}

          {activeTab==='testimonials'&&(
            <div className="card" style={{ padding:'20px' }}>
              <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)',marginBottom:14 }}>Add Testimonial</div>
              <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:16 }}>
                <textarea value={newT.text} onChange={e=>setNewT(n=>({...n,text:e.target.value}))}
                  placeholder="What did they say about your work?"
                  rows={3} style={{ fontSize:13,padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--ink)',fontFamily:'inherit',resize:'vertical' }} />
                <input value={newT.author} onChange={e=>setNewT(n=>({...n,author:e.target.value}))}
                  placeholder="Name (e.g. Jane Smith)" style={{ fontSize:13,padding:'10px 12px',borderRadius:8 }} />
                <input value={newT.role} onChange={e=>setNewT(n=>({...n,role:e.target.value}))}
                  placeholder="Their role (e.g. Manager at Infosys)" style={{ fontSize:13,padding:'10px 12px',borderRadius:8 }} />
                <button className="btn btn-primary btn-sm" onClick={addTestimonial}
                  disabled={!newT.text.trim()||!newT.author.trim()}>+ Add Testimonial</button>
              </div>
              {testimonials.length>0?(
                <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                  {testimonials.map((tm,i)=>(
                    <div key={i} style={{ background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,padding:'12px',position:'relative' }}>
                      <p style={{ margin:'0 0 6px',fontSize:12.5,color:'var(--ink)',lineHeight:1.5,fontStyle:'italic' }}>{'"'+tm.text+'"'}</p>
                      <div style={{ fontSize:12,fontWeight:700,color:'var(--accent)' }}>{tm.author}</div>
                      {tm.role&&<div style={{ fontSize:11,color:'var(--ink-3)' }}>{tm.role}</div>}
                      <button onClick={()=>removeTestimonial(i)} style={{ position:'absolute',top:8,right:8,background:'none',border:'none',cursor:'pointer',color:'var(--ink-4)',fontSize:15,padding:'2px 6px' }}>×</button>
                    </div>
                  ))}
                </div>
              ):(
                <div style={{ textAlign:'center',padding:'20px 0',color:'var(--ink-4)',fontSize:13 }}>No testimonials yet. Ask colleagues for a quote!</div>
              )}
            </div>
          )}

          <div className="card" style={{ padding:'16px 20px',background:'var(--accent-faint)',border:'1px solid var(--border-2)' }}>
            <div style={{ fontSize:13,fontWeight:700,color:'var(--accent)',marginBottom:6 }}>✦ Ready to share?</div>
            <p style={{ fontSize:12.5,color:'var(--ink-3)',margin:'0 0 12px',lineHeight:1.6 }}>Send your portfolio link directly to recruiters or add it to LinkedIn & GitHub.</p>
            <button className="btn btn-primary btn-sm" style={{ width:'100%' }} onClick={()=>setShowShare(true)}>Get Share Link ↗</button>
          </div>
        </div>

        <div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
            <div style={{ fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--ink-3)' }}>Live Preview</div>
            <div style={{ display:'flex',gap:6 }}>
              <div style={{ width:10,height:10,borderRadius:'50%',background:'#ff5f57' }} />
              <div style={{ width:10,height:10,borderRadius:'50%',background:'#febc2e' }} />
              <div style={{ width:10,height:10,borderRadius:'50%',background:'#28c840' }} />
            </div>
          </div>
          <div style={{ border:'1px solid var(--border)',borderRadius:12,overflow:'hidden',boxShadow:'var(--shadow)' }}>
            <PortfolioPreview user={user} theme={theme} sections={sections} testimonials={testimonials} customBio={customBio} />
          </div>
          <p style={{ fontSize:12,color:'var(--ink-4)',marginTop:10,textAlign:'center' }}>Live preview — changes reflect instantly.</p>
        </div>
      </div>

      <ShareModal open={showShare} onClose={()=>setShowShare(false)} url={portfolioUrl} />
    </div>
  );
}
