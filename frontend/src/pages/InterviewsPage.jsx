import { useState, useEffect } from 'react';
import { Spinner, EmptyState } from '../components/UI';
import { api } from '../services/api';

const STATUS_CLR = { scheduled:'#3B82F6', completed:'#16a34a', cancelled:'#dc2626', rescheduled:'#f97316' };
const STATUS_LABEL = { scheduled:'Scheduled', completed:'Completed', cancelled:'Cancelled', rescheduled:'Rescheduled' };
const TYPE_ICON = { 'Video Call':'🎥', 'Phone Call':'📞', 'In-Person':'🏢', 'Technical':'💻', 'HR Round':'👤' };

export default function InterviewsPage({ user }) {
  const [interviews, setInterviews] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');

  useEffect(() => {
    api.interviews.getMy()
      .then(d => setInterviews(d.interviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayStr  = new Date().toISOString().split('T')[0];
  const upcoming  = interviews.filter(i => i.date >= todayStr && i.status === 'scheduled');
  const filtered  = filter === 'all' ? interviews : interviews.filter(i => i.status === filter);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  const formatTime = (timeStr) => {
    try {
      const [h, m] = timeStr.split(':');
      const d = new Date(); d.setHours(+h, +m);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return timeStr; }
  };

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / (1000*60*60*24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0)   return 'Past';
    return `In ${diff} day${diff > 1 ? 's' : ''}`;
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h2>My Interviews</h2>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', marginTop: 6 }}>
          View all interview invitations scheduled by recruiters. Prepare well and show up on time!
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          ['📅', 'Total',    interviews.length,  'var(--accent)'],
          ['⏰', 'Upcoming', upcoming.length,     '#3B82F6'],
          ['✅', 'Completed', interviews.filter(i=>i.status==='completed').length, '#16a34a'],
          ['❌', 'Cancelled', interviews.filter(i=>i.status==='cancelled').length, '#dc2626'],
        ].map(([icon, label, val, color]) => (
          <div key={label} className="card" style={{ textAlign:'center', padding:'20px 14px' }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1, marginBottom:4 }}>{val}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming alert */}
      {upcoming.length > 0 && (
        <div style={{ background:'rgba(59,130,246,0.08)', border:'1.5px solid rgba(59,130,246,0.25)', borderRadius:12, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:22 }}>🔔</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#3B82F6', marginBottom:3 }}>
              You have {upcoming.length} upcoming interview{upcoming.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize:13, color:'var(--ink-2)' }}>
              Next: <strong>{upcoming[0].type}</strong> on <strong>{formatDate(upcoming[0].date)}</strong> at <strong>{formatTime(upcoming[0].time)}</strong>
              {upcoming[0].recruiterName ? ` with ${upcoming[0].recruiterName}` : ''}
              {upcoming[0].company ? ` from ${upcoming[0].company}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {['all', 'scheduled', 'completed', 'cancelled', 'rescheduled'].map(s => (
          <button key={s} className={`tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}
            style={{ textTransform:'capitalize' }}>
            {s === 'all' ? `All (${interviews.length})` : `${s.charAt(0).toUpperCase()+s.slice(1)} (${interviews.filter(i=>i.status===s).length})`}
          </button>
        ))}
      </div>

      {/* Interview list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📅"
          title={filter === 'all' ? 'No interviews yet' : `No ${filter} interviews`}
          description={filter === 'all'
            ? "When a recruiter schedules an interview with you, it will appear here. Keep your profile updated to attract recruiters!"
            : `You have no ${filter} interviews.`}
        />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[...filtered].sort((a,b) => a.date.localeCompare(b.date)).map(iv => {
            const isUpcoming = iv.date >= todayStr && iv.status === 'scheduled';
            const countdown  = daysUntil(iv.date);
            return (
              <div key={iv._id} className="card"
                style={{ borderLeft:`4px solid ${STATUS_CLR[iv.status]||'var(--border)'}`, position:'relative', overflow:'hidden' }}>
                {isUpcoming && countdown !== 'Past' && (
                  <div style={{ position:'absolute', top:12, right:16, fontSize:11, fontWeight:700, color:STATUS_CLR.scheduled,
                    background:'rgba(59,130,246,0.10)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(59,130,246,0.25)' }}>
                    {countdown}
                  </div>
                )}
                <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  <div style={{ fontSize:28, flexShrink:0 }}>{TYPE_ICON[iv.type] || '📋'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:16, fontWeight:700 }}>{iv.type} Interview</span>
                      <span className="badge" style={{ background:`${STATUS_CLR[iv.status]}15`, color:STATUS_CLR[iv.status], borderColor:`${STATUS_CLR[iv.status]}30`, fontSize:11 }}>
                        {STATUS_LABEL[iv.status]}
                      </span>
                      {iv.jobTitle && <span className="badge badge-blue" style={{ fontSize:11 }}>💼 {iv.jobTitle}</span>}
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'6px 20px', marginBottom:iv.notes?10:0 }}>
                      <div style={{ fontSize:13, color:'var(--ink-2)' }}>
                        <span style={{ color:'var(--ink-3)', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>Date</span><br/>
                        {formatDate(iv.date)}
                      </div>
                      <div style={{ fontSize:13, color:'var(--ink-2)' }}>
                        <span style={{ color:'var(--ink-3)', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>Time</span><br/>
                        {formatTime(iv.time)}
                      </div>
                      {iv.recruiterName && (
                        <div style={{ fontSize:13, color:'var(--ink-2)' }}>
                          <span style={{ color:'var(--ink-3)', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>Recruiter</span><br/>
                          {iv.recruiterName}
                        </div>
                      )}
                      {iv.company && (
                        <div style={{ fontSize:13, color:'var(--ink-2)' }}>
                          <span style={{ color:'var(--ink-3)', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>Company</span><br/>
                          {iv.company}
                        </div>
                      )}
                    </div>

                    {iv.notes && (
                      <div style={{ marginTop:10, padding:'10px 14px', background:'var(--surface-2)', borderRadius:8, border:'1px solid var(--border)', fontSize:13, color:'var(--ink-2)', lineHeight:1.6 }}>
                        <strong>📝 Notes:</strong> {iv.notes}
                      </div>
                    )}

                    {iv.interviewLink && (
                      <div style={{ marginTop:10 }}>
                        <a href={iv.interviewLink} target="_blank" rel="noreferrer"
                          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:8,
                            background:'#3B82F6', color:'#fff', textDecoration:'none', fontSize:14, fontWeight:600 }}>
                          🔗 Join Interview
                        </a>
                        <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:6 }}>
                          Link: <span style={{ wordBreak:'break-all' }}>{iv.interviewLink}</span>
                        </div>
                      </div>
                    )}

                    {isUpcoming && (
                      <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(22,163,74,0.07)', borderRadius:8, border:'1px solid rgba(22,163,74,0.2)', fontSize:13, color:'#15803d', lineHeight:1.6 }}>
                        💡 <strong>Tip:</strong> Review your skills and practice relevant assessments before the interview. Check the <strong>Learning</strong> and <strong>Tests</strong> sections to prepare.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}