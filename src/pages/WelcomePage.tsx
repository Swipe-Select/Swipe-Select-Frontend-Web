import { type CSSProperties, type PointerEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  ShieldCheck, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Briefcase, 
  Compass, 
  Zap,
  ThumbsUp,
  X
} from "lucide-react";
import "./WelcomePage.css";

type SwipeDirection = "left" | "right";

type WelcomeCard = {
  id: string;
  match: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  type: string;
  experience: string;
  tags: string[];
};

const SWIPE_THRESHOLD = 90;
const MAX_DRAG = 260;
const DRAG_DEADZONE = 12;

const dummyCards: WelcomeCard[] = [
  {
    id: "google-designer",
    match: "98% Match",
    company: "Google",
    role: "Senior Product Designer",
    location: "Mountain View, CA (Hybrid)",
    salary: "$180k - $240k",
    type: "Full-time",
    experience: "5+ years exp",
    tags: ["Figma", "Design Systems", "Prototyping", "UI/UX"],
  },
  {
    id: "airbnb-ux",
    match: "96% Match",
    company: "Airbnb",
    role: "Lead UX Designer",
    location: "San Francisco, CA (Hybrid)",
    salary: "$165k - $225k",
    type: "Full-time",
    experience: "6+ years exp",
    tags: ["User Research", "Design Ops", "Accessibility"],
  },
  {
    id: "spotify-product",
    match: "95% Match",
    company: "Spotify",
    role: "Product Design Manager",
    location: "New York, NY (Remote)",
    salary: "$170k - $210k",
    type: "Full-time",
    experience: "7+ years exp",
    tags: ["Mobile UX", "Experimentation", "Mentorship"],
  },
  {
    id: "stripe-designer",
    match: "94% Match",
    company: "Stripe",
    role: "Staff Product Designer",
    location: "Seattle, WA (Hybrid)",
    salary: "$185k - $245k",
    type: "Full-time",
    experience: "8+ years exp",
    tags: ["Payments UX", "Data Viz", "Interaction Design"],
  },
  {
    id: "notion-visual",
    match: "93% Match",
    company: "Notion",
    role: "Senior Visual Designer",
    location: "Austin, TX (Remote)",
    salary: "$150k - $195k",
    type: "Full-time",
    experience: "5+ years exp",
    tags: ["Brand Systems", "UI Craft", "Motion Design"],
  },
  {
    id: "figma-growth",
    match: "97% Match",
    company: "Figma",
    role: "Growth Product Designer",
    location: "Boston, MA (Hybrid)",
    salary: "$160k - $205k",
    type: "Full-time",
    experience: "4+ years exp",
    tags: ["Growth UX", "A/B Testing", "Onboarding"],
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
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
  const [shouldNavigateAfterSwipe, setShouldNavigateAfterSwipe] = useState(false);

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
    setShouldNavigateAfterSwipe(navigateAfter);
  };

  const handleTopCardPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isAnimating) return;
    event.currentTarget.setPointerCapture(event.pointerId);
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

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    setDragStartX(null);
    setDragStartY(null);
    setActivePointerId(null);

    if (dragX <= -SWIPE_THRESHOLD) {
      triggerSwipe("left");
      return;
    }
    if (dragX >= SWIPE_THRESHOLD) {
      triggerSwipe("right");
      return;
    }

    setIsReturning(true);
    setDragX(0);
    window.setTimeout(() => setIsReturning(false), 220);
  };

  const handleSwipeAnimationEnd = () => {
    if (!swipeDirection) return;
    setCurrentIndex((prev) => (prev + 1) % dummyCards.length);
    setSwipeDirection(null);
    setDragX(0);
    setIsReturning(false);
    setIsAnimating(false);

    if (shouldNavigateAfterSwipe) {
      setShouldNavigateAfterSwipe(false);
      navigate("/signup");
    }
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
            Experience the Tinder of job search. Powered by <strong>ModernBERT</strong> to screen out fake postings and <strong>Qwen2.5-3B</strong> to tailor ATS-optimized resumes in seconds.
          </p>

          <div className="welcome-actions">
            <Link to="/signup" className="welcome-action-primary">
              <span>Start Swiping Now</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="welcome-action-secondary">
              Sign In
            </Link>
          </div>

          {/* Trust & Model Badges */}
          <div className="welcome-trust-row">
            <div className="welcome-trust-item">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span>ModernBERT Fraud Detection</span>
            </div>
            <div className="welcome-trust-item">
              <Bot size={18} className="text-indigo-500" />
              <span>Qwen2.5-3B Edge AI Model</span>
            </div>
            <div className="welcome-trust-item">
              <Zap size={18} className="text-amber-500" />
              <span>Live Multi-Platform Scraper</span>
            </div>
          </div>
        </section>

        <section className="welcome-visual" aria-label="Featured match preview">
          {/* Floating feature pills */}
          <div className="welcome-float-chip welcome-float-chip--top">
            <Sparkles size={14} className="text-indigo-600" />
            <span>AI Match Score: 98%</span>
          </div>
          <div className="welcome-float-chip welcome-float-chip--bottom">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>✓ Verified Safe Employer</span>
          </div>

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
                    onAnimationEnd={isTopCard ? handleSwipeAnimationEnd : undefined}
                  >
                    <div className="welcome-swipe-cue welcome-swipe-cue-pass" aria-hidden>
                      PASS
                    </div>
                    <div className="welcome-swipe-cue welcome-swipe-cue-apply" aria-hidden>
                      MATCH
                    </div>
                    <div className="welcome-match-badge">
                      <Sparkles size={14} />
                      <span>{card.match}</span>
                    </div>

                    <header className="welcome-card-header">
                      <div className="welcome-tech-avatar">
                        <Briefcase size={24} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="welcome-tech-label">Featured Company</p>
                        <p className="welcome-tech-name">{card.company}</p>
                      </div>
                    </header>

                    <div className="welcome-card-body">
                      <h2>{card.role}</h2>
                      <div className="welcome-metadata-grid">
                        <p>
                          <Compass size={15} />
                          {card.location}
                        </p>
                        <p>
                          <Flame size={15} />
                          <strong>{card.salary}</strong>
                        </p>
                        <p>
                          <CheckCircle2 size={15} />
                          {card.type}
                        </p>
                        <p>
                          <Zap size={15} />
                          {card.experience}
                        </p>
                      </div>

                      <div className="welcome-tags">
                        {card.tags.map((tag, tagIndex) => (
                          <span key={tag} className={`welcome-tag ${tagIndex === 0 ? "active" : ""}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <footer className="welcome-card-footer">
                      <button
                        type="button"
                        className="welcome-btn-pass"
                        aria-label="Pass this role"
                        disabled={isAnimating}
                        onClick={() => triggerSwipe("left")}
                      >
                        <X size={18} />
                        Pass
                      </button>
                      <button
                        type="button"
                        className="welcome-btn-apply"
                        aria-label="Apply for this role"
                        disabled={isAnimating}
                        onClick={() => triggerSwipe("right", true)}
                      >
                        <ThumbsUp size={18} />
                        Match & Apply
                      </button>
                    </footer>
                  </article>
                );
              })}
          </div>

          <p className="welcome-swipe-hint">
            💡 <em>Drag card left/right or click buttons to test swiping</em>
          </p>
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
              <h3>ModernBERT Authenticity Guard</h3>
              <p>Transformer AI screens phantom jobs, suspicious recruitment scams, and salary traps.</p>
            </div>
          </div>

          <div className="welcome-pillar-card">
            <div className="welcome-pillar-icon welcome-pillar-icon--indigo">
              <Bot size={22} />
            </div>
            <div className="welcome-pillar-content">
              <h3>Qwen2.5-3B Resume Tailor</h3>
              <p>Instantly align your resume and cover letter with the exact job description.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
