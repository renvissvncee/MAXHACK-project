import { Compass, Handshake, MapPinned, Users } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../components/Button/Button";
import SplashLoader from "../../components/SplashLoader/SplashLoader";
import { useUser } from "../../context/UserContext";
import { useIntroSeen } from "./useIntroSeen";
import styles from "./IntroCarousel.module.css";

interface Slide {
  id: string;
  accent: "a" | "b" | "c" | "d";
  icon: ReactNode;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    id: "live-local",
    accent: "a",
    icon: <Compass size={56} strokeWidth={1.4} />,
    title: "Живи как местный.",
    description: "Находи людей, которые готовы принять тебя у себя, и узнавай города изнутри.",
  },
  {
    id: "new-people",
    accent: "b",
    icon: <Users size={56} strokeWidth={1.4} />,
    title: "Новые города — новые люди",
    description: "Останавливайся у местных, знакомься и получай опыт, которого не даст обычный отель.",
  },
  {
    id: "trust",
    accent: "c",
    icon: <Handshake size={56} strokeWidth={1.4} />,
    title: "Открытые профили через MAX",
    description: "Вы всегда видите, к кому едете в гости — никаких анонимных анкет.",
  },
  {
    id: "go",
    accent: "d",
    icon: <MapPinned size={56} strokeWidth={1.4} />,
    title: "Куда отправимся?",
    description: "Найди место для следующего путешествия.",
  },
];

const SWIPE_THRESHOLD_RATIO = 0.18;

export default function IntroCarousel() {
  const navigate = useNavigate();
  const { user, status } = useUser();
  const { introSeen, markIntroSeen } = useIntroSeen();

  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // Drag state lives in refs, not React state: pointermove can fire 60-120x/s
  // on a phone, and running a full re-render (recreating all 4 slides, their
  // icons and blurred blobs) on every one of those events is what caused the
  // visible jank. Only `index` — committed once per swipe, on release — needs
  // to be real state; the live drag position is applied straight to the DOM.
  const dragStartX = useRef(0);
  const dragOffset = useRef(0);
  const isDragging = useRef(false);
  const containerWidth = useRef(0);

  const isLast = index === slides.length - 1;

  if (status === "loading") return <SplashLoader />;
  if (introSeen) {
    return <Navigate to={user && !user.onboardingCompleted ? "/profile-setup" : "/home"} replace />;
  }

  const applyTransform = (targetIndex: number, offset: number) => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateX(calc(${-targetIndex * (100 / slides.length)}% + ${offset}px))`;
  };

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(slides.length - 1, next)));
  };

  const finish = () => {
    markIntroSeen();
    if (user && !user.onboardingCompleted) {
      navigate("/profile-setup", { replace: true });
    } else {
      navigate("/home", { replace: true });
    }
  };

  const handleCta = () => {
    if (isLast) {
      finish();
    } else {
      goTo(index + 1);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
    dragOffset.current = 0;
    containerWidth.current = trackRef.current?.parentElement?.offsetWidth ?? window.innerWidth;
    isDragging.current = true;
    if (trackRef.current) trackRef.current.dataset.dragging = "true";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    let offset = event.clientX - dragStartX.current;
    if ((index === 0 && offset > 0) || (isLast && offset < 0)) {
      offset *= 0.35;
    }
    dragOffset.current = offset;
    applyTransform(index, offset);
  };

  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (trackRef.current) trackRef.current.dataset.dragging = "false";
    const threshold = containerWidth.current * SWIPE_THRESHOLD_RATIO;
    const offset = dragOffset.current;
    dragOffset.current = 0;
    if (offset < -threshold && !isLast) {
      goTo(index + 1);
    } else if (offset > threshold && index > 0) {
      goTo(index - 1);
    } else {
      applyTransform(index, 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") goTo(index + 1);
    if (event.key === "ArrowLeft") goTo(index - 1);
  };

  return (
    <div className="screen-shell">
      <div className={`screen ${styles.screen}`} tabIndex={0} onKeyDown={handleKeyDown} aria-roledescription="carousel">
        <div
          className={styles.viewport}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <div
            ref={trackRef}
            className={styles.track}
            data-dragging="false"
            style={{
              width: `${slides.length * 100}%`,
              transform: `translateX(${-index * (100 / slides.length)}%)`,
            }}
          >
            {slides.map((slide) => (
              <div key={slide.id} className={styles.slide} style={{ width: `${100 / slides.length}%` }}>
                <div className={styles.illustration} data-accent={slide.accent}>
                  <div className={styles.blobOne} />
                  <div className={styles.blobTwo} />
                  <div className={styles.illustrationIcon}>{slide.icon}</div>
                </div>
                <div className={styles.textBlock}>
                  <h1 className={styles.title}>{slide.title}</h1>
                  <p className={styles.description}>{slide.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.dots} role="tablist" aria-label="Экраны онбординга">
            {slides.map((slide, dotIndex) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={dotIndex === index}
                aria-label={`Экран ${dotIndex + 1}`}
                className={styles.dot}
                data-active={dotIndex === index || undefined}
                onClick={() => goTo(dotIndex)}
              />
            ))}
          </div>
          <Button size="lg" fullWidth onClick={handleCta}>
            {isLast ? "Начать" : "Далее"}
          </Button>
          <p className={styles.disclaimer}>Мини-приложение MAX · демо-версия MVP</p>
        </div>
      </div>
    </div>
  );
}
