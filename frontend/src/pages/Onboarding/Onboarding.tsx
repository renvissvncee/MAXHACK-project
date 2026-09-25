import { ArrowLeft, BadgeCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button/Button";
import ProfileForm from "../../components/ProfileForm/ProfileForm";
import { avatarChoices } from "../../data/onboardingOptions";
import { useUser } from "../../context/UserContext";
import type { UserDraft } from "../../types/user";
import styles from "./Onboarding.module.css";

const initialDraft: UserDraft = {
  name: "",
  city: "",
  bio: "",
  interests: [],
  avatarEmoji: avatarChoices[0].emoji,
  avatarColor: avatarChoices[0].color,
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { createProfile } = useUser();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [draft, setDraft] = useState<UserDraft>(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const isValid = draft.name.trim().length > 0 && draft.city.trim().length > 0 && draft.interests.length > 0;

  const handleContinue = () => {
    setTouched(true);
    if (!isValid) return;
    setStep("verify");
  };

  const handleFinish = async () => {
    setSubmitting(true);
    await createProfile(draft);
    navigate("/home", { replace: true });
  };

  return (
    <div className="screen-shell">
      <div className={`screen ${styles.screen}`}>
        <div className={styles.header}>
          {step === "form" ? (
            <button type="button" className={styles.back} onClick={() => navigate("/")} aria-label="Назад">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button type="button" className={styles.back} onClick={() => setStep("form")} aria-label="Назад">
              <ArrowLeft size={20} />
            </button>
          )}
          <span className={styles.step}>{step === "form" ? "Шаг 1 из 2" : "Шаг 2 из 2"}</span>
        </div>

        {step === "form" ? (
          <div className={styles.content}>
            <h1 className={styles.title}>Расскажите о себе</h1>
            <p className={styles.subtitle}>Эти данные увидят другие путешественники и хозяева.</p>
            <ProfileForm value={draft} onChange={setDraft} />
            {touched && !isValid && (
              <p className={styles.error}>Заполните имя, город и выберите хотя бы один интерес.</p>
            )}
          </div>
        ) : (
          <div className={styles.verifyContent}>
            <div className={styles.verifyIcon}>
              <ShieldCheck size={40} strokeWidth={1.6} />
            </div>
            <h1 className={styles.title}>Профиль подтверждён</h1>
            <p className={styles.subtitle}>
              Это демонстрационная верификация в рамках MVP: в реальном продукте подтверждение личности будет
              происходить через аккаунт MAX.
            </p>
            <div className={styles.summaryCard}>
              <BadgeCheck size={18} />
              <div>
                <strong>{draft.name || "Гость"}</strong>
                <span>{draft.city || "Город не указан"}</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          {step === "form" ? (
            <Button size="lg" fullWidth onClick={handleContinue}>
              Продолжить
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={handleFinish} loading={submitting}>
              Перейти в приложение
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
