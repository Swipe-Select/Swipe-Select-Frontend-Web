import { type CSSProperties, type PointerEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Zap,
  ThumbsUp,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LocationPinIcon } from "../components/LocationPinIcon";
import "./WelcomePage.css";

type SwipeDirection = "left" | "right";

type WelcomeCard = {
  id: string;
  company: string;
  category: string;
  role: string;
  location: string;
  salary: string;
  type: string;
  experience: string;
  tags: string[];
  avatarBg: string;
};

const SWIPE_THRESHOLD = 90;
const MAX_DRAG = 260;
const DRAG_DEADZONE = 12;

const dummyCards: WelcomeCard[] = [
  {
    id: "google-designer",
    company: "Google",
    category: "Featured Tech",
    role: "Senior Product Designer",
    location: "Mountain View, CA (Hybrid)",
    salary: "$180k - $240k",
    type: "Full-time",
    experience: "5+ years exp",
    tags: ["Figma", "Design Systems", "Prototyping", "UI/UX"],
    avatarBg: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)",
  },
  {
    id: "airbnb-ux",
    company: "Airbnb",
    category: "Design & Travel",
    role: "Lead UX Designer",
    location: "San Francisco, CA (Hybrid)",
    salary: "$165k - $225k",
    type: "Full-time",
    experience: "6+ years exp",
    tags: ["User Research", "Design Ops", "Accessibility"],
    avatarBg: "linear-gradient(135deg, #FF5A5F 0%, #FC642D 100%)",
  },
  {
    id: "spotify-product",
    company: "Spotify",
    category: "Media & Audio",
    role: "Product Design Manager",
    location: "New York, NY (Remote)",
    salary: "$170k - $210k",
    type: "Full-time",
    experience: "7+ years exp",
    tags: ["Mobile UX", "Experimentation", "Mentorship"],
    avatarBg: "linear-gradient(135deg, #1DB954 0%, #10B981 100%)",
  },
  {
    id: "stripe-designer",
    company: "Stripe",
    category: "Fintech Leader",
    role: "Staff Product Designer",
    location: "Seattle, WA (Hybrid)",
    salary: "$185k - $245k",
    type: "Full-time",
    experience: "8+ years exp",
    tags: ["Payments UX", "Data Viz", "Interaction Design"],
    avatarBg: "linear-gradient(135deg, #635BFF 0%, #4338CA 100%)",
  },
  {
    id: "notion-visual",
    company: "Notion",
    category: "Productivity",
    role: "Senior Visual Designer",
    location: "Austin, TX (Remote)",
    salary: "$150k - $195k",
    type: "Full-time",
    experience: "5+ years exp",
    tags: ["Brand Systems", "UI Craft", "Motion Design"],
    avatarBg: "linear-gradient(135deg, #1F2937 0%, #111827 100%)",
  },
  {
    id: "figma-growth",
    company: "Figma",
    category: "Design Systems",
    role: "Growth Product Designer",
    location: "Boston, MA (Hybrid)",
    salary: "$160k - $205k",
    type: "Full-time",
    experience: "4+ years exp",
    tags: ["Growth UX", "A/B Testing", "Onboarding"],
    avatarBg: "linear-gradient(135deg, #F24E1E 0%, #A259FF 100%)",
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = Boolean(session?.token?.trim());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const [isHorizontalDrag, setIsHorizontalDrag] = useState(false);

  const stackCards = useMemo(() => {
    return [0, 1, 2].map((offset) => {
      const index = (currentIndex + offset) % dummyCards.length;
      return dummyCards[index];
    });
  }, [currentIndex]);

  const triggerSwipe = (direction: SwipeDirection, navigateAfter = false) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSwipeDirection(direction);

    window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % dummyCards.length);
      setSwipeDirection(null);
      setDragX(0);
      setIsReturning(false);
      setIsAnimating(false);

      if (navigateAfter) {
        if (isAuthenticated) {
          navigate("/dashboard");
        } else {
          navigate("/signup");
        }
      }
    }, 260);
  };

  const handleTopCardPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isAnimating) return;
    // Prevent pointer capture from hijacking clicks on the footer buttons
    const target = event.target as HTMLElement | null;
    if (target && (target.closest("button") || target.closest(".welcome-card-footer"))) {
      return;
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    setActivePointerId(event.pointerId);
    setDragStartX(event.clientX);
    setDragStartY(event.clientY);
    setIsDragging(true);
    setIsReturning(false);
    setIsHorizontalDrag(false);
  };

  const handleTopCardPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      !isDragging ||
      isAnimating ||
      dragStartX === null ||
      dragStartY === null ||
      (activePointerId !== null && event.pointerId !== activePointerId)
    ) {
      return;
    }

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    if (!isHorizontalDrag) {
      if (Math.abs(deltaX) < DRAG_DEADZONE && Math.abs(deltaY) < DRAG_DEADZONE) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.1) return;
      setIsHorizontalDrag(true);
    }

    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, deltaX));
    setDragX(clamped);
  };

  const handleTopCardPointerEnd = (event: PointerEvent<HTMLElement>) => {
    if (!isDragging || isAnimating) return;
    if (activePointerId !== null && event.pointerId !== activePointerId) return;

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore
    }
    setIsDragging(false);
    setDragStartX(null);
    setDragStartY(null);
    setActivePointerId(null);

    if (dragX <= -SWIPE_THRESHOLD) {
      triggerSwipe("left", false);
      return;
    }
    if (dragX >= SWIPE_THRESHOLD) {
      triggerSwipe("right", true);
      return;
    }

    setIsReturning(true);
    setDragX(0);
    window.setTimeout(() => setIsReturning(false), 220);
  };

  return (
    <div className="welcome-page page-fill">
      {/* Background radial glow */}
      <div className="welcome-bg-glow" aria-hidden />

      <main className="welcome-main">
        <section className="welcome-copy" aria-label="Intro">
          {/* Hero pill badge */}
          <div className="welcome-hero-pill">
            <span className="welcome-hero-pill-icon"><Flame size={14} className="text-amber-500" /></span>
            <span className="welcome-hero-pill-text">Next-Gen AI Career Discovery Engine</span>
          </div>

          <h1 className="welcome-title">
            Match Faster.
            <br />
            <span className="welcome-gradient-text">Apply Smarter.</span>
          </h1>

          <p className="welcome-highlight">1.5 Million+</p>
          <p className="welcome-subtitle">Curated live jobs are waiting for you</p>

          <p className="welcome-description">
            Experience the Tinder of job search. Powered by <strong>Real-Time Authenticity Screening</strong> to eliminate scam postings and <strong>Instant Resume Tailoring</strong> to generate ATS-optimized resumes in seconds.
          </p>

          <div className="welcome-actions">
            <Link to={isAuthenticated ? "/dashboard" : "/signup"} className="welcome-action-primary">
              <span>{isAuthenticated ? "Go to Dashboard" : "Start Swiping Now"}</span>
              <ArrowRight size={18} />
            </Link>
            {!isAuthenticated ? (
              <Link to="/login" className="welcome-action-secondary">
                Sign In
              </Link>
            ) : (
              <Link to="/dashboard/profile" className="welcome-action-secondary">
                My Profile
              </Link>
            )}
          </div>

          {/* Trust & Model Badges */}
          <div className="welcome-trust-row">
            <div className="welcome-trust-item">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span>Real-Time Fraud Detection</span>
            </div>
            <div className="welcome-trust-item">
              <Bot size={18} className="text-indigo-500" />
              <span>AI Resume Tailoring Engine</span>
            </div>
            <div className="welcome-trust-item">
              <Zap size={18} className="text-amber-500" />
              <span>Live Multi-Platform Scraper</span>
            </div>
          </div>
        </section>

        <section className="welcome-visual" aria-label="Featured match preview">
          <div
            className="welcome-card-stack"
            aria-live="polite"
            style={{ "--swipeProgress": `${Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD)}` } as CSSProperties}
          >
            {stackCards
              .slice()
              .reverse()
              .map((card, reversedIndex) => {
                const layer = stackCards.length - 1 - reversedIndex;
                const isTopCard = layer === 0;
                const swipeProgress = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD);
                const passOpacity = dragX < 0 ? swipeProgress : 0;
                const applyOpacity = dragX > 0 ? swipeProgress : 0;
                const rotation = dragX * 0.08;
                const topCardClasses = [
                  "welcome-card",
                  "welcome-card-front",
                  isDragging ? "is-dragging" : "",
                  isReturning ? "is-returning" : "",
                  swipeDirection ? `is-swiping-${swipeDirection}` : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <article
                    key={`${card.id}-${layer}`}
                    className={isTopCard ? topCardClasses : `welcome-card welcome-card-layer-${layer}`}
                    style={
                      isTopCard
                        ? ({
                            "--dragX": `${dragX}px`,
                            "--dragRotate": `${rotation}deg`,
                            "--passOpacity": `${passOpacity}`,
                            "--applyOpacity": `${applyOpacity}`,
                          } as CSSProperties)
                        : undefined
                    }
                    onPointerDown={isTopCard ? handleTopCardPointerDown : undefined}
                    onPointerMove={isTopCard ? handleTopCardPointerMove : undefined}
                    onPointerUp={isTopCard ? handleTopCardPointerEnd : undefined}
                    onPointerCancel={isTopCard ? handleTopCardPointerEnd : undefined}
                  >
                    <div className="welcome-swipe-cue welcome-swipe-cue-pass" aria-hidden>
                      PASS
                    </div>
                    <div className="welcome-swipe-cue welcome-swipe-cue-apply" aria-hidden>
                      MATCH
                    </div>

                    <header className="welcome-card-header">
                      <div
                        className="welcome-company-avatar"
                        style={{ background: card.avatarBg }}
                      >
                        <span>{card.company.charAt(0)}</span>
                      </div>
                      <div className="welcome-tech-info">
                        <span className="welcome-tech-category">{card.category}</span>
                        <h3 className="welcome-tech-name">{card.company}</h3>
                      </div>
                      <div className="welcome-verified-badge" title="Verified Safe Employer">
                        <ShieldCheck size={14} className="welcome-verified-icon" />
                        <span>Verified</span>
                      </div>
                    </header>

                    <div className="welcome-card-body">
                      <h2 className="welcome-card-role">{card.role}</h2>
                      <div className="welcome-metadata-grid">
                        <div className="welcome-meta-pill">
                          <LocationPinIcon size={16} />
                          <span>{card.location}</span>
                        </div>
                        <div className="welcome-meta-pill welcome-meta-pill--salary">
                          <Flame size={14} className="text-emerald-600" />
                          <span>{card.salary}</span>
                        </div>
                        <div className="welcome-meta-pill">
                          <CheckCircle2 size={14} className="text-slate-400" />
                          <span>{card.type}</span>
                        </div>
                        <div className="welcome-meta-pill">
                          <Zap size={14} className="text-amber-500" />
                          <span>{card.experience}</span>
                        </div>
                      </div>

                      <div className="welcome-tags">
                        {card.tags.map((tag, tagIndex) => (
                          <span key={tag} className={`welcome-tag ${tagIndex === 0 ? "active" : ""}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <footer
                      className="welcome-card-footer"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="welcome-btn-pass"
                        aria-label="Pass this role"
                        disabled={isAnimating}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerSwipe("left", false);
                        }}
                      >
                        <X size={18} strokeWidth={2.5} />
                        <span>Pass</span>
                      </button>
                      <button
                        type="button"
                        className="welcome-btn-apply"
                        aria-label="Match and Apply for this role"
                        disabled={isAnimating}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerSwipe("right", true);
                        }}
                      >
                        <ThumbsUp size={18} strokeWidth={2.2} />
                        <span>Match & Apply</span>
                      </button>
                    </footer>
                  </article>
                );
              })}
          </div>
        </section>
      </main>

      {/* Feature Pillars Footer */}
      <section className="welcome-pillars" aria-label="Key features">
        <div className="welcome-pillars-inner">
          <div className="welcome-pillar-card">
            <div className="welcome-pillar-icon welcome-pillar-icon--purple">
              <Zap size={22} />
            </div>
            <div className="welcome-pillar-content">
              <h3>Fast-Paced Swiping</h3>
              <p>Skip endless job boards. Make confident decisions in seconds with intuitive card stacks.</p>
            </div>
          </div>

          <div className="welcome-pillar-card">
            <div className="welcome-pillar-icon welcome-pillar-icon--green">
              <ShieldCheck size={22} />
            </div>
            <div className="welcome-pillar-content">
              <h3>Job Authenticity Guard</h3>
              <p>Advanced AI screens phantom jobs, suspicious recruitment scams, and salary traps.</p>
            </div>
          </div>

          <div className="welcome-pillar-card">
            <div className="welcome-pillar-icon welcome-pillar-icon--indigo">
              <Bot size={22} />
            </div>
            <div className="welcome-pillar-content">
              <h3>AI Resume Tailor</h3>
              <p>Instantly align your resume and cover letter with the exact job description.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
