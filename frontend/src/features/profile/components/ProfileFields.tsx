import type { UserProfileDraft } from "../../../types/user";
import InterestChips from "./InterestChips";
import Avatar from "../../../components/Avatar/Avatar";
import styles from "./ProfileFields.module.css";

interface ProfileFieldsProps {
  value: UserProfileDraft;
  onChange: (next: UserProfileDraft) => void;
}

export default function ProfileFields({ value, onChange }: ProfileFieldsProps) {
  const toggleInterest = (id: string) => {
    const has = value.interests.includes(id);
    const nextInterests = has ? value.interests.filter((item) => item !== id) : [...value.interests, id];
    onChange({ ...value, interests: nextInterests });
  };

  return (
    <div className={styles.form}>
      <Avatar photo={value.photo} name={value.name} size={72} />
      <p>Фото из аккаунта MAX. Загрузка своего фото пока недоступна.</p>

      <label className={styles.field}>
        <span className={styles.label}>Имя</span>
        <input
          className={styles.input}
          type="text"
          value={value.name}
          maxLength={40}
          placeholder="Например, Анна"
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Город</span>
        <input
          className={styles.input}
          type="text"
          value={value.city}
          maxLength={40}
          placeholder="Например, Москва"
          onChange={(event) => onChange({ ...value, city: event.target.value })}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>О себе</span>
        <textarea
          className={styles.textarea}
          value={value.bio}
          maxLength={220}
          rows={3}
          placeholder="Пара слов о себе — кто вы, чем увлекаетесь, почему путешествуете"
          onChange={(event) => onChange({ ...value, bio: event.target.value })}
        />
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Интересы</span>
        <InterestChips selected={value.interests} onToggle={toggleInterest} />
      </div>
    </div>
  );
}
