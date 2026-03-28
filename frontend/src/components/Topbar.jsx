export default function Topbar({ title, subtitle }) {
  return (
    <div className="topbar">
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: "Inter, sans-serif" }}>— {subtitle}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px rgba(58,158,110,0.5)' }} />
        <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: "Inter, sans-serif", letterSpacing: '0.02em' }}>SkillTwin AI</span>
      </div>
    </div>
  );
}
