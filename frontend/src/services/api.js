const BASE = import.meta.env.VITE_API_URL || '/api';
function getToken() { return localStorage.getItem('st_token'); }
export const saveToken  = t => localStorage.setItem('st_token', t);
export const clearToken = () => localStorage.removeItem('st_token');
export const hasToken   = () => !!localStorage.getItem('st_token');

async function req(path, opts = {}) {
  const t = getToken();
  const headers = { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...opts.headers };
  const res  = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  auth: {
    /**
     * Call once after Clerk sign-up to register the user in your MongoDB.
     * Pass the Clerk session token as the Authorization header via saveToken() first.
     */
    signup: (name, email, role) =>
      req('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, role }) }),

    /**
     * Call after every Clerk sign-in to exchange the Clerk JWT for a backend JWT.
     * Pass the Clerk session token via saveToken() first.
     */
    login: (email) =>
      req('/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),

    me: () => req('/auth/me'),
  },
  users: {
    getProfile:      ()     => req('/users/profile'),
    updateProfile:   data   => req('/users/profile',      { method: 'PUT',  body: JSON.stringify(data) }),
    saveTest:        data   => req('/users/test-results', { method: 'POST', body: JSON.stringify(data) }),
    getTests:        ()     => req('/users/tests'),
    getSkillHistory: ()     => req('/users/skill-history'),
  },
  skills: {
    getAll:    ()         => req('/skills'),
    add:       skill      => req('/skills',      { method: 'POST',   body: JSON.stringify(skill) }),
    update:    (id, data) => req(`/skills/${id}`, { method: 'PUT',   body: JSON.stringify(data) }),
    remove:    id         => req(`/skills/${id}`, { method: 'DELETE' }),
    addGap:    name       => req('/skills/gaps',  { method: 'POST',  body: JSON.stringify({ skillName: name }) }),
    removeGap: name       => req(`/skills/gaps/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },
  tests: {
    getQuestions: skill => req(`/tests/questions/${encodeURIComponent(skill)}`),
    getSkills:    ()    => req('/tests/skills'),
    getHistory:   ()    => req('/tests/history'),
    submit:       data  => req('/tests/submit', { method: 'POST', body: JSON.stringify(data) }),
  },
  certs: {
    getAll:       ()              => req('/certifications'),
    getEligible:  ()              => req('/certifications/eligible'),
    claim:        skillName       => req('/certifications/claim', { method: 'POST', body: JSON.stringify({ skillName }) }),
    getPaths:     ()              => req('/certifications/paths'),
    getPath:      skillName       => req(`/certifications/path/${encodeURIComponent(skillName)}`),
    startPath:    (skillName, cat)=> req('/certifications/start-path', { method: 'POST', body: JSON.stringify({ skillName, category: cat }) }),
    completeTask: (skillName, moduleId, taskId) => req(`/certifications/path/${encodeURIComponent(skillName)}/task`, { method: 'POST', body: JSON.stringify({ moduleId, taskId }) }),
    search:       q               => req(`/certifications/search?q=${encodeURIComponent(q)}`),
  },
  jobs: {
    getAll:           (params = {}) => { const qs = new URLSearchParams(params).toString(); return req(`/jobs${qs ? `?${qs}` : ''}`); },
    getOne:           id            => req(`/jobs/${id}`),
    post:             data          => req('/jobs',             { method: 'POST',   body: JSON.stringify(data) }),
    update:           (id, data)    => req(`/jobs/${id}`,       { method: 'PUT',    body: JSON.stringify(data) }),
    delete:           id            => req(`/jobs/${id}`,       { method: 'DELETE' }),
    apply:            (id, data)    => req(`/jobs/${id}/apply`, { method: 'POST',   body: JSON.stringify(data) }),
    getApplied:       ()            => req('/jobs/applied'),
    getRecruiterJobs: ()            => req('/jobs/recruiter'),
    getApplicants:    id            => req(`/jobs/${id}/applicants`),
    updateAppStatus:  (jobId, appId, status) => req(`/jobs/${jobId}/applicants/${appId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },
  candidates: {
    getAll:      (params = {}) => { const qs = new URLSearchParams(params).toString(); return req(`/candidates${qs ? `?${qs}` : ''}`); },
    getOne:      id            => req(`/candidates/${id}`),
    shortlist:   id            => req(`/candidates/${id}/shortlist`, { method: 'POST' }),
    unshortlist: id            => req(`/candidates/${id}/shortlist`, { method: 'DELETE' }),
    getShortlisted: ()         => req('/candidates/shortlisted/all'),
  },
  messages: {
    getInbox:       ()     => req('/messages'),
    getThread:      userId => req(`/messages/thread/${userId}`),
    send:           data   => req('/messages/send', { method: 'POST', body: JSON.stringify(data) }),
    markRead:       id     => req(`/messages/${id}/read`, { method: 'PUT' }),
    getUnreadCount: ()     => req('/messages/unread-count'),
    getContacts:    ()     => req('/messages/contacts'),
    deleteMessage:  id     => req(`/messages/${id}`, { method: 'DELETE' }),
  },
  interviews: {
    getAll:    ()         => req('/interviews'),
    getMy:     ()         => req('/interviews/my'),
    schedule:  data       => req('/interviews',      { method: 'POST',   body: JSON.stringify(data) }),
    update:    (id, data) => req(`/interviews/${id}`, { method: 'PUT',   body: JSON.stringify(data) }),
    remove:    id         => req(`/interviews/${id}`, { method: 'DELETE' }),
  },
  analysis: { predict: () => req('/ml/predict', { method: 'POST' }) },
  ai: {
    chat:      (messages, context) => req('/ai/chat',  { method: 'POST', body: JSON.stringify({ messages, context }) }),
    coach:     (question, user)    => req('/ai/coach', { method: 'POST', body: JSON.stringify({ question, user }) }),
    recommend: userId              => req(`/ai/recommend/${userId}`),
    analyze:   userId              => req(`/ai/analyze/${userId}`),
  },
  admin: {
    stats:          ()           => req('/admin/stats'),
    users:          ()           => req('/admin/users'),
    deleteUser:     id           => req(`/admin/users/${id}`,           { method: 'DELETE' }),
    updateRole:     (id, role)   => req(`/admin/users/${id}/role`,      { method: 'PATCH', body: JSON.stringify({ role }) }),
    getSettings:    ()           => req('/admin/settings'),
    saveSettings:   data         => req('/admin/settings',              { method: 'PUT',   body: JSON.stringify(data) }),
    recentActivity: ()           => req('/admin/activity'),
    mlStats:        ()           => req('/admin/ml/dataset'),
    mlRetrain:      ()           => req('/admin/ml/retrain',            { method: 'POST' }),
    resetSkills:    id           => req(`/admin/users/${id}/reset-skills`, { method: 'POST' }),
  },
};