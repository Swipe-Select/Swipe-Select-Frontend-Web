import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Send, 
  Sparkles, 
  CheckCheck, 
  MessageSquare,
  ShieldCheck
} from "lucide-react";
import "./MessagesPage.css";

type Message = {
  id: string;
  sender: "user" | "recruiter";
  text: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  company: string;
  recruiterName: string;
  role: string;
  avatarColor: string;
  unread: number;
  lastMessage: string;
  lastTime: string;
  messages: Message[];
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "stripe-talent",
    company: "Stripe",
    recruiterName: "Elena Vance • Staff Tech Recruiter",
    role: "Staff Product Designer",
    avatarColor: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    unread: 1,
    lastMessage: "Hi! We reviewed your Swipe-Select tailored profile and were impressed by your systems design experience.",
    lastTime: "10m ago",
    messages: [
      {
        id: "m1",
        sender: "recruiter",
        text: "Hi! Thanks for applying through Swipe Select. We reviewed your profile and wanted to follow up regarding the Staff Product Designer opening.",
        timestamp: "10:14 AM",
      },
      {
        id: "m2",
        sender: "recruiter",
        text: "Your tailored portfolio highlights strong design systems work. Would you be open to an initial 20-minute chat with our design director this week?",
        timestamp: "10:15 AM",
      },
    ],
  },
  {
    id: "google-ux",
    company: "Google",
    recruiterName: "Marcus Sterling • Talent Partner",
    role: "Senior Product Designer",
    avatarColor: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    unread: 0,
    lastMessage: "Your application was screened through our ModernBERT authentic intake.",
    lastTime: "2h ago",
    messages: [
      {
        id: "g1",
        sender: "recruiter",
        text: "Hello! We noticed your application for Senior Product Designer. Our team is currently scheduling technical portfolio walkthroughs.",
        timestamp: "8:30 AM",
      },
    ],
  },
  {
    id: "airbnb-design",
    company: "Airbnb",
    recruiterName: "Chloe Dupont • Recruiting Lead",
    role: "Lead UX Designer",
    avatarColor: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    unread: 0,
    lastMessage: "Looking forward to your response!",
    lastTime: "1d ago",
    messages: [
      {
        id: "a1",
        sender: "recruiter",
        text: "Hi there! Airbnb Design is expanding our host experience team. Your background in user research looks like a great match.",
        timestamp: "Yesterday",
      },
    ],
  },
];

