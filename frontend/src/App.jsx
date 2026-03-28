import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PageLoader }            from './components/UI';
import Sidebar   from './components/Sidebar';
import Topbar    from './components/Topbar';

import HomePage          from './pages/HomePage';
import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import SkillsPage        from './pages/SkillsPage';
import TestsPage         from './pages/TestsPage';
import CertsPage         from './pages/CertsPage';
import JobBoardPage      from './pages/JobBoardPage';
import AnalysisPage      from './pages/AnalysisPage';
import LearningPage      from './pages/LearningPage';
import ProfilePage       from './pages/ProfilePage';
import ProjectsPage      from './pages/ProjectsPage';
import RecruiterPage     from './pages/RecruiterPage';
import AdminPage         from './pages/AdminPage';
import InboxPage         from './pages/InboxPage';
import CareerGoalsPage   from './pages/CareerGoalsPage';
import InterviewsPage    from './pages/InterviewsPage';
import { api }           from './services/api';

const PAGE_META = {
  dashboard:               ['Dashboard',           'Real-time skill profile overview'],
  skills:                  ['My Skills',           'Track and manage your skills'],
  tests:                   ['Assessments',         'Test your knowledge and track progress'],
  certs:                   ['Certifications',      'Earn certificates based on your assessment results'],
  jobs:                    ['Job Board',           'Browse and apply to open positions'],
  analysis:                ['Profile Analysis',    'Your proficiency breakdown and readiness'],
  learning:                ['Recommendations',     'AI-generated personalised learning roadmap'],
  profile:                 ['Profile',             'Your professional profile'],
  projects:                ['My Projects',         'Showcase your work to recruiters'],
  inbox:                   ['Messages',            'Inbox and replies'],
  'career-goals':          ['Career Goals',        'Set goals and track your professional milestones'],
  'interviews':            ['My Interviews',        'View interview invitations from recruiters'],
  admin:                   ['Admin Overview',      'Platform-wide statistics and health metrics'],
  'admin-users':           ['User Management',     'Manage all registered users, roles, and accounts'],
  'admin-settings':        ['System Settings',     'Configure platform-wide settings and parameters'],
  'admin-jobs':            ['Job Management',      'View and manage all job postings platform-wide'],
  'admin-analytics':       ['Platform Analytics',  'Skill and score distribution across all users'],
  'admin-broadcast':       ['Broadcast',           'Send messages to all users or a role group'],
  'recruiter-jobs':        ['Job Postings',        'Manage your open roles'],
  'recruiter-inbox':       ['Recruiter Inbox',     'Messages and replies from candidates'],
  'recruiter-saved':       ['Saved Candidates',    'Your shortlisted candidates'],
  'recruiter-analytics':   ['Recruiter Analytics', 'Job performance metrics and applicant insights'],
  'recruiter-interviews':  ['Interview Scheduler', 'Schedule and manage candidate interviews'],
};

function AppShell() {
  const { user, auth, booting, login, logout, refreshUser } = useAuth();
  const [page, setPage]               = useState(null);
  const [unread, setUnread]           = useState(0);
  const [statusAlert, setStatusAlert] = useState(null);
  const prevStatusesRef               = React.useRef({});
  const alertTimerRef                 = React.useRef(null);

  // Auto-dismiss status alert after 5 seconds
  useEffect(() => {
    if (statusAlert) {
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setStatusAlert(null), 5000);
    }
    return () => clearTimeout(alertTimerRef.current);
  }, [statusAlert]);

  const STATUS_META = {
    selected:    { color: 'rgba(22,163,74,0.12)',  border: 'rgba(22,163,74,0.3)',  text: '#15803d', label: '🎉 You have been selected' },
    rejected:    { color: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.25)', text: '#dc2626', label: '❌ Application not selected' },
    shortlisted: { color: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.25)', text: '#b45309', label: '⭐ You have been shortlisted' },
    reviewed:    { color: 'rgba(45,122,110,0.07)',  border: 'rgba(45,122,110,0.2)',  text: 'var(--teal)', label: '👀 Application under review' },
  };

  const getDefaultPage = role =>
    role === 'recruiter' ? 'recruiter' : role === 'admin' ? 'admin' : 'dashboard';

  const activePage = page || (auth ? getDefaultPage(auth.role) : 'home');

  /* Poll unread message count every 30s */
  useEffect(() => {
    if (!auth) return;
    const check = () => api.messages.getUnreadCount().then(d => setUnread(d.count || 0)).catch(() => {});
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [auth]);

  /* Poll application status changes every 20s (candidate only) */
  useEffect(() => {
    if (!auth || auth.role !== 'candidate') return;
    const pollStatuses = async () => {
      try {
        const d = await api.jobs.getApplied().catch(() => ({ applications: [] }));
        const apps = d.applications || [];
        const prev = prevStatusesRef.current;
        for (const app of apps) {
          const key = app.applicationId || app._id;
          const curr = app.status;
          if (prev[key] && prev[key] !== curr && STATUS_META[curr]) {
            setStatusAlert({ job: app.jobTitle || 'a position', status: curr, ...STATUS_META[curr] });
            break;
          }
        }
        const newMap = {};
        for (const app of apps) newMap[app.applicationId || app._id] = app.status;
        prevStatusesRef.current = newMap;
      } catch {}
    };
    // Init statuses silently first
    api.jobs.getApplied().then(d => {
      const map = {};
      for (const a of (d.applications || [])) map[a.applicationId || a._id] = a.status;
      prevStatusesRef.current = map;
    }).catch(() => {});
    const id = setInterval(pollStatuses, 20000);
    return () => clearInterval(id);
  }, [auth]);

  // ── Handle Google OAuth redirect (token comes back in URL) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gToken = params.get('googleToken');
    const gUser  = params.get('googleUser');
    if (gToken && gUser) {
      try {
        const userData = JSON.parse(decodeURIComponent(gUser));
        login(gToken, userData);
        setPage(getDefaultPage(userData.role));
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error('Google login parse error', e);
      }
    }
  }, []);

  const handleLogin  = (token, u) => { login(token, u); setPage(getDefaultPage(u.role)); };
  const handleLogout = ()         => { logout(); setPage('home'); };
  const navigate     = p          => setPage(p);

  if (booting) return <PageLoader />;

  if (!auth) {
    if (activePage === 'login') return <LoginPage onLogin={handleLogin} onBack={() => setPage('home')} />;
    return <HomePage onGetStarted={() => setPage('login')} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'home':
      case 'dashboard':       return <DashboardPage user={user} setPage={navigate} />;
      case 'skills':          return <SkillsPage    user={user} onRefresh={refreshUser} />;
      case 'tests':           return <TestsPage     user={user} onRefresh={refreshUser} />;
      case 'certs':           return <CertsPage     user={user} onRefresh={refreshUser} />;
      case 'jobs':            return <JobBoardPage  user={user} />;
      case 'analysis':        return <AnalysisPage  user={user} />;
      case 'learning':        return <LearningPage  user={user} setPage={navigate} />;
      case 'profile':         return <ProfilePage   user={user} onRefresh={refreshUser} />;
      case 'projects':        return <ProjectsPage  user={user} onRefresh={refreshUser} />;
      case 'inbox':           return <InboxPage     user={user} />;
      case 'career-goals':    return <CareerGoalsPage user={user} />;
      case 'interviews':      return <InterviewsPage  user={user} />;
      case 'admin':
      case 'admin-users':
      case 'admin-settings':
      case 'admin-jobs':
      case 'admin-analytics':
      case 'admin-broadcast':
        return auth.role === 'admin'
          ? <AdminPage user={user} page={activePage} setPage={navigate} />
          : <DashboardPage user={user} setPage={navigate} />;
      case 'recruiter':
      case 'recruiter-jobs':
      case 'recruiter-inbox':
      case 'recruiter-saved':
      case 'recruiter-analytics':
      case 'recruiter-interviews':
        return (auth.role === 'recruiter' || auth.role === 'admin')
          ? <RecruiterPage page={activePage} setPage={navigate} user={user} />
          : <DashboardPage user={user} setPage={navigate} />;
      default:
        return <DashboardPage user={user} setPage={navigate} />;
    }
  };

  const [title, subtitle] = PAGE_META[activePage] || ['SkillTwinAI', ''];

  return (
    <div className="app-shell">
      <Sidebar page={activePage} setPage={navigate} userRole={auth.role} onLogout={handleLogout} user={user} unread={unread} />
      <div className="app-main">
        <Topbar title={title} subtitle={subtitle} />
        {statusAlert && (
          <div style={{ background: statusAlert.color, borderBottom: `1px solid ${statusAlert.border}`, padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ fontSize: 13, color: statusAlert.text, lineHeight: 1.5, fontWeight: 600 }}>
              {statusAlert.label} — <span style={{ fontWeight: 400 }}>Your application for <strong>{statusAlert.job}</strong> has been updated by the recruiter.</span>
            </div>
            <button onClick={() => setStatusAlert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: statusAlert.text, fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
          </div>
        )}
        <main>
          <div className="app-content">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}