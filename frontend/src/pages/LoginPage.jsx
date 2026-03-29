import { useState } from 'react';
import { Spinner, Alert } from '../components/UI';
import { api } from '../services/api';

/* ── Password strength indicator ── */
function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter',  ok: /[a-z]/.test(password) },
    { label: 'One number',            ok: /[0-9]/.test(password) },
    { label: 'One special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  const passed   = checks.filter(c => c.ok).length;
  const barColor = passed <= 2 ? '#dc2626' : passed <= 3 ? '#f97316' : passed <= 4 ? '#16a34a' : '#15803d';
  const label    = passed <= 2 ? 'Weak' : passed <= 3 ? 'Fair' : passed <= 4 ? 'Good' : 'Strong';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:11, color:'var(--ink-3)', fontFamily:"Inter,sans-serif" }}>Password strength</span>
        <span style={{ fontSize:11, color:barColor, fontWeight:600, fontFamily:"Inter,sans-serif" }}>{label}</span>
      </div>
      <div style={{ height:3, background:'#e5e7eb', borderRadius:2, overflow:'hidden', marginBottom:8 }}>
        <div style={{ height:'100%', width:`${(passed/5)*100}%`, background:barColor, borderRadius:2, transition:'width 0.25s, background 0.25s' }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {checks.map(c => (
          <div key={c.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:'50%', flexShrink:0, background:c.ok?'#16a34a':'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}>
              {c.ok
                ? <svg width="7" height="7" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                : <svg width="5" height="5" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              }
            </div>
            <span style={{ fontSize:11.5, color:c.ok?'#15803d':'#9ca3af', fontFamily:"Inter,sans-serif", transition:'color 0.2s' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function validatePassword(pw) {
  if (pw.length < 8)             return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw))        return 'Must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pw))        return 'Must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pw))        return 'Must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Must contain at least one special character (@, #, ! etc).';
  return null;
}
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

const TESTIMONIALS = [
  { quote: "SkillTwinAI helped me land my dream role in 3 weeks. The verified skill scores made all the difference.", name:"Priya S.", role:"Frontend Engineer" },
  { quote: "Best platform for finding talent with proven, measurable skills. Our hiring quality improved dramatically.", name:"Rahul M.", role:"Hiring Manager, TechCorp" },
  { quote: "The AI coaching feature is like having a career advisor 24/7. I doubled my assessment scores in a month.", name:"Arjun K.", role:"Full Stack Developer" },
];

export default function LoginPage({ onLogin, onBack }) {
  const [mode,        setMode]        = useState('login');
  const [role,        setRole]        = useState('candidate');
  const [form,        setForm]        = useState({ name:'', email:'', password:'' });
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [tIdx,        setTIdx]        = useState(0);

  // Security question for signup
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [securityQuestion,  setSecurityQuestion]  = useState('');
  const [securityAnswer,    setSecurityAnswer]    = useState('');

  // Password reset modal — 3 steps: email | answer | newpw | done
  const [showReset,    setShowReset]    = useState(false);
  const [resetStep,    setResetStep]    = useState('email'); // email | answer | newpw | done
  const [resetEmail,   setResetEmail]   = useState('');
  const [resetQ,       setResetQ]       = useState('');
  const [resetAnswer,  setResetAnswer]  = useState('');
  const [resetToken,   setResetToken]   = useState('');
  const [resetNewPw,   setResetNewPw]   = useState('');
  const [resetShowPw,  setResetShowPw]  = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load security questions when signup tab opened
  const loadSecurityQuestions = async () => {
    if (securityQuestions.length) return;
    try {
      const d = await api.auth.getSecurityQuestions();
      setSecurityQuestions(d.questions || []);
      if (d.questions?.length) setSecurityQuestion(d.questions[0]);
    } catch {}
  };

  const openReset = () => {
    setShowReset(true);
    setResetStep('email');
    setResetEmail('');
    setResetQ('');
    setResetAnswer('');
    setResetToken('');
    setResetNewPw('');
    setResetError('');
  };

  // Step 1 — verify email
  const handleResetEmail = async () => {
    if (!resetEmail || !validateEmail(resetEmail)) { setResetError('Please enter a valid email address.'); return; }
    setResetLoading(true); setResetError('');
    try {
      const d = await api.auth.resetVerifyEmail(resetEmail);
      setResetQ(d.question);
      setResetStep('answer');
    } catch (e) { setResetError(e.message || 'Email not found.'); }
    finally { setResetLoading(false); }
  };

  // Step 2 — verify answer
  const handleResetAnswer = async () => {
    if (!resetAnswer.trim()) { setResetError('Please enter your answer.'); return; }
    setResetLoading(true); setResetError('');
    try {
      const d = await api.auth.resetVerifyAnswer(resetEmail, resetAnswer);
      setResetToken(d.resetToken);
      setResetStep('newpw');
    } catch (e) { setResetError(e.message || 'Incorrect answer.'); }
    finally { setResetLoading(false); }
  };

  // Step 3 — set new password
  const handleResetSetPw = async () => {
    const pwErr = validatePassword(resetNewPw);
    if (pwErr) { setResetError(pwErr); return; }
    setResetLoading(true); setResetError('');
    try {
      const d = await api.auth.resetSetPassword(resetToken, resetNewPw);
      setResetStep('done');
      // auto-login after reset
      setTimeout(() => { onLogin(d.token, d.user); setShowReset(false); }, 1800);
    } catch (e) { setResetError(e.message || 'Failed to reset password.'); }
    finally { setResetLoading(false); }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all required fields.'); return; }
    if (!validateEmail(form.email))    { setError('Please enter a valid email address.'); return; }
    if (mode === 'signup') {
      if (!form.name.trim()) { setError('Full name is required.'); return; }
      const pwErr = validatePassword(form.password);
      if (pwErr) { setError(pwErr); return; }
      if (!securityQuestion) { setError('Please select a security question.'); return; }
      if (!securityAnswer.trim() || securityAnswer.trim().length < 2) { setError('Please enter a security answer (at least 2 characters).'); return; }
    }
    setLoading(true);
    try {
      const res = mode === 'signup'
        ? await api.auth.signup(form.name, form.email, form.password, role, securityQuestion, securityAnswer)
        : await api.auth.login(form.email, form.password);
      onLogin(res.token, res.user);
    } catch (e) { setError(e.message || 'Authentication failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const t = TESTIMONIALS[tIdx];

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#f0f2f5' }}>
      {/* Left dark panel */}
      <div style={{ width:460, background:'#1F2937', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', padding:'56px 48px', position:'relative', overflow:'hidden', flexShrink:0 }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, left:-60, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontFamily:"Inter,sans-serif", fontSize:22, fontWeight:700, color:'#fff', marginBottom:64, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(59,130,246,0.25)', border:'1px solid rgba(59,130,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:14, color:'#93c5fd' }}>S</span>
            </div>
            SkillTwin<span style={{ color:'rgba(255,255,255,0.28)' }}>AI</span>
          </div>

          <h1 style={{ fontFamily:"Inter,sans-serif", fontSize:38, fontWeight:700, color:'#fff', lineHeight:1.15, marginBottom:18 }}>
            {mode === 'login' ? 'Welcome back.' : 'Start your journey.'}
          </h1>
          <p style={{ color:'rgba(255,255,255,0.48)', fontSize:15.5, lineHeight:1.75, maxWidth:300, fontFamily:"Inter,sans-serif", marginBottom:40 }}>
            {mode === 'login'
              ? 'Sign in to continue tracking your skills and career progress.'
              : 'Build your verified skill profile and connect with top recruiters.'}
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:48 }}>
            {[['◈','Track skills & proficiency'],['◉','Adaptive assessments'],['✦','Verified certifications'],['◫','Smart job matching'],['⬡','AI career coaching 24/7'],['◎','Recruiter discovery'],].map(([ic,tx]) => (
              <div key={tx} style={{ display:'flex', alignItems:'center', gap:12, fontSize:14, color:'rgba(255,255,255,0.50)', fontFamily:"Inter,sans-serif" }}>
                <span style={{ color:'#93b4fd', fontSize:16 }}>{ic}</span>{tx}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div style={{ marginTop:'auto', position:'relative', zIndex:1 }}>
          <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'20px 22px' }}>
            <div style={{ fontSize:28, color:'rgba(147,180,253,0.5)', lineHeight:1, marginBottom:8 }}>"</div>
            <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.65)', lineHeight:1.7, fontFamily:"Inter,sans-serif", marginBottom:14 }}>{t.quote}</p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', fontFamily:"Inter,sans-serif" }}>{t.name}</div>
                <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.40)', fontFamily:"Inter,sans-serif" }}>{t.role}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {TESTIMONIALS.map((_,i) => (
                  <button key={i} onClick={() => setTIdx(i)}
                    style={{ width:6, height:6, borderRadius:'50%', border:'none', cursor:'pointer', background:i===tIdx?'#93c5fd':'rgba(255,255,255,0.20)', transition:'all 0.2s', padding:0 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:440 }}>

          <div style={{ display:'flex', background:'#e8ebf0', borderRadius:10, padding:4, marginBottom:32, border:'1px solid #dde1e8' }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{ flex:1, padding:'11px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:mode===m?600:400, background:mode===m?'#fff':'transparent', color:mode===m?'#1F2937':'#6B7280', boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.10)':'none', transition:'all 0.15s' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {error && <Alert type="error" style={{ marginBottom:20 }}>{error}</Alert>}

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} placeholder="Enter your name" autoFocus />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} placeholder="Enter your email" />
          </div>

          <div className="form-group">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <label className="form-label" style={{ marginBottom:0 }}>Password</label>
              {mode === 'login' && (
                <button style={{ background:'none', border:'none', color:'var(--accent)', fontSize:13, cursor:'pointer', fontFamily:"Inter,sans-serif", fontWeight:500 }}
                  onClick={() => { openReset(); setResetEmail(form.email||''); }}>
                  Forgot password?
                </button>
              )}
            </div>
            <div style={{ position:'relative' }}>
              <input type={showPwd?'text':'password'} value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} placeholder="••••••••" />
              <button onClick={() => setShowPwd(p => !p)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--ink-3)', cursor:'pointer', fontSize:13, fontFamily:"Inter,sans-serif", fontWeight:500 }}>
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
            {mode === 'signup' && <PasswordStrength password={form.password} />}
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">I am a…</label>
              <div style={{ display:'flex', gap:10 }}>
                {[['candidate','👤 Candidate','Looking for jobs'],['recruiter','🏢 Recruiter','Hiring talent']].map(([r,label,sub]) => (
                  <button key={r} onClick={() => setRole(r)}
                    style={{ flex:1, padding:'12px 10px', borderRadius:9, cursor:'pointer', fontFamily:"Inter,sans-serif", border:role===r?'2px solid #3B82F6':'1.5px solid var(--border-2)', background:role===r?'rgba(59,130,246,0.08)':'transparent', transition:'all 0.15s', textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:600, color:role===r?'#3B82F6':'var(--ink-2)', marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:11.5, color:role===r?'rgba(59,130,246,0.7)':'var(--ink-4)' }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Security Question <span style={{ fontSize:11, color:'var(--ink-4)', fontWeight:400 }}>(for password recovery)</span></label>
              <select
                value={securityQuestion}
                onChange={e => setSecurityQuestion(e.target.value)}
                style={{ width:'100%', padding:'11px 14px', borderRadius:9, border:'1.5px solid var(--border-2)', fontSize:14, fontFamily:"Inter,sans-serif", color:'var(--ink)', background:'var(--surface)', cursor:'pointer', outline:'none', marginBottom:8 }}>
                {securityQuestions.length === 0 && <option value="">Loading…</option>}
                {securityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <input
                type="text"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                placeholder="Your answer (not case-sensitive)"
                style={{ fontSize:14 }}
              />
              <p style={{ fontSize:11.5, color:'var(--ink-4)', marginTop:5, fontFamily:"Inter,sans-serif" }}>
                🔒 Used to reset your password directly — no email needed.
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <p style={{ fontSize:12, color:'var(--ink-3)', fontFamily:"Inter,sans-serif", lineHeight:1.6, marginBottom:16 }}>
              By creating an account, you agree to our <span style={{ color:'var(--accent)', cursor:'pointer' }}>Terms of Service</span> and <span style={{ color:'var(--accent)', cursor:'pointer' }}>Privacy Policy</span>.
            </p>
          )}

          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ width:'100%', padding:'14px', fontSize:16, justifyContent:'center', marginTop:8, borderRadius:10 }}>
            {loading ? <><Spinner size={15} color="white" /> Please wait…</> : mode==='login' ? 'Sign In' : 'Create Account'}
          </button>

          <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--ink-3)', fontFamily:"Inter,sans-serif" }}>
            {mode==='login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { const next = mode==='login'?'signup':'login'; setMode(next); setError(''); if (next==='signup') loadSecurityQuestions(); }}
              style={{ background:'none', border:'none', color:'var(--accent)', fontWeight:600, cursor:'pointer', fontSize:14, fontFamily:"Inter,sans-serif" }}>
              {mode==='login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          <button onClick={onBack}
            style={{ width:'100%', padding:'12px', marginTop:8, background:'none', border:'none', cursor:'pointer', color:'var(--ink-3)', fontSize:14, fontFamily:"Inter,sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.color='var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--ink-3)'}>
            ← Back to home
          </button>

          <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:24, paddingTop:20, borderTop:'1px solid var(--border)' }}>
            {[['🔒','Secure & Encrypted'],['✅','No spam, ever'],['🚀','Free to start']].map(([icon,label]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'var(--ink-3)', fontFamily:"Inter,sans-serif" }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Password Reset Modal (3-step, no email needed) ── */}
      {showReset && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.50)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
          onClick={e => e.target === e.currentTarget && setShowReset(false)}>
          <div style={{ background:'#fff', borderRadius:18, padding:'36px 38px', width:'100%', maxWidth:430, boxShadow:'0 24px 64px rgba(0,0,0,0.22)', position:'relative' }}>
            <button onClick={() => setShowReset(false)} style={{ position:'absolute', top:16, right:18, background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9CA3AF', lineHeight:1 }}>×</button>

            {/* Step progress dots */}
            {resetStep !== 'done' && (
              <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:28 }}>
                {['email','answer','newpw'].map((s,i) => (
                  <div key={s} style={{ width: resetStep===s ? 22 : 8, height:8, borderRadius:4, background: ['email','answer','newpw'].indexOf(resetStep) >= i ? '#3B82F6' : '#E5E7EB', transition:'all 0.25s' }} />
                ))}
              </div>
            )}

            {/* ── DONE ── */}
            {resetStep === 'done' && (
              <div style={{ textAlign:'center', padding:'12px 0' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(22,163,74,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:30 }}>✓</div>
                <h3 style={{ fontFamily:"Inter,sans-serif", fontSize:22, fontWeight:700, color:'#1F2937', marginBottom:10 }}>Password Reset!</h3>
                <p style={{ fontSize:14, color:'#6B7280', fontFamily:"Inter,sans-serif" }}>Signing you in automatically…</p>
              </div>
            )}

            {/* ── STEP 1: Email ── */}
            {resetStep === 'email' && (
              <>
                <h3 style={{ fontFamily:"Inter,sans-serif", fontSize:20, fontWeight:700, color:'#1F2937', marginBottom:6 }}>Reset your password</h3>
                <p style={{ fontSize:14, color:'#6B7280', fontFamily:"Inter,sans-serif", marginBottom:24, lineHeight:1.6 }}>Enter your account email and we'll verify it with your security question — no email link needed.</p>
                {resetError && <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', fontFamily:"Inter,sans-serif" }}>{resetError}</div>}
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleResetEmail()} placeholder="you@example.com" autoFocus style={{ fontSize:15 }} />
                </div>
                <button onClick={handleResetEmail} disabled={resetLoading}
                  style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:'#3B82F6', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:"Inter,sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:resetLoading?0.7:1 }}>
                  {resetLoading ? <><Spinner size={15} color="white" /> Checking…</> : 'Continue →'}
                </button>
                <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#9CA3AF', fontFamily:"Inter,sans-serif" }}>
                  Remember it? <button onClick={() => setShowReset(false)} style={{ background:'none', border:'none', color:'#3B82F6', fontWeight:600, cursor:'pointer', fontSize:13, fontFamily:"Inter,sans-serif" }}>Sign in</button>
                </p>
              </>
            )}

            {/* ── STEP 2: Security Answer ── */}
            {resetStep === 'answer' && (
              <>
                <h3 style={{ fontFamily:"Inter,sans-serif", fontSize:20, fontWeight:700, color:'#1F2937', marginBottom:6 }}>Security Question</h3>
                <p style={{ fontSize:13.5, color:'#6B7280', fontFamily:"Inter,sans-serif", marginBottom:24, lineHeight:1.6 }}>Answer the security question you set when signing up.</p>
                <div style={{ background:'#F3F4F6', borderRadius:10, padding:'14px 16px', marginBottom:20, fontSize:14, color:'#374151', fontFamily:"Inter,sans-serif", fontWeight:500, lineHeight:1.5 }}>
                  🔐 {resetQ}
                </div>
                {resetError && <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', fontFamily:"Inter,sans-serif" }}>{resetError}</div>}
                <div className="form-group">
                  <label className="form-label">Your Answer</label>
                  <input type="text" value={resetAnswer} onChange={e => setResetAnswer(e.target.value)} onKeyDown={e => e.key==='Enter' && handleResetAnswer()} placeholder="Enter your answer" autoFocus style={{ fontSize:15 }} />
                  <p style={{ fontSize:11.5, color:'var(--ink-4)', marginTop:4, fontFamily:"Inter,sans-serif" }}>Not case-sensitive</p>
                </div>
                <button onClick={handleResetAnswer} disabled={resetLoading}
                  style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:'#3B82F6', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:"Inter,sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:resetLoading?0.7:1 }}>
                  {resetLoading ? <><Spinner size={15} color="white" /> Verifying…</> : 'Verify Answer →'}
                </button>
                <button onClick={() => { setResetStep('email'); setResetError(''); }} style={{ width:'100%', marginTop:10, padding:'10px', background:'none', border:'none', cursor:'pointer', color:'#6B7280', fontSize:13, fontFamily:"Inter,sans-serif" }}>← Back</button>
              </>
            )}

            {/* ── STEP 3: New Password ── */}
            {resetStep === 'newpw' && (
              <>
                <h3 style={{ fontFamily:"Inter,sans-serif", fontSize:20, fontWeight:700, color:'#1F2937', marginBottom:6 }}>Set New Password</h3>
                <p style={{ fontSize:13.5, color:'#6B7280', fontFamily:"Inter,sans-serif", marginBottom:24, lineHeight:1.6 }}>Identity confirmed! Choose a strong new password.</p>
                {resetError && <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', fontFamily:"Inter,sans-serif" }}>{resetError}</div>}
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position:'relative' }}>
                    <input type={resetShowPw?'text':'password'} value={resetNewPw} onChange={e => setResetNewPw(e.target.value)} onKeyDown={e => e.key==='Enter' && handleResetSetPw()} placeholder="••••••••" autoFocus style={{ fontSize:15, paddingRight:60 }} />
                    <button onClick={() => setResetShowPw(p => !p)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--ink-3)', cursor:'pointer', fontSize:13, fontFamily:"Inter,sans-serif", fontWeight:500 }}>
                      {resetShowPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <PasswordStrength password={resetNewPw} />
                </div>
                <button onClick={handleResetSetPw} disabled={resetLoading}
                  style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:'#3B82F6', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:"Inter,sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:resetLoading?0.7:1, marginTop:8 }}>
                  {resetLoading ? <><Spinner size={15} color="white" /> Saving…</> : '🔒 Reset & Sign In'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}