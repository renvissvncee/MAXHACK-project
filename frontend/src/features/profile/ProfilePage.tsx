import { Moon, PenSquare, Sun } from "lucide-react";
import { useState } from "react";

import Avatar from "../../components/Avatar/Avatar";
import BottomSheet from "../../components/BottomSheet/BottomSheet";
import Button from "../../components/Button/Button";
import MyListing from "./MyListing";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useUser } from "../../context/UserContext";
import { getInterestLabel } from "../../data/interests";

import type { UserProfileDraft } from "../../types/user";
import ProfileFields from "./components/ProfileFields";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {

  const { user, updateProfile, isSaving } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<UserProfileDraft | null>(null);


  if (!user) return null;

  const openEdit = () => {
    setDraft({ name: user.name, city: user.city, bio: user.bio, interests: user.interests, photo: user.photo });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    try { await updateProfile(draft); setEditOpen(false); showToast("Профиль обновлён"); }
    catch (error) { showToast(error instanceof Error ? error.message : "Ошибка сохранения"); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <Avatar photo={user.photo} name={user.name} size={72} />
        <h1 className={styles.name}>{user.name}</h1>
        <p className={styles.city}>{user.city}</p>
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
        <MyListing />
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
        </div>
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


    </div>
  );
}
