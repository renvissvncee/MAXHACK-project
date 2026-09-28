import { ArrowLeft, MessageSquareText, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import StateView from "../../components/StateView/StateView";
import { getReviews } from "../../services/reviewsService";
import type { ReviewPage } from "../../types/review";
import { pluralRu } from "../../utils/plural";
import styles from "./Reviews.module.css";

const REVIEW_FORMS = ["отзыв", "отзыва", "отзывов"] as const;

export default function Reviews() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<ReviewPage | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    setError(false);
    getReviews(userId).then((result) => setPage(result))
      .catch(() => setError(true));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад"><ArrowLeft size={20} /></button>
        <div><p>Репутация</p><h1>Отзывы</h1></div>
      </header>
      {error && (
        <StateView
          tone="danger"
          icon={<MessageSquareText size={28} />}
          title="Не удалось загрузить отзывы"
          description="Проверьте соединение и попробуйте ещё раз."
          actionLabel="Повторить"
          onAction={load}
        />
      )}
      {!error && !page && <p className={styles.loading}>Загружаем отзывы…</p>}
      {page && <>
        <section className={styles.summary}>
          <Star size={24} fill="currentColor" />
          <strong>{page.rating ?? "—"}</strong>
          <span>{page.reviewsCount} {pluralRu(page.reviewsCount, REVIEW_FORMS)}</span>
        </section>
        {page.items.length === 0 ? (
          <StateView icon={<MessageSquareText size={28} />} title="Отзывов пока нет" description="Они появятся после принятых заявок и общения." />
        ) : <div className={styles.list}>{page.items.map((review) => (
          <article key={review.id} className={styles.card}>
            <div className={styles.author}>
              <Avatar emoji={review.author.avatarEmoji} color={review.author.avatarColor} name={review.author.name} size={42} />
              <div><strong>{review.author.name}</strong><span>{review.author.city}</span></div>
              <span className={styles.rating}><Star size={13} fill="currentColor" /> {review.rating}</span>
            </div>
            {review.text && <p>{review.text}</p>}
          </article>
        ))}</div>}
      </>}
    </main>
  );
}
