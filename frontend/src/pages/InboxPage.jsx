import { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner, EmptyState, Alert, Avatar } from '../components/UI';
import { api } from '../services/api';

const roleLabel = r => r === 'recruiter' ? 'Recruiter' : r === 'admin' ? 'Admin' : 'Candidate';
const roleColor = r => r === 'recruiter' ? '#3B82F6' : r === 'admin' ? '#6B7280' : '#9CA3AF';

const STATUS_COLORS = {
  selected:    { bg: 'rgba(46,125,79,0.1)',    border: 'rgba(46,125,79,0.28)',    text: 'var(--green)',  label: 'Selected' },
  rejected:    { bg: 'rgba(192,57,43,0.08)',   border: 'rgba(192,57,43,0.25)',    text: 'var(--red)',    label: 'Not Selected' },
  shortlisted: { bg: 'rgba(184,110,0,0.08)',   border: 'rgba(184,110,0,0.25)',    text: '#3B82F6',       label: 'Shortlisted' },
  reviewed:    { bg: 'rgba(45,122,110,0.07)',  border: 'rgba(59,130,246,0.25)',   text: '#3B82F6',       label: 'Under Review' },
  pending:     { bg: 'var(--surface-2)',        border: 'var(--border)',           text: 'var(--ink-3)',  label: 'Pending' },
};

