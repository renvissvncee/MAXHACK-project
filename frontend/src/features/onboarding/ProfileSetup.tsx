import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../components/Button/Button";
import VerifiedBadge from "../../components/Badge/Badge";
import Avatar from "../../components/Avatar/Avatar";
import SplashLoader from "../../components/SplashLoader/SplashLoader";
import ProfileFields from "../profile/components/ProfileFields";
import { useUser } from "../../context/UserContext";
import type { UserProfileDraft } from "../../types/user";
import { useIntroSeen } from "./useIntroSeen";
import styles from "./ProfileSetup.module.css";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, status, completeOnboarding, isSaving } = useUser();
  const { introSeen } = useIntroSeen();

  const [draft, setDraft] = useState<UserProfileDraft>({ name: "", city: "", bio: "", interests: [], photo: null });
  const [step, setStep] = useState<"form" | "done">("form");
  const [touched, setTouched] = useState(false);
  const seededFromUser = useRef(false);

  useEffect(() => {
    if (user && !seededFromUser.current) {
      setDraft({ name: user.name, city: user.city, bio: user.bio, interests: user.interests, photo: user.photo });
      seededFromUser.current = true;
    }
  }, [user]);

  if (status === "loading") return <SplashLoader />;
  if (!introSeen) return <Navigate to="/" replace />;
  if (user?.onboardingCompleted) return <Navigate to="/home" replace />;

  const isValid = draft.name.trim().length > 0 && draft.city.trim().length > 0 && draft.interests.length > 0;

  const handleContinue = () => {
    setTouched(true);
    if (!isValid) return;
    setStep("done");
  };

  const handleFinish = async () => {
    await completeOnboarding(draft);
    navigate("/home", { replace: true });
  };

  return (
    <div className="screen-shell">
      <div className={`screen ${styles.screen}`}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.back}
            onClick={() => (step === "form" ? navigate(-1) : setStep("form"))}
            aria-label="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <span className={styles.step}>{step === "form" ? "Профиль" : "Готово"}</span>
        </div>

        {step === "form" ? (
          <div className={styles.content}>
            <h1 className={styles.title}>Расскажите о себе</h1>
            <p className={styles.subtitle}>
              Часть данных мы уже получили из вашего аккаунта MAX — проверьте и при желании измените их.
            </p>
            <ProfileFields value={draft} onChange={setDraft} />
            {touched && !isValid && (
              <p className={styles.error}>Заполните имя, город и выберите хотя бы один интерес.</p>
            )}
          </div>
        ) : (
          <div className={styles.verifyContent}>
            <Avatar photo={draft.photo} name={draft.name} size={84} className={styles.verifyAvatar} />
            <h1 className={styles.title}>Профиль сохранён</h1>
            <p className={styles.subtitle}>
              Доступ к «Приюту» дают верифицированные аккаунты MAX — для демо мы считаем ваш аккаунт уже
              подтверждённым.
            </p>
            <div className={styles.summaryCard}>
              <ShieldCheck size={18} />
              <div>
                <strong>{draft.name || "Гость"}</strong>
                <span>{draft.city || "Город не указан"}</span>
              </div>
              <VerifiedBadge size="sm" />
            </div>
          </div>
        )}

        <div className={styles.footer}>
          {step === "form" ? (
            <Button size="lg" fullWidth onClick={handleContinue}>
              Продолжить
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={handleFinish} loading={isSaving}>
              Перейти в приложение
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
