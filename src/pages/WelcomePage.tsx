import { type CSSProperties, type PointerEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { welcomeAssets } from "../figma/welcomeAssets";
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
    tags: ["Figma", "Design Systems", "Prototyping", "+3 more"],
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
    tags: ["User Research", "Design Ops", "Accessibility", "+2 more"],
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
    tags: ["Mobile UX", "Experimentation", "Mentorship", "+4 more"],
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
    tags: ["Payments UX", "Data Viz", "Interaction Design", "+3 more"],
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
    tags: ["Brand Systems", "UI Craft", "Motion Design", "+2 more"],
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
    tags: ["Growth UX", "A/B Testing", "Onboarding", "+3 more"],
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
  const [isHorizontalDrag, setIsHorizontalDrag] = useState(false);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const [shouldNavigateAfterSwipe, setShouldNavigateAfterSwipe] = useState(false);

  const stackCards = useMemo(
    () =>
      [0, 1, 2].map((offset) => dummyCards[(currentIndex + offset) % dummyCards.length]),
    [currentIndex],
  );

  const triggerSwipe = (direction: SwipeDirection, navigateAfter = false) => {
    if (isAnimating) {
      return;
    }

    setIsDragging(false);
    setIsReturning(false);
    setIsAnimating(true);
    setSwipeDirection(direction);
    setDragX(direction === "left" ? -MAX_DRAG : MAX_DRAG);
    setShouldNavigateAfterSwipe(navigateAfter);
  };

  const handleTopCardPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isAnimating) {
      return;
    }

    const targetNode = event.target as HTMLElement;
    if (targetNode.closest("button, a")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setActivePointerId(event.pointerId);
    setDragStartX(event.clientX);
    setDragStartY(event.clientY);
    setIsDragging(true);
    setIsHorizontalDrag(false);
    setIsReturning(false);
  };

  const handleTopCardPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      !isDragging ||
      dragStartX === null ||
      dragStartY === null ||
      isAnimating ||
      (activePointerId !== null && event.pointerId !== activePointerId)
    ) {
      return;
    }

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    if (!isHorizontalDrag) {
      if (Math.abs(deltaX) < DRAG_DEADZONE && Math.abs(deltaY) < DRAG_DEADZONE) {
        return;
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.1) {
        return;
      }

      setIsHorizontalDrag(true);
    }

    const nextDragX = deltaX;
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, nextDragX));
    setDragX(clamped);
  };

  const handleTopCardPointerEnd = (event: PointerEvent<HTMLElement>) => {
    if (!isDragging || isAnimating) {
      return;
    }

    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }

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
    if (!swipeDirection) {
      return;
    }

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
      <main className="welcome-main">
        <section className="welcome-copy" aria-label="Intro">
          <h1 className="welcome-title">Ready?</h1>
          <p className="welcome-highlight">1.5 million</p>
          <p className="welcome-subtitle">jobs are waiting for you</p>

          <p className="welcome-description">
            Discover opportunities tailored to your unique professional profile. Our
            AI-driven matching engine analyzes your skills, experience, and
            preferences to connect you with your ideal next role.
          </p>

          <div className="welcome-actions">
            <Link to="/signup" className="welcome-action-primary">
              <span>Start Swiping</span>
              <img src={welcomeAssets.startArrow} alt="" width={16} height={16} />
            </Link>
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
                    onAnimationEnd={isTopCard ? handleSwipeAnimationEnd : undefined}
                  >
                    <div className="welcome-swipe-cue welcome-swipe-cue-pass" aria-hidden>
                      PASS
                    </div>
                    <div className="welcome-swipe-cue welcome-swipe-cue-apply" aria-hidden>
                      APPLY
                    </div>
                    <div className="welcome-match-badge">
                      <img src={welcomeAssets.match} alt="" width={12} height={12} />
                      <span>{card.match}</span>
                    </div>

                    <header className="welcome-card-header">
                      <div className="welcome-tech-avatar">
                        <img src={welcomeAssets.techIcon} alt="" width={30} height={27} />
                      </div>
                      <div>
                        <p className="welcome-tech-label">Technology</p>
                        <p className="welcome-tech-name">{card.company}</p>
                      </div>
                    </header>

                    <div className="welcome-card-body">
                      <h2>{card.role}</h2>
                      <div className="welcome-metadata-grid">
                        <p>
                          <img src={welcomeAssets.location} alt="" width={14} height={17} />
                          {card.location}
                        </p>
                        <p>
                          <img src={welcomeAssets.salary} alt="" width={18} height={13} />
                          <strong>{card.salary}</strong>
                        </p>
                        <p>
                          <img src={welcomeAssets.type} alt="" width={17} height={17} />
                          {card.type}
                        </p>
                        <p>
                          <img src={welcomeAssets.experience} alt="" width={18} height={18} />
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
                        <img src={welcomeAssets.pass} alt="" width={14} height={14} />
                        Pass
                      </button>
                      <button
                        type="button"
                        className="welcome-btn-apply"
                        aria-label="Apply for this role"
                        disabled={isAnimating}
                        onClick={() => triggerSwipe("right", true)}
                      >
                        <img src={welcomeAssets.apply} alt="" width={20} height={18} />
                        Apply
                      </button>
                    </footer>

                    <div className="welcome-floating-hint" aria-hidden>
                      <img src={welcomeAssets.floating} alt="" width={25} height={26} />
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      </main>
    </div>
  );
}
