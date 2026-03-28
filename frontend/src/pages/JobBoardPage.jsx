import { useState, useEffect, useRef } from 'react';
import { Spinner, EmptyState, Modal, Alert } from '../components/UI';
import { api } from '../services/api';

const scoreColor = s => s >= 60 ? '#16a34a' : s >= 40 ? '#6B7280' : '#dc2626';

function JobCard({ job, userScore, onApply, applied }) {
  const meetsReq = !job.minScore || userScore >= job.minScore;
  return (
    <div className="card" style={{ transition: 'all var(--tx)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = meetsReq ? 'rgba(224,92,58,0.25)' : 'var(--border)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{job.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 6 }}>
            {job.company || 'Company'} {job.location ? `· ${job.location}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {job.type && <span className="badge badge-blue">{job.type}</span>}
            {job.remote && <span className="badge badge-green">Remote</span>}
            {job.minScore > 0 && (
              <span className="badge" style={{ background: meetsReq ? 'var(--green-dim)' : 'rgba(59,130,246,0.10)', color: meetsReq ? 'var(--green)' : '#3B82F6' }}>
                Min Score: {job.minScore}%
              </span>
            )}
          </div>
        </div>
        {job.salary && (
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{job.salary}</div>
            <div className="label" style={{ marginTop: 2 }}>per annum</div>
          </div>
        )}
      </div>

      {job.description && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 12 }}>
          {job.description.slice(0, 160)}{job.description.length > 160 ? '…' : ''}
        </p>
      )}

      {(job.skills || []).length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {job.skills.map(s => <span key={s} className="tag">{s}</span>)}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Inter, sans-serif' }}>
          Posted {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'recently'} · {job.applicants || 0} applicants
        </div>
        {applied ? (
          <span className="badge badge-green">✓ Applied</span>
        ) : meetsReq ? (
          <button className="btn btn-primary btn-sm" onClick={() => onApply(job)}>Apply Now</button>
        ) : (
          <div data-tip={`Need ${job.minScore}% score`}>
            <button className="btn btn-outline btn-sm" disabled style={{ opacity: 0.5 }}>Score too low</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplyModal({ job, open, onClose, onSubmit }) {
  const [cover, setCover] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await onSubmit(job, cover);
    setLoading(false);
    setCover('');
    onClose();
  };

  if (!job) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Apply to ${job.title}`} width={500}>
      <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{job.title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{job.company}{job.location ? ` · ${job.location}` : ''}</div>
      </div>
      <div className="form-group">
        <label className="form-label">Cover Note (optional)</label>
        <textarea rows={4} value={cover} onChange={e => setCover(e.target.value)} placeholder="Briefly explain why you're a great fit for this role…" />
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16, padding: '10px 12px', background: 'rgba(59,130,246,0.10)', borderRadius: 8, border: '1px solid rgba(59,125,216,0.2)' }}>
        ℹ️ Your skill profile, test scores, and certifications will be shared with the recruiter.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
          {loading ? <><Spinner size={12} color="white" /> Submitting…</> : 'Submit Application'}
        </button>
      </div>
    </Modal>
  );
}

export default function JobBoardPage({ user }) {
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [applied,  setApplied]  = useState([]);
  const [filter,   setFilter]   = useState({ search: '', type: '', remote: false });
  const [applyJob, setApplyJob] = useState(null);
  const [msg,      setMsg]      = useState('');
  const [newJobsAlert, setNewJobsAlert] = useState(0);
  const jobCountRef = useRef(0);
  const userScore = user?.overallScore || 0;

  const loadJobs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const d = await api.jobs?.getAll();
      const newJobs = d?.jobs || [];
      if (silent && newJobs.length > jobCountRef.current) {
        setNewJobsAlert(newJobs.length - jobCountRef.current);
      }
      jobCountRef.current = newJobs.length;
      setJobs(newJobs);
    } catch {}
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadJobs();
    api.jobs?.getApplied()
      .then(d => setApplied((d.applications || []).map(a => a.jobId)))
      .catch(() => {});

    // Poll for new job postings every 20s
    const id = setInterval(() => loadJobs(true), 20000);
    return () => clearInterval(id);
  }, []);

  const handleApply = async (job, cover) => {
    try {
      await api.jobs.apply(job._id, { cover });
      setApplied(prev => [...prev, job._id]);
      setMsg(`Successfully applied to "${job.title}"!`);
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setMsg(e.message || 'Application failed.');
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const filtered = jobs.filter(j => {
    if (filter.search && !j.title?.toLowerCase().includes(filter.search.toLowerCase()) &&
        !j.company?.toLowerCase().includes(filter.search.toLowerCase()) &&
        !(j.skills || []).some(s => s.toLowerCase().includes(filter.search.toLowerCase()))) return false;
    if (filter.type && j.type !== filter.type) return false;
    if (filter.remote && !j.remote) return false;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2>Job Board</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Browse open roles. Your skill score ({userScore}%) determines eligibility for some positions.
        </p>
      </div>

      {msg && <Alert type={msg.includes('failed') ? 'error' : 'success'} style={{ marginBottom: 16 }}>{msg}</Alert>}

      {/* New jobs alert */}
      {newJobsAlert > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(192,83,58,0.25)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            🆕 {newJobsAlert} new job posting{newJobsAlert > 1 ? 's' : ''} added!
          </span>
          <button onClick={() => setNewJobsAlert(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="card card-sm" style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label">Search</label>
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} placeholder="Role, company, or skill…" />
        </div>
        <div style={{ width: 160 }}>
          <label className="form-label">Type</label>
          <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
            <option value="">All types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', paddingBottom: 9, fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={filter.remote} onChange={e => setFilter(f => ({ ...f, remote: e.target.checked }))}
            style={{ width: 'auto', cursor: 'pointer' }} />
          Remote only
        </label>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="💼" title="No jobs found" description={jobs.length ? 'Try adjusting your filters.' : 'No jobs have been posted yet. Check back soon!'} />
      ) : (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Inter, sans-serif' }}>
            {filtered.length} job{filtered.length !== 1 ? 's' : ''} found
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {filtered.map(job => (
              <JobCard
                key={job._id}
                job={job}
                userScore={userScore}
                onApply={setApplyJob}
                applied={applied.includes(job._id)}
              />
            ))}
          </div>
        </>
      )}

      <ApplyModal job={applyJob} open={!!applyJob} onClose={() => setApplyJob(null)} onSubmit={handleApply} />
    </div>
  );
}
