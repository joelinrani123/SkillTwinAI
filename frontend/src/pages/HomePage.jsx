const features = [
  { icon: '◈', title: 'Skill Tracking', desc: 'Map your complete skill set with real-time proficiency scoring across all categories.' },
  { icon: '◉', title: 'Smart Assessments', desc: 'Take adaptive tests to benchmark your knowledge and discover areas to grow.' },
  { icon: '✦', title: 'Certifications', desc: 'Complete learning paths and earn verified certificates that showcase your expertise.' },
  { icon: '◎', title: 'Profile Insights', desc: 'A clear, comprehensive view of your career readiness and proficiency.' },
  { icon: '◐', title: 'AI Recommendations', desc: 'Personalised learning paths generated from your actual skill data.' },
  { icon: '◫', title: 'Recruiter Portal', desc: 'Employers discover and evaluate candidates through verified skill scores.' },
];

const stats = [
  { value: '10k+', label: 'Active Learners' },
  { value: '500+', label: 'Skills Tracked' },
  { value: '98%',  label: 'Placement Rate' },
  { value: '200+', label: 'Certifications' },
];

const steps = [
  { n: '01', title: 'Create your profile', body: 'Sign up and add your skills, experience, and career goals. Your profile becomes your professional identity.' },
  { n: '02', title: 'Take assessments', body: 'Benchmark your knowledge across any skill. Your proficiency scores update automatically after each attempt.' },
  { n: '03', title: 'Earn certifications', body: 'Complete structured learning paths and earn verified certificates that prove your expertise.' },
  { n: '04', title: 'Get discovered', body: 'Recruiters find you through your verified skill scores. Apply to jobs that match your profile perfectly.' },
];

export default function HomePage({ onGetStarted }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f7', fontFamily: "Inter, sans-serif" }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 72px', borderBottom: '1px solid #e3e6ea',
        background: '#f5f6f7', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 700, color: '#111318', letterSpacing: '-0.01em' }}>
          SkillTwin<span style={{ color: '#9da5b0' }}>AI</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onGetStarted} style={{ padding: '9px 20px', borderRadius: 7, border: '1px solid #e3e6ea', background: 'transparent', color: '#2e3440', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "Inter, sans-serif", transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f1f3'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Sign in
          </button>
          <button onClick={onGetStarted} style={{ padding: '9px 20px', borderRadius: 7, border: 'none', background: '#4a6cf7', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "Inter, sans-serif", transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#3a5ce8'}
            onMouseLeave={e => e.currentTarget.style.background = '#4a6cf7'}>
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: '#f5f6f7', padding: '96px 72px 80px', borderBottom: '1px solid #e3e6ea' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 20, border: '1px solid #e3e6ea', background: 'rgba(224,92,138,0.08)', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4a6cf7', display: 'inline-block' }} />
            <span style={{ fontSize: 12.5, color: '#4a6cf7', fontWeight: 600, letterSpacing: '0.04em' }}>Intelligent skill platform</span>
          </div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 52, fontWeight: 700, color: '#111318', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 22 }}>
            Your intelligent<br />skill twin
          </h1>
          <p style={{ color: '#6b7280', fontSize: 17, lineHeight: 1.78, maxWidth: 500, margin: '0 auto 40px' }}>
            Track skills, take assessments, earn certifications, get AI coaching, and connect with top recruiters — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={onGetStarted} style={{ padding: '13px 32px', borderRadius: 8, border: 'none', background: '#4a6cf7', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "Inter, sans-serif", boxShadow: '0 4px 16px rgba(224,92,138,0.28)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3a5ce8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4a6cf7'; e.currentTarget.style.transform = 'none'; }}>
              Get started — it's free
            </button>
            <button onClick={onGetStarted} style={{ padding: '13px 28px', borderRadius: 8, border: '1.5px solid #e3e6ea', background: 'transparent', color: '#2e3440', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: "Inter, sans-serif", transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f1f3'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ borderBottom: '1px solid #e3e6ea', background: '#f7f8f9' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding: '32px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid #e3e6ea' : 'none' }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 32, fontWeight: 700, color: '#4a6cf7', letterSpacing: '-0.02em', marginBottom: 5 }}>{s.value}</div>
              <div style={{ fontSize: 12.5, color: '#6b7280', fontWeight: 500, letterSpacing: '0.03em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '80px 72px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#9da5b0', marginBottom: 12 }}>What you get</div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 34, fontWeight: 700, color: '#111318', letterSpacing: '-0.01em' }}>Everything you need to grow</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#e3e6ea', border: '1px solid #e3e6ea', borderRadius: 14, overflow: 'hidden' }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: '#f5f6f7', padding: '34px 30px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f1f3'}
              onMouseLeave={e => e.currentTarget.style.background = '#f5f6f7'}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(74,108,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 18, color: '#4a6cf7' }}>{f.icon}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: '#111318', marginBottom: 9 }}>{f.title}</div>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.72, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#f7f8f9', borderTop: '1px solid #e3e6ea', borderBottom: '1px solid #e3e6ea', padding: '80px 72px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#9da5b0', marginBottom: 12 }}>Simple process</div>
            <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 34, fontWeight: 700, color: '#111318', letterSpacing: '-0.01em' }}>How SkillTwin AI works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {steps.map(({ n, title, body }) => (
              <div key={n} style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(74,108,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#4a6cf7', flexShrink: 0, fontFamily: '"Courier New", monospace' }}>{n}</div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: '#111318', marginBottom: 7 }}>{title}</div>
                  <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.72 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '96px 72px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 700, color: '#111318', letterSpacing: '-0.01em', marginBottom: 16 }}>Ready to grow your career?</h2>
          <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.72, marginBottom: 36 }}>Join thousands of professionals tracking their skills and landing better roles.</p>
          <button onClick={onGetStarted} style={{ padding: '14px 40px', borderRadius: 9, border: 'none', background: '#111318', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "Inter, sans-serif", transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Create your free account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e3e6ea', padding: '24px 72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f7f8f9' }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: '#111318' }}>
          SkillTwin<span style={{ color: '#9da5b0' }}>AI</span>
        </div>
        <span style={{ fontSize: 12, color: '#9da5b0' }}>© 2026 SkillTwinAI · All rights reserved</span>
      </footer>
    </div>
  );
}
