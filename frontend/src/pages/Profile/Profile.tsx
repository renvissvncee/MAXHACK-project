import { Home, LogOut, Moon, PenSquare, Sun } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import BottomSheet from "../../components/BottomSheet/BottomSheet";
import Button from "../../components/Button/Button";
import ProfileForm from "../../components/ProfileForm/ProfileForm";
import StateView from "../../components/StateView/StateView";
import Tag from "../../components/Tag/Tag";
import VerifiedBadge from "../../components/Badge/Badge";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useUser } from "../../context/UserContext";
import type { UserDraft } from "../../types/user";
import styles from "./Profile.module.css";

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const openEdit = () => {
    setDraft({
      name: user.name,
      city: user.city,
      bio: user.bio,
      interests: user.interests,
      avatarEmoji: user.avatarEmoji,
      avatarColor: user.avatarColor,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    setSaving(true);
    await updateProfile(draft);
    setSaving(false);
    setEditOpen(false);
    showToast("Профиль обновлён");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <Avatar emoji={user.avatarEmoji} color={user.avatarColor} size={72} />
        <h1 className={styles.name}>{user.name}</h1>
        <p className={styles.city}>{user.city}</p>
        {user.verified && <VerifiedBadge />}
        {user.bio && <p className={styles.bio}>{user.bio}</p>}
        {user.interests.length > 0 && (
          <div className={styles.interests}>
            {user.interests.map((interest) => (
              <Tag key={interest}>{interest}</Tag>
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
          <button type="button" className={`${styles.settingRow} ${styles.danger}`} onClick={handleLogout}>
            <span className={styles.settingLabel}>
              <LogOut size={18} />
              Выйти
            </span>
          </button>
        </div>
      </section>

      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Редактировать профиль"
        footer={
          <Button size="lg" fullWidth onClick={saveEdit} loading={saving}>
            Сохранить
          </Button>
        }
      >
        {draft && <ProfileForm value={draft} onChange={setDraft} />}
      </BottomSheet>
    </div>
  );
}