export function MessagesPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const paramCompany = searchParams.get("company");
  const paramRole = searchParams.get("role");

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (paramCompany) {
      // Check if already in list
      const existing = INITIAL_CONVERSATIONS.find(
        (c) => c.company.toLowerCase() === paramCompany.toLowerCase()
      );
      if (existing) return INITIAL_CONVERSATIONS;

      // Add a fresh conversation at top for this applied company!
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        company: paramCompany,
        recruiterName: `Talent Team • ${paramCompany}`,
        role: paramRole || "Target Position",
        avatarColor: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
        unread: 0,
        lastMessage: `Conversation opened for ${paramCompany}.`,
        lastTime: "Just now",
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: "recruiter",
            text: `Hi! Thank you for your interest in the ${paramRole || "open role"} at ${paramCompany}. How can we help you today?`,
            timestamp: "Just now",
          },
        ],
      };
      return [newConv, ...INITIAL_CONVERSATIONS];
    }
    return INITIAL_CONVERSATIONS;
  });

  const [activeId, setActiveId] = useState<string>("stripe-talent");

  useEffect(() => {
    if (paramCompany) {
      const match = conversations.find(
        (c) => c.company.toLowerCase() === paramCompany.toLowerCase()
      );
      if (match) setActiveId(match.id);
    }
  }, [paramCompany, conversations]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId) ?? conversations[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConv?.messages, isTyping]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || !activeConv) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            lastMessage: text,
            lastTime: "Just now",
            messages: [...c.messages, userMsg],
          };
        }
        return c;
      })
    );

    setInputText("");
    setIsTyping(true);

    // Simulate smart recruiter response
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        `Thanks for the update! I will pass this directly to our hiring team for ${activeConv.role}.`,
        `That sounds fantastic! We're coordinating interviews for later this week and will send a calendar link shortly.`,
        `Great question. Yes, we support flexible hybrid and remote arrangements with full home-office stipends!`,
        `Received! Your tailored resume from Swipe Select has already been fast-tracked in our system.`,
      ];
      const botReply = responses[Math.floor(Math.random() * responses.length)];

      const recruiterMsg: Message = {
        id: `r-${Date.now()}`,
        sender: "recruiter",
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConv.id) {
            return {
              ...c,
              lastMessage: botReply,
              lastTime: "Just now",
              messages: [...c.messages, recruiterMsg],
            };
          }
          return c;
        })
      );
    }, 1200);
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="msg-page page-fill">
      <div className="msg-layout">
        {/* Left: Conversations sidebar */}
        <aside className="msg-sidebar">
          <div className="msg-sidebar-header">
            <div>
              <h2 className="msg-sidebar-title">Recruiter Inbox</h2>
              <p className="msg-sidebar-subtitle">Direct candidate messaging</p>
            </div>
            <span className="msg-sidebar-count">{conversations.length}</span>
          </div>

          <div className="msg-conv-list">
            {conversations.map((c) => {
              const isActive = c.id === activeConv?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`msg-conv-item ${isActive ? "msg-conv-item--active" : ""}`}
                  onClick={() => {
                    setActiveId(c.id);
                    // clear unread
                    setConversations((prev) =>
                      prev.map((conv) => (conv.id === c.id ? { ...conv, unread: 0 } : conv))
                    );
                  }}
                >
                  <div className="msg-conv-avatar" style={{ background: c.avatarColor }} aria-hidden>
                    {c.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="msg-conv-body">
                    <div className="msg-conv-top">
                      <span className="msg-conv-company">{c.company}</span>
                      <span className="msg-conv-time">{c.lastTime}</span>
                    </div>
                    <p className="msg-conv-role">{c.role}</p>
                    <p className="msg-conv-preview">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="msg-unread-pill">{c.unread}</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: Active Chat Area */}
        <main className="msg-chat-area">
          {activeConv ? (
            <div className="msg-chat-wrapper">
              {/* Header */}
              <header className="msg-chat-header">
                <div className="msg-chat-header-info">
                  <div className="msg-conv-avatar" style={{ background: activeConv.avatarColor }} aria-hidden>
                    {activeConv.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="msg-chat-title">{activeConv.recruiterName}</h3>
                    <p className="msg-chat-sub">
                      Role Target: <strong>{activeConv.role}</strong> • <span className="msg-online-indicator">Active Now</span>
                    </p>
                  </div>
                </div>

                <div className="msg-chat-header-badges">
                  <span className="msg-auth-badge">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>Verified Employer</span>
                  </span>
                </div>
              </header>

              {/* Message Feed */}
              <div className="msg-feed">
                {activeConv.messages.map((m) => {
                  const isUser = m.sender === "user";
                  return (
                    <div
                      key={m.id}
                      className={`msg-bubble-wrap ${isUser ? "msg-bubble-wrap--user" : "msg-bubble-wrap--recruiter"}`}
                    >
                      <div className={`msg-bubble ${isUser ? "msg-bubble--user" : "msg-bubble--recruiter"}`}>
                        <p className="msg-text">{m.text}</p>
                        <span className="msg-timestamp">
                          {m.timestamp}
                          {isUser && <CheckCheck size={13} className="msg-check-icon" />}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="msg-bubble-wrap msg-bubble-wrap--recruiter">
                    <div className="msg-bubble msg-bubble--recruiter msg-bubble--typing">
                      <span className="msg-typing-dot" />
                      <span className="msg-typing-dot" />
                      <span className="msg-typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div className="msg-quick-prompts">
                <span className="msg-quick-label"><Sparkles size={13} /> Quick Replies:</span>
                <button
                  type="button"
                  className="msg-quick-btn"
                  onClick={() => handleQuickPrompt("What is the expected interview process & timeline?")}
                >
                  Interview timeline?
                </button>
                <button
                  type="button"
                  className="msg-quick-btn"
                  onClick={() => handleQuickPrompt("Can you share more details about the salary and benefits package?")}
                >
                  Compensation details?
                </button>
                <button
                  type="button"
                  className="msg-quick-btn"
                  onClick={() => handleQuickPrompt("I'd love to schedule a screening call this week.")}
                >
                  Schedule a call
                </button>
              </div>

              {/* Input Bar */}
              <form
                className="msg-input-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  type="text"
                  className="msg-input"
                  placeholder={`Reply to ${activeConv.company} recruiter…`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button
                  type="submit"
                  className="msg-send-btn"
                  disabled={!inputText.trim()}
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          ) : (
            <div className="msg-empty">
              <MessageSquare size={48} className="text-indigo-400" />
              <h2 className="msg-empty-title">Select a conversation</h2>
              <p className="msg-empty-copy">
                Choose a company thread on the left to review messages and coordinate interviews.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
