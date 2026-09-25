import { ShieldCheck, Sparkles, Users2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button/Button";
import SplashLoader from "../../components/SplashLoader/SplashLoader";
import { useUser } from "../../context/UserContext";
import styles from "./Welcome.module.css";

export default function Welcome() {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/home", { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || user) return <SplashLoader />;

  return (
    <div className="screen-shell">
      <div className={`screen ${styles.screen}`}>
        <div className={styles.hero}>
          <div className={styles.logo}>🏠</div>
          <h1 className={styles.name}>Приют</h1>
          <p className={styles.tagline}>Путешествуй. Знакомься. Живи как местный.</p>
        </div>

        <div className={styles.valueCard}>
          <p className={styles.valueText}>
            Находи гостеприимных хозяев по всей России и останавливайся у людей, а не в отелях —
            дёшево, по-человечески и с местным колоритом.
          </p>
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <ShieldCheck size={18} />
            <span>Доступ только для верифицированных пользователей</span>
          </div>
          <div className={styles.feature}>
            <Users2 size={18} />
            <span>Реальные хозяева из вашего города и других</span>
          </div>
          <div className={styles.feature}>
            <Sparkles size={18} />
            <span>Простой и безопасный первый контакт</span>
          </div>
        </div>

        <div className={styles.footer}>
          <Button size="lg" fullWidth onClick={() => navigate("/onboarding")}>
            Начать
          </Button>
          <p className={styles.disclaimer}>Мини-приложение MAX · демо-версия MVP</p>
        </div>
      </div>
    </div>
  );
}
