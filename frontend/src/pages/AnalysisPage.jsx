import { useState, useEffect } from 'react';
import { Spinner, EmptyState, ScoreRing, SkillBar } from '../components/UI';
import { api } from '../services/api';

const scoreColor = s => s >= 60 ? '#16a34a' : s >= 40 ? '#6B7280' : '#dc2626';

function ScoreBar({ label, value, max = 100, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif', color }}>{value}</span>
      </div>
      <div className="progress-bar" style={{ height: 8 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function AnalysisPage({ user }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analysis.predict()
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const skills    = user?.skills || [];
  const score     = user?.overallScore || 0;
  const topSkills = [...skills].sort((a, b) => b.level - a.level).slice(0, 6);
  const lowSkills = [...skills].sort((a, b) => a.level - b.level).filter(s => s.level < 60).slice(0, 4);

  const breakdown = data?.scoreBreakdown;
  const confidence = data?.confidence;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2>Profile Analysis</h2>
        <p style={{ color: 'var(--ink-3)', marginTop: 6 }}>Smart insights about your skill profile and career readiness.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Hero row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18 }}>
            {/* Score ring card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 36px', gap: 14, minWidth: 200 }}>
              <ScoreRing score={data?.readinessScore || score} size={110} label="readiness score" />
              {data?.careerLevel && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>CAREER LEVEL</div>
                  <span className="badge badge-accent" style={{ fontSize: 13, padding: '6px 16px' }}>{data.careerLevel}</span>
                </div>
              )}
              {confidence && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
                  {confidence}% confidence
                </div>
              )}
            </div>

            {/* Profile summary */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Profile Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                {[
                  { label: 'Skills Tracked',    value: skills.length },
                  { label: 'Proficient (70%+)',  value: skills.filter(s => s.level >= 70).length },
                  { label: 'Readiness Score',    value: data?.readinessScore ? `${data.readinessScore}%` : '—' },
                  { label: 'Skill Gaps',         value: (user?.gaps || []).length },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Inter, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontFamily: 'Courier New, monospace', fontSize: 24, color: 'var(--accent)' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
              {data?.topSkills?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Top Skills Identified</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {data.topSkills.map(s => <span key={s} className="badge badge-green">{s}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Score breakdown */}
          {breakdown && (
            <div className="card">
              <h3 style={{ marginBottom: 18 }}>Score Breakdown</h3>
              <ScoreBar label="Skill Proficiency"    value={breakdown.skillProficiency}    color="var(--blue)" />
              <ScoreBar label="Assessment Performance" value={breakdown.assessmentScore}   color="var(--green)" />
              <ScoreBar label="Expertise Bonus"       value={breakdown.expertiseBonus}     max={20} color="var(--blue)" />
              <ScoreBar label="Certification Bonus"   value={breakdown.certificationBonus} max={20} color="#3B82F6" />
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--accent-dim)', borderRadius: 'var(--r)', border: '1px solid rgba(224,92,58,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Overall Readiness</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: scoreColor(data?.readinessScore || score) }}>
                  {data?.readinessScore || score}%
                </span>
              </div>
            </div>
          )}

          {/* Skill distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Strongest Skills</h3>
              {topSkills.length
                ? topSkills.map((s, i) => <SkillBar key={s.name} name={s.name} level={s.level} category={s.category} delay={i} />)
                : <EmptyState icon="" title="No skills yet" description="Add your skills to see this analysis." />
              }
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Skills to Improve</h3>
              {lowSkills.length ? (
                lowSkills.map((s, i) => <SkillBar key={s.name} name={s.name} level={s.level} category={s.category} delay={i} />)
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}></div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>All your skills are above 60%!</div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {data?.recommendations?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Personalised Recommendations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.recommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, padding: '13px 16px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0, marginTop: 1 }}></span>
                    <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!skills.length && (
            <EmptyState icon="" title="Add skills to unlock analysis" description="Start by adding your skills and taking assessments to see full AI analysis." />
          )}
        </div>
      )}
    </div>
  );
}
