import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../components/Button/Button";
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

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValid) return;
    await completeOnboarding(draft);
    navigate("/home", { replace: true });
  };

  return (
    <div className="screen-shell">
      <div className={`screen ${styles.screen}`}>
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

        <div className={styles.footer}>
          <Button size="lg" fullWidth onClick={handleSubmit} loading={isSaving}>
            Сохранить и продолжить
          </Button>
        </div>
      </div>
    </div>
  );
}
