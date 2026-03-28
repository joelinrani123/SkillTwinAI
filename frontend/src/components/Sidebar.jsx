import { useState } from 'react';
import { Avatar } from './UI';

const LogoMark = () => (
  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
    <rect x="2" y="2" width="8" height="8" rx="2" fill="#3B82F6" opacity="0.9"/>
    <rect x="12" y="2" width="8" height="8" rx="2" fill="#93c5fd" opacity="0.8"/>
    <rect x="2" y="12" width="8" height="8" rx="2" fill="#93c5fd" opacity="0.8"/>
    <rect x="12" y="12" width="8" height="8" rx="2" fill="#3B82F6" opacity="0.5"/>
  </svg>
);

const ICONS = {
  dashboard:              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  skills:                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  tests:                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  certs:                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  jobs:                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  inbox:                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  analysis:               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  learning:               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  profile:                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  projects:               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  'career-goals':         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  'interviews':           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
  recruiter:              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  'recruiter-jobs':       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  'recruiter-saved':      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  'recruiter-analytics':  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  'recruiter-inbox':      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  'recruiter-interviews': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  admin:                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  'admin-users':          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'admin-jobs':           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  'admin-analytics':      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  'admin-broadcast':      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.32 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 6 6l.76-.76a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.28 16z"/></svg>,
};

const candidateNav = [
  { id: 'dashboard',      label: 'Overview'    },
  { id: 'skills',         label: 'Skills'      },
  { id: 'tests',          label: 'Tests'       },
  { id: 'certs',          label: 'Certs'       },
  { id: 'jobs',           label: 'Jobs'        },
  { id: 'inbox',          label: 'Inbox', badge: true },
  { id: 'analysis',       label: 'Analysis'    },
  { id: 'learning',       label: 'Learning'    },
  { id: 'career-goals',   label: 'Goals'       },
  { id: 'projects',       label: 'Projects'    },
  { id: 'interviews',    label: 'Interviews'  },
];
const recruiterNav = [
  { id: 'recruiter',            label: 'Candidates'  },
  { id: 'recruiter-jobs',       label: 'Jobs'        },
  { id: 'recruiter-saved',      label: 'Saved'       },
  { id: 'recruiter-analytics',  label: 'Analytics'   },
  { id: 'recruiter-inbox',      label: 'Inbox', badge: true },
  { id: 'recruiter-interviews', label: 'Interviews'  },
];
const adminNav = [
  { id: 'admin',           label: 'Overview'  },
  { id: 'admin-users',     label: 'Users'     },
  { id: 'admin-jobs',      label: 'Jobs'      },
  { id: 'admin-analytics', label: 'Analytics' },
  { id: 'admin-broadcast', label: 'Broadcast' },
  { id: 'admin-settings',  label: 'Settings'  },
  { id: 'profile',         label: 'Profile'   },
];

export default function Sidebar({ page, setPage, userRole, onLogout, user, unread = 0 }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const nav = userRole === 'admin' ? adminNav : userRole === 'recruiter' ? recruiterNav : candidateNav;
  const roleLabel = userRole === 'admin' ? 'Admin' : userRole === 'recruiter' ? 'Recruiter' : 'Candidate';
  const roleColor = userRole === 'admin' ? '#f59e0b' : userRole === 'recruiter' ? '#22c55e' : '#3B82F6';

  return (
    <aside className="sidebar">
      {/* ── Brand + user row ── */}
      <div className="sidebar-logo" style={{ justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogoMark />
          </div>
          <div>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>
              SkillTwin<span style={{ color: 'rgba(255,255,255,0.30)' }}>AI</span>
            </span>
            <div style={{ marginTop: 0 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: roleColor, fontFamily: "Inter, sans-serif" }}>{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* User pill + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <button onClick={() => setUserMenuOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 12px 5px 6px', cursor: 'pointer', transition: 'all 0.14s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
            <Avatar name={user?.name || 'U'} size={26} style={{ background: 'rgba(59,130,246,0.35)', color: '#fff', border: '1px solid rgba(59,130,246,0.5)', fontSize: 11 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: "Inter, sans-serif", maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name?.split(' ')[0] || 'User'}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {userMenuOpen && (
            <>
              <div onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
              <div style={{ position: 'absolute', top: 42, right: 0, background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', zIndex: 201, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>{user?.email || ''}</div>
                </div>
                <button onClick={() => { setPage('profile'); setUserMenuOpen(false); }}
                  style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.70)', fontSize: 13, cursor: 'pointer', textAlign: 'left', fontFamily: "Inter, sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  {ICONS.profile} Profile Settings
                </button>
                <button onClick={() => { onLogout(); setUserMenuOpen(false); }}
                  style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#f87171', fontSize: 13, cursor: 'pointer', textAlign: 'left', fontFamily: "Inter, sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.10)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Nav tabs row ── */}
      <nav className="sidebar-nav">
        {nav.map(item => {
          const isActive  = page === item.id;
          const showBadge = item.badge && unread > 0;
          return (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`nav-item${isActive ? ' active' : ''}`}>
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {ICONS[item.id] || ICONS.profile}
              </span>
              <span>{item.label}</span>
              {showBadge && (
                <span style={{ marginLeft: 2, background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', lineHeight: 1.5 }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
