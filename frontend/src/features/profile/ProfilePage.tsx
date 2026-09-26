import { Home, Moon, PenSquare, RotateCcw, Sun } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import BottomSheet from "../../components/BottomSheet/BottomSheet";
import Button from "../../components/Button/Button";
import StateView from "../../components/StateView/StateView";
import VerifiedBadge from "../../components/Badge/Badge";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useUser } from "../../context/UserContext";
import { getInterestLabel } from "../../data/interests";
import type { UserProfileDraft } from "../../types/user";
import ProfileFields from "./components/ProfileFields";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, resetDemoProfile, isSaving } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<UserProfileDraft | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  if (!user) return null;

  const openEdit = () => {
    setDraft({ name: user.name, city: user.city, bio: user.bio, interests: user.interests, photo: user.photo });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    await updateProfile(draft);
    setEditOpen(false);
    showToast("Профиль обновлён");
  };

  const handleReset = async () => {
    setConfirmResetOpen(false);
    await resetDemoProfile();
    navigate("/profile-setup", { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <Avatar photo={user.photo} name={user.name} size={72} />
        <h1 className={styles.name}>{user.name}</h1>
        <p className={styles.city}>{user.city}</p>
        {user.verified ? (
          <VerifiedBadge />
        ) : (
          <span className={styles.unverified}>Верификация не завершена</span>
        )}
        {user.bio && <p className={styles.bio}>{user.bio}</p>}
        {user.interests.length > 0 && (
          <div className={styles.interests}>
            {user.interests.map((id) => (
              <span key={id} className={styles.interestChip}>
                {getInterestLabel(id)}
              </span>
            ))}
          </div>
        )}
        <Button variant="outline" icon={<PenSquare size={16} />} onClick={openEdit}>
          Редактировать профиль
        </Button>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Мои варианты</h2>
        <StateView
          icon={<Home size={26} strokeWidth={1.6} />}
          title="Вы ещё не добавили варианты"
          description="Как хозяин вы сможете предложить размещение путешественникам — эта возможность появится в следующей версии."
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Настройки</h2>
        <div className={styles.settingsList}>
          <button type="button" className={styles.settingRow} onClick={toggleTheme}>
            <span className={styles.settingLabel}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              Тёмная тема
            </span>
            <span className={styles.switch} data-on={theme === "dark" || undefined} />
          </button>
          <button
            type="button"
            className={`${styles.settingRow} ${styles.muted}`}
            onClick={() => setConfirmResetOpen(true)}
          >
            <span className={styles.settingLabel}>
              <RotateCcw size={18} />
              Сбросить демо-профиль
            </span>
          </button>
        </div>
        <p className={styles.settingsHint}>
          Это демо-действие для тестирования онбординга — в реальном MAX-аккаунте его не будет.
        </p>
      </section>

      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Редактировать профиль"
        footer={
          <Button size="lg" fullWidth onClick={saveEdit} loading={isSaving}>
            Сохранить
          </Button>
        }
      >
        {draft && <ProfileFields value={draft} onChange={setDraft} />}
      </BottomSheet>

      <BottomSheet
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="Сбросить демо-профиль?"
        footer={
          <div className={styles.confirmActions}>
            <Button variant="outline" fullWidth onClick={() => setConfirmResetOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" fullWidth onClick={handleReset}>
              Сбросить
            </Button>
          </div>
        }
      >
        <p className={styles.confirmText}>
          Локальные данные профиля будут удалены, и вы снова пройдёте экран «Расскажите о себе». Это полезно для
          повторного тестирования сценария, реального аккаунта MAX это не затронет.
        </p>
      </BottomSheet>
    </div>
  );
}
