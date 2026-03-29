import { useState, useEffect } from 'react';
import { Spinner, Alert, EmptyState } from '../components/UI';
import { api } from '../services/api';

export default function ProjectsPage({ user, onRefresh }) {
  // Always derive from latest user prop, but allow local optimistic updates
  const [projects, setProjects] = useState(user?.projects || []);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ name: '', description: '', link: '', tech: '' });
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [msgType,  setMsgType]  = useState('success');

  // On mount always pull fresh from backend so data survives reload
  useEffect(() => {
    api.users.getProfile()
      .then(d => { setProjects((d.user || d)?.projects || []); })
      .catch(() => { if (user?.projects) setProjects(user.projects); });
  }, []);

  const flash = (m, type = 'success') => { setMsg(m); setMsgType(type); setTimeout(() => setMsg(''), 3500); };
  const setF  = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', link: '', tech: '' });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p._id?.toString() || p.id);
    setForm({ name: p.name, description: p.description || '', link: p.link || p.url || '', tech: Array.isArray(p.tech) ? p.tech.join(', ') : (p.tech || '') });
    setShowForm(true);
  };

  const saveProject = async () => {
    if (!form.name.trim()) { flash('Project name is required.', 'error'); return; }
    setSaving(true);
    try {
      const entry = {
        id:          editing || Date.now().toString(),
        name:        form.name.trim(),
        description: form.description.trim(),
        link:        form.link.trim(),
        url:         form.link.trim(), // backend uses both
        tech:        form.tech.split(',').map(t => t.trim()).filter(Boolean),
      };
      const updated = editing
        ? projects.map(p => (p.id === editing || p._id === editing) ? entry : p)
        : [...projects, entry];

      // Save to backend first, then update local state
      await api.users.updateProfile({ projects: updated });
      setProjects(updated);
      setShowForm(false);
      setEditing(null);
      flash(editing ? 'Project updated!' : 'Project added!');
      // Refresh the global user context so projects persist across navigation
      if (onRefresh) await onRefresh();
    } catch (e) { flash(e.message || 'Failed to save.', 'error'); }
    setSaving(false);
  };

  const remove = async (p) => {
    const id = p._id?.toString() || p.id;
    if (!window.confirm('Remove this project?')) return;
    const updated = projects.filter(x => (x._id?.toString() || x.id) !== id);
    setProjects(updated); // optimistic
    try {
      await api.users.updateProfile({ projects: updated });
      if (onRefresh) await onRefresh();
      flash('Project removed.');
    } catch (e) {
      setProjects(projects); // rollback
      flash('Failed to remove project.', 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2>My Projects</h2>
          <p style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>
            Showcase your work. Projects are visible to recruiters.
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Project</button>
        )}
      </div>

      {msg && <Alert type={msgType} style={{ marginBottom: 16 }}>{msg}</Alert>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 18 }}>{editing ? 'Edit Project' : 'Add New Project'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Portfolio Website" />
            </div>
            <div className="form-group">
              <label className="form-label">Project Link</label>
              <input value={form.link} onChange={e => setF('link', e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Technologies Used <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(comma-separated)</span></label>
              <input value={form.tech} onChange={e => setF('tech', e.target.value)} placeholder="React, Node.js, MongoDB..." />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea rows={3} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="What does this project do? What problem does it solve?" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={saveProject} disabled={saving || !form.name.trim()}>
              {saving ? <><Spinner size={13} color="white" /> Saving...</> : (editing ? 'Save Changes' : 'Add Project')}
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm ? (
        <EmptyState
          icon="◫"
          title="No projects yet"
          description="Add your first project to showcase your work to recruiters. You can include a live link or GitHub URL."
          action={<button className="btn btn-primary" onClick={openAdd}>+ Add Your First Project</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {projects.map((p) => (
            <div key={p._id || p.id} className="card" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent), #3B82F6)', borderRadius: '12px 12px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingTop: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{p.name}</span>
                    {(p.link || p.url) && (
                      <a
                        href={p.link || p.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', padding: '3px 10px', borderRadius: 6, background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,0.18)', fontWeight: 500 }}
                      >
                        ↗ View Project
                      </a>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: 10 }}>{p.description}</p>
                  )}
                  {(Array.isArray(p.tech) ? p.tech : []).length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                      {(Array.isArray(p.tech) ? p.tech : []).join(' · ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn btn-danger btn-xs" onClick={() => remove(p)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && !showForm && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-outline btn-sm" onClick={openAdd}>+ Add Another Project</button>
        </div>
      )}
    </div>
  );
}