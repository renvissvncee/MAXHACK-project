import { avatarChoices, interestChoices } from "../../data/onboardingOptions";
import type { UserDraft } from "../../types/user";
import Avatar from "../Avatar/Avatar";
import Tag from "../Tag/Tag";
import styles from "./ProfileForm.module.css";

interface ProfileFormProps {
  value: UserDraft;
  onChange: (next: UserDraft) => void;
}

export default function ProfileForm({ value, onChange }: ProfileFormProps) {
  const toggleInterest = (interest: string) => {
    const has = value.interests.includes(interest);
    const nextInterests = has
      ? value.interests.filter((item) => item !== interest)
      : [...value.interests, interest];
    onChange({ ...value, interests: nextInterests });
  };

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <span className={styles.label}>Аватар</span>
        <div className={styles.avatarGrid}>
          {avatarChoices.map((choice) => (
            <button
              key={choice.emoji}
              type="button"
              className={styles.avatarOption}
              data-active={value.avatarEmoji === choice.emoji || undefined}
              onClick={() => onChange({ ...value, avatarEmoji: choice.emoji, avatarColor: choice.color })}
              aria-label={`Выбрать аватар ${choice.emoji}`}
            >
              <Avatar emoji={choice.emoji} color={choice.color} size={44} />
            </button>
          ))}
        </div>
      </div>

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
        <div className={styles.chips}>
          {interestChoices.map((interest) => (
            <Tag key={interest} active={value.interests.includes(interest)} onClick={() => toggleInterest(interest)}>
              {interest}
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );
}
