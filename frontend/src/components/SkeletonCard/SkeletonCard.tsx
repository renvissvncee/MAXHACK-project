import styles from "./SkeletonCard.module.css";

export default function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.photo} />
      <div className={styles.body}>
        <div className={`${styles.line} ${styles.title}`} />
        <div className={`${styles.line} ${styles.meta}`} />
        <div className={`${styles.line} ${styles.text}`} />
        <div className={styles.tagsRow}>
          <div className={styles.tag} />
          <div className={styles.tag} />
        </div>
      </div>
    </div>
  );
}
