import "./MessagesPage.css";

function IllustrationInbox() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" aria-hidden>
      <circle cx="55" cy="55" r="52" fill="#f0f9ff" />
      {/* Envelope body */}
      <rect x="20" y="36" width="70" height="46" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      {/* Envelope flap lines */}
      <path d="M20 42l35 22 35-22" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round" fill="none" />
      {/* Message lines inside */}
      <line x1="32" y1="62" x2="52" y2="62" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="70" x2="60" y2="70" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      {/* Notification dot */}
      <circle cx="78" cy="36" r="10" fill="#4648d4" />
      <text x="78" y="40.5" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="Manrope, system-ui">0</text>
    </svg>
  );
}

const MOCK_CONVERSATIONS = [
  { id: 1, company: "Acme Corp", role: "Frontend Developer", time: "—", preview: "No messages yet" },
  { id: 2, company: "Bright Labs", role: "Product Designer", time: "—", preview: "No messages yet" },
  { id: 3, company: "Nova Systems", role: "Full Stack Engineer", time: "—", preview: "No messages yet" },
];

export function MessagesPage() {
  return (
    <div className="msg-page page-fill">
      <div className="msg-layout">
        {/* Left: Conversations list */}
        <aside className="msg-sidebar">
          <div className="msg-sidebar-header">
            <h2 className="msg-sidebar-title">Inbox</h2>
            <span className="msg-sidebar-count">0</span>
          </div>

          <div className="msg-conv-list">
            {MOCK_CONVERSATIONS.map((c) => (
              <div key={c.id} className="msg-conv-item msg-conv-item--placeholder">
                <div className="msg-conv-avatar" aria-hidden>
                  {c.company[0]}
                </div>
                <div className="msg-conv-body">
                  <div className="msg-conv-top">
                    <span className="msg-conv-company">{c.company}</span>
                    <span className="msg-conv-time">{c.time}</span>
                  </div>
                  <p className="msg-conv-role">{c.role}</p>
                  <p className="msg-conv-preview">{c.preview}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: Empty chat area */}
        <main className="msg-chat-area">
          <div className="msg-empty">
            <div className="msg-empty-art">
              <IllustrationInbox />
            </div>
            <h2 className="msg-empty-title">Your inbox is waiting</h2>
            <p className="msg-empty-copy">
              When employers reach out about jobs you applied to, their messages will appear here.
            </p>
            <div className="msg-coming-soon-badge">
              Coming soon
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