export default function InboxPage({ user }) {
  const [contacts,     setContacts]    = useState([]);
  const [thread,       setThread]      = useState(null);
  const [msgs,         setMsgs]        = useState([]);
  const [reply,        setReply]       = useState('');
  const [sending,      setSending]     = useState(false);
  const [loading,      setLoading]     = useState(true);
  const [err,          setErr]         = useState('');
  const [newMsgTo,     setNewMsgTo]    = useState('');
  const [showNew,      setShowNew]     = useState(false);
  const [searchUser,   setSearchUser]  = useState('');
  const [foundUsers,   setFoundUsers]  = useState([]);
  const [searching,    setSearching]   = useState(false);
  const [newSubject,   setNewSubject]  = useState('');
  const [newBody,      setNewBody]     = useState('');
  const [statusAlert,  setStatusAlert] = useState(null);
  const [prevStatuses, setPrevStatuses] = useState({});
  const [deletingId,   setDeletingId]  = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const bottomRef = useRef(null);
  const threadRef = useRef(thread);
  threadRef.current = thread;

  const loadContacts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, inbox] = await Promise.all([
        api.messages.getContacts().catch(() => ({ contacts: [] })),
        api.messages.getInbox().catch(() => ({ inbox: [], sent: [] })),
      ]);
      let contacts = c.contacts || [];
      if (contacts.length === 0 && inbox.inbox?.length > 0) {
        const fromMap = {};
        for (const m of inbox.inbox) {
          const id = m.from?._id || m.from;
          if (id && !fromMap[id]) {
            fromMap[id] = {
              _id: id,
              name: m.from?.name || 'Unknown',
              role: m.from?.role,
              avatar: m.from?.avatar || '',
              unread: inbox.inbox.filter(x => (x.from?._id || x.from) === id && !x.read).length,
              lastMessage: m.message,
              lastAt: m.createdAt,
            };
          }
        }
        contacts = Object.values(fromMap);
      }
      setContacts(contacts);
    } catch {}
    if (!silent) setLoading(false);
  }, []);

  const pollThread = useCallback(async () => {
    const t = threadRef.current;
    if (!t) return;
    try {
      const d = await api.messages.getThread(t._id).catch(() => ({ messages: [] }));
      setMsgs(prev => {
        const newMsgs = d.messages || [];
        if (newMsgs.length !== prev.length) return newMsgs;
        return prev;
      });
    } catch {}
  }, []);

  const pollStatuses = useCallback(async () => {
    try {
      const d = await api.jobs.getApplied().catch(() => ({ applications: [] }));
      const apps = d.applications || [];
      setStatusAlert(prev => {
        for (const app of apps) {
          const prevStatus = prevStatuses[app.applicationId || app._id];
          const currStatus = app.status;
          if (prevStatus && prevStatus !== currStatus && ['selected', 'rejected', 'shortlisted', 'reviewed'].includes(currStatus)) {
            return { job: app.jobTitle || 'a job', status: currStatus, label: STATUS_COLORS[currStatus]?.label || currStatus };
          }
        }
        return prev;
      });
      const newMap = {};
      for (const app of apps) newMap[app.applicationId || app._id] = app.status;
      setPrevStatuses(newMap);
    } catch {}
  }, [prevStatuses]);

  useEffect(() => {
    loadContacts();
    api.jobs.getApplied().then(d => {
      const map = {};
      for (const app of (d.applications || [])) map[app.applicationId || app._id] = app.status;
      setPrevStatuses(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const msgInterval    = setInterval(() => { loadContacts(true); pollThread(); }, 8000);
    const statusInterval = setInterval(() => { pollStatuses(); }, 15000);
    return () => { clearInterval(msgInterval); clearInterval(statusInterval); };
  }, [loadContacts, pollThread, pollStatuses]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const openThread = async (contact) => {
    setThread(contact);
    setErr('');
    const d = await api.messages.getThread(contact._id).catch(() => ({ messages: [] }));
    setMsgs(d.messages || []);
    await loadContacts(true);
  };

  const sendReply = async () => {
    if (!reply.trim() || !thread) return;
    setSending(true);
    setErr('');
    try {
      await api.messages.send({ toUserId: thread._id, message: reply.trim() });
      setReply('');
      const d = await api.messages.getThread(thread._id).catch(() => ({ messages: [] }));
      setMsgs(d.messages || []);
      await loadContacts(true);
    } catch (e) { setErr(e.message || 'Failed to send'); }
    setSending(false);
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    setDeletingId(msgId);
    try {
      await api.messages.deleteMessage(msgId);
      setMsgs(prev => prev.filter(m => m._id !== msgId));
      await loadContacts(true);
    } catch (e) {
      setErr(e.message || 'Failed to delete message');
    }
    setDeletingId(null);
  };

  const handleSearchUsers = async () => {
    if (!searchUser.trim()) return;
    setSearching(true);
    try {
      const d = await api.candidates.getAll({ search: searchUser, limit: 8 }).catch(() => ({ candidates: [] }));
      setFoundUsers(d.candidates || []);
    } catch {}
    setSearching(false);
  };

  const startConversation = async (recipientId, recipientName) => {
    if (!newBody.trim()) return;
    setSending(true);
    setErr('');
    try {
      await api.messages.send({ toUserId: recipientId, message: newBody.trim(), subject: newSubject.trim() });
      setShowNew(false);
      setNewBody('');
      setNewSubject('');
      setSearchUser('');
      setFoundUsers([]);
      await loadContacts(true);
      const c = contacts.find(c => c._id === recipientId) || { _id: recipientId, name: recipientName };
      setThread(c);
      const d = await api.messages.getThread(recipientId).catch(() => ({ messages: [] }));
      setMsgs(d.messages || []);
    } catch (e) { setErr(e.message || 'Failed to send'); }
    setSending(false);
  };

  const totalUnread = contacts.reduce((a, c) => a + (c.unread || 0), 0);
  const isMyMsg = (msg) => String(msg.from?._id || msg.from) === String(user?._id || user?.id);

  return (
    <div>
      {/* Status Alert Banner */}
      {statusAlert && (
        <div style={{
          marginBottom: 16, padding: '12px 18px', borderRadius: 'var(--r)',
          background: STATUS_COLORS[statusAlert.status]?.bg || 'var(--surface-2)',
          border: `1px solid ${STATUS_COLORS[statusAlert.status]?.border || 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 14, color: STATUS_COLORS[statusAlert.status]?.text || 'var(--ink)', fontWeight: 600 }}>
            {STATUS_COLORS[statusAlert.status]?.label} — Your application for <strong>{statusAlert.job}</strong> has been updated.
          </div>
          <button
            onClick={() => setStatusAlert(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, padding: '0 4px' }}
          >×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2>
            Messages
            {totalUnread > 0 && (
              <span style={{ fontSize: 13, color: 'var(--accent)', marginLeft: 10, fontWeight: 600 }}>
                {totalUnread} unread
              </span>
            )}
          </h2>
          <p style={{ color: 'var(--ink-3)', marginTop: 4, fontSize: 14 }}>Direct messaging. New messages appear automatically.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New Message</button>
      </div>

      {err && <Alert type="error" style={{ marginBottom: 12 }}>{err}</Alert>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 16, minHeight: 520 }}>

          {/* Contact List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {contacts.length === 0 ? (
              <div style={{
                padding: '28px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13,
                background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)',
              }}>
                No conversations yet.<br />Click <strong>+ New Message</strong> to start one.
              </div>
            ) : contacts.map(contact => {
              const active = thread?._id === contact._id;
              return (
                <div
                  key={contact._id}
                  onClick={() => openThread(contact)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer', borderRadius: 'var(--r)',
                    background: active ? 'var(--accent-light)' : 'var(--surface)',
                    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    transition: 'all 0.14s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={contact.name} size={28} src={contact.avatar || ''} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: contact.unread > 0 ? 700 : 500 }}>{contact.name}</div>
                        <div style={{ fontSize: 11, color: roleColor(contact.role) }}>{roleLabel(contact.role)}</div>
                      </div>
                    </div>
                    {contact.unread > 0 && <span className="unread-dot">{contact.unread}</span>}
                  </div>
                  {contact.lastMessage && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginTop: 3 }}>
                      {contact.lastMessage}
                    </div>
                  )}
                  {contact.lastAt && (
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                      {new Date(contact.lastAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Thread View */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 520, padding: '16px 18px' }}>
            {!thread ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', gap: 10 }}>
                <div style={{ fontSize: 32 }}>💬</div>
                <div style={{ fontSize: 14 }}>Select a conversation to read</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>Start a new conversation</button>
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={thread.name} size={36} src={thread.avatar || ''} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{thread.name}</div>
                    <div style={{ fontSize: 11, color: roleColor(thread.role) }}>{roleLabel(thread.role)}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)' }}>auto-refreshing</div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, maxHeight: 360 }}>
                  {msgs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 30, fontSize: 13 }}>
                      No messages yet in this conversation.
                    </div>
                  ) : msgs.map(m => {
                    const mine = isMyMsg(m);
                    const isHovered = hoveredMsgId === m._id;
                    return (
                      <div
                        key={m._id}
                        style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end', position: 'relative' }}
                        onMouseEnter={() => setHoveredMsgId(m._id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {!mine && <Avatar name={m.from?.name || '?'} size={24} src={m.from?.avatar || ''} />}
                        <div style={{ maxWidth: '72%' }}>
                          {m.isSelection && (
                            <div style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600, marginBottom: 3, paddingLeft: 4 }}>
                              Selection Notification{m.jobTitle ? ` — ${m.jobTitle}` : ''}
                            </div>
                          )}
                          {m.subject && (
                            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 2, paddingLeft: 4 }}>
                              Re: {m.subject}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: mine ? 'row-reverse' : 'row' }}>
                            <div className={mine ? 'bubble-sent' : 'bubble-recv'} style={{ padding: '10px 14px', fontSize: 14, lineHeight: 1.55 }}>
                              {m.message}
                            </div>
                            {mine && isHovered && (
                              <button
                                onClick={() => handleDeleteMessage(m._id)}
                                disabled={deletingId === m._id}
                                title="Delete this message"
                                style={{
                                  background: 'rgba(220,38,38,0.10)',
                                  border: '1px solid rgba(220,38,38,0.25)',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  color: '#dc2626',
                                  fontSize: 13,
                                  padding: '3px 8px',
                                  lineHeight: 1,
                                  flexShrink: 0,
                                  transition: 'all 0.12s',
                                  marginBottom: 4,
                                }}
                              >
                                {deletingId === m._id ? <Spinner size={10} /> : '🗑'}
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3, textAlign: mine ? 'right' : 'left', paddingLeft: 4 }}>
                            {new Date(m.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {mine && <Avatar name={user?.name || '?'} size={24} src={user?.avatar || ''} />}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Reply Box */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6 }}>
                    💡 Hover over your sent messages to delete them.
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                      style={{ flex: 1, resize: 'none', minHeight: 68, fontSize: 14, marginBottom: 0 }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      style={{ flexShrink: 0, height: 68, paddingLeft: 18, paddingRight: 18 }}
                    >
                      {sending ? <Spinner size={14} color="white" /> : 'Send'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Message Modal */}
      {showNew && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div style={{ padding: '22px 24px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3>New Message</h3>
                <button
                  onClick={() => setShowNew(false)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1, padding: 4 }}
                >×</button>
              </div>
              {err && <Alert type="error" style={{ marginBottom: 12 }}>{err}</Alert>}
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <div className="form-group">
                <label className="form-label">Search Recipient</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
                    placeholder="Search by name..."
                  />
                  <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={handleSearchUsers} disabled={searching}>
                    {searching ? <Spinner size={12} /> : 'Search'}
                  </button>
                </div>
              </div>
              {foundUsers.length > 0 && (
                <div style={{ marginBottom: 14, maxHeight: 170, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--r)' }}>
                  {foundUsers.map(u => (
                    <div
                      key={u._id}
                      onClick={() => { setNewMsgTo(u._id); setSearchUser(u.name); setFoundUsers([]); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <Avatar name={u.name} size={28} src={u.avatar || ''} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{u.title || u.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Subject (optional)</label>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="e.g. Re: Frontend Developer Position" />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Message</label>
                <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Your message..." style={{ minHeight: 100 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>Cancel</button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => newMsgTo && startConversation(newMsgTo, searchUser)}
                  disabled={!newMsgTo || !newBody.trim() || sending}
                >
                  {sending ? <><Spinner size={13} color="white" /> Sending...</> : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}