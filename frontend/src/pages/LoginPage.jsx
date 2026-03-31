import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { useState, useEffect, useRef } from 'react';

const TESTIMONIALS = [
  { quote: "SkillTwinAI helped me land my dream role in 3 weeks. The verified skill scores made all the difference.", name: "Priya S.", role: "Frontend Engineer" },
  { quote: "Best platform for finding talent with proven, measurable skills. Our hiring quality improved dramatically.", name: "Rahul M.", role: "Hiring Manager, TechCorp" },
  { quote: "The AI coaching feature is like having a career advisor 24/7. I doubled my assessment scores in a month.", name: "Arjun K.", role: "Full Stack Developer" },
];

export default function LoginPage({ onLogin, onBack }) {
  const [mode,         setMode]         = useState('login');
  // Initialize from localStorage — so returning users already have their role pre-selected
  const [selectedRole, setSelectedRole] = useState(
    () => localStorage.getItem('st_pending_role') || 'candidate'
  );
  const [tIdx,         setTIdx]         = useState(0);
  const { isSignedIn, user: clerkUser } = useUser();
  const firedRef = useRef(false);
  const t = TESTIMONIALS[tIdx];

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    localStorage.setItem('st_pending_role', role);
  };

  useEffect(() => {
    if (isSignedIn && clerkUser && !firedRef.current) {
      firedRef.current = true;
      // Re-read localStorage at fire time — guarantees the latest selection is used
      const role = localStorage.getItem('st_pending_role') || selectedRole;
      localStorage.setItem('st_pending_role', role);
      onLogin(null, {
        name:  clerkUser.fullName || clerkUser.firstName || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        role,
      });
    }
  }, [isSignedIn, clerkUser]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f0f2f5' }}>

      {/* Left dark panel */}
      <div style={{ width: 460, background: '#1F2937', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', padding: '56px 48px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 64, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: '#93c5fd' }}>S</span>
            </div>
            SkillTwin<span style={{ color: 'rgba(255,255,255,0.28)' }}>AI</span>
          </div>

          <h1 style={{ fontFamily: "Inter,sans-serif", fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 18 }}>
            {mode === 'login' ? 'Welcome back.' : 'Start your journey.'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 15.5, lineHeight: 1.75, maxWidth: 300, fontFamily: "Inter,sans-serif", marginBottom: 40 }}>
            {mode === 'login'
              ? 'Sign in to continue tracking your skills and career progress.'
              : 'Build your verified skill profile and connect with top recruiters.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
            {[
              ['◈', 'Track skills & proficiency'],
              ['◉', 'Adaptive assessments'],
              ['✦', 'Verified certifications'],
              ['◫', 'Smart job matching'],
              ['⬡', 'AI career coaching 24/7'],
              ['◎', 'Recruiter discovery'],
            ].map(([ic, tx]) => (
              <div key={tx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.50)', fontFamily: "Inter,sans-serif" }}>
                <span style={{ color: '#93b4fd', fontSize: 16 }}>{ic}</span>{tx}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontSize: 28, color: 'rgba(147,180,253,0.5)', lineHeight: 1, marginBottom: 8 }}>"</div>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, fontFamily: "Inter,sans-serif", marginBottom: 14 }}>{t.quote}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: "Inter,sans-serif" }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.40)', fontFamily: "Inter,sans-serif" }}>{t.role}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setTIdx(i)}
                    style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === tIdx ? '#93c5fd' : 'rgba(255,255,255,0.20)', transition: 'all 0.2s', padding: 0 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>

        <div style={{ width: '100%', maxWidth: 440, marginBottom: 20 }}>
          <div style={{ display: 'flex', background: '#e8ebf0', borderRadius: 10, padding: 4, border: '1px solid #dde1e8' }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: mode === m ? 600 : 400, background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#1F2937' : '#6B7280', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        </div>

        {/* Role selector — shown on BOTH login and signup */}
        <div style={{ width: '100%', maxWidth: 440, marginBottom: 16 }}>
          <p style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {mode === 'login' ? 'Signing in as a…' : 'I am registering as a…'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { value: 'candidate', label: '🎓 Candidate', desc: 'Find jobs & grow skills' },
              { value: 'recruiter', label: '🏢 Recruiter', desc: 'Hire top talent' },
            ].map(opt => {
              const active = selectedRole === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleRoleSelect(opt.value)}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    fontFamily: 'Inter,sans-serif', textAlign: 'left', transition: 'all 0.15s',
                    border: active ? '2px solid #3B82F6' : '2px solid #E5E7EB',
                    background: active ? '#EFF6FF' : '#fff',
                    boxShadow: active ? '0 0 0 3px rgba(59,130,246,0.10)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? '#1d4ed8' : '#1F2937', marginBottom: 2 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: active ? '#3B82F6' : '#6B7280' }}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 440 }}>
          {mode === 'login' ? (
            <SignIn
              appearance={{
                elements: {
                  rootBox: { width: '100%' },
                  card: { boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderRadius: 14, border: '1px solid #e5e7eb' },
                  formButtonPrimary: { backgroundColor: '#3B82F6', borderRadius: 9 },
                  footerActionLink: { color: '#3B82F6' },
                },
              }}
              routing="hash"
              redirectUrl={window.location.href}
              afterSignInUrl={window.location.href}
            />
          ) : (
            <SignUp
              appearance={{
                elements: {
                  rootBox: { width: '100%' },
                  card: { boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderRadius: 14, border: '1px solid #e5e7eb' },
                  formButtonPrimary: { backgroundColor: selectedRole === 'recruiter' ? '#7C3AED' : '#3B82F6', borderRadius: 9 },
                  footerActionLink: { color: '#3B82F6' },
                },
              }}
              routing="hash"
              redirectUrl={window.location.href}
              afterSignUpUrl={window.location.href}
            />
          )}
        </div>

        <button
          onClick={onBack}
          style={{ marginTop: 20, padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 14, fontFamily: "Inter,sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.color = '#1F2937'}
          onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
          ← Back to home
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
          {[['🔒', 'Secure & Encrypted'], ['✅', 'No spam, ever'], ['🚀', 'Free to start']].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#9CA3AF', fontFamily: "Inter,sans-serif" }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}