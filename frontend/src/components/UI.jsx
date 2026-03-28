import { useState, useEffect } from 'react';

/* ── Spinner ─── */
export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(0,0,0,0.10)`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

/* ── PageLoader ─ */
export function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 4 }}>
        SkillTwin<span style={{ color: 'var(--ink-4)' }}>AI</span>
      </div>
      <Spinner size={22} />
      <p className="label">Loading your profile…</p>
    </div>
  );
}

/* Avatar */
export function Avatar({ name = '', size = 34, style: s, src }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const palettes = [
    ['rgba(37,99,235,0.14)',  '#1d4ed8'],
    ['rgba(8,145,178,0.14)',  '#0e7490'],
    ['rgba(217,119,6,0.14)', '#b45309'],
    ['rgba(124,58,237,0.14)','#6d28d9'],
    ['rgba(22,163,74,0.14)', '#15803d'],
    ['rgba(220,38,38,0.14)', '#b91c1c'],
  ];
  const [bg, fg] = palettes[(name.charCodeAt(0) || 0) % palettes.length];

  if (src) return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: size > 40 ? '50%' : 9,
        objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)', ...s }} />
  );

  return (
    <div style={{
      width: size, height: size, borderRadius: size > 40 ? '50%' : 9,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(10, size * 0.34), fontWeight: 700, color: fg,
      flexShrink: 0, fontFamily: "Inter, sans-serif", border: `1.5px solid ${bg}`, ...s,
    }}>
      {initials}
    </div>
  );
}

/* ── Stat card ── */
export function StatCard({ title, value, sub, color = 'var(--accent)', delay = 0, onClick, borderColor }) {
  const bc = borderColor || color;
  return (
    <div className="stat-card fade-up" onClick={onClick}
      style={{ animationDelay: `${delay * 0.08}s`, opacity: 0, cursor: onClick ? 'pointer' : 'default', borderTop: `3px solid ${bc}` }}>
      <span className="label" style={{ display: 'block', marginBottom: 12 }}>{title}</span>
      <div className="stat-number" style={{ color: 'var(--ink)', marginBottom: sub ? 7 : 0 }}>{value}</div>
      {sub && <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, fontFamily: "Inter, sans-serif" }}>{sub}</p>}
    </div>
  );
}

/* ── Skill bar ──*/
export function SkillBar({ name, level, category, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(level), 80 + delay * 70);
    return () => clearTimeout(t);
  }, [level, delay]);
  const color = level >= 60 ? 'var(--green)' : 'var(--red)';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 500, fontFamily: "Inter, sans-serif" }}>{name}</span>
          {category && <span className="tag" style={{ fontSize: 10.5, padding: '2px 7px' }}>{category}</span>}
        </div>
        <span style={{ fontSize: 13.5, color, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>{level}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── Score ring ─ */
export function ScoreRing({ score = 0, size = 80, label }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 60 ? 'var(--green)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "Inter, sans-serif", fontSize: size > 60 ? 14 : 11, fontWeight: 700, color }}>
          {score}%
        </div>
      </div>
      {label && <span className="label">{label}</span>}
    </div>
  );
}

/* ── Sparkline ── */
export function SparkLine({ data = [], color = 'var(--accent)', width = 90, height = 32 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Empty state ─── */
export function EmptyState({ icon = '◎', title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 38, marginBottom: 14, color: 'var(--ink-4)', opacity: 0.6 }}>{icon}</div>
      <h3 style={{ marginBottom: 8, color: 'var(--ink-2)', fontFamily: "Inter, sans-serif" }}>{title}</h3>
      {description && <p style={{ fontSize: 14.5, color: 'var(--ink-3)', maxWidth: 340, margin: '0 auto', lineHeight: 1.65 }}>{description}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

/* ── Alert ───*/
export function Alert({ type = 'error', children, style: s }) {
  const cls = { error: 'alert-error', success: 'alert-success', info: 'alert-info', warning: 'alert-warning', amber: 'alert-amber' };
  return <div className={`alert ${cls[type] || 'alert-info'}`} style={s}>{children}</div>;
}

/* ── Modal ─── */
export function Modal({ open, onClose, title, children, width = 500 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: width }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontFamily: "Inter, sans-serif" }}>{title}</h3>
          <button className="btn btn-ghost btn-xs" onClick={onClose}
            style={{ fontSize: 18, color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── Page header ─── */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ marginBottom: 26, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ margin: '5px 0 0', fontSize: 14.5, color: 'var(--ink-3)', fontFamily: "Inter, sans-serif" }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
