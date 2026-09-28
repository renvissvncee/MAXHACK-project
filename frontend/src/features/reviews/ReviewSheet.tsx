import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import BottomSheet from "../../components/BottomSheet/BottomSheet";
import Button from "../../components/Button/Button";
import { useToast } from "../../context/ToastContext";
import { getOwnReview, saveReview } from "../../services/reviewsService";
import type { RequestParty } from "../../types/request";
import styles from "./ReviewSheet.module.css";

interface ReviewSheetProps {
  subject: RequestParty | null;
  onClose: () => void;
}

export default function ReviewSheet({ subject, onClose }: ReviewSheetProps) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!subject) return;
    let cancelled = false;
    setLoading(true);
    getOwnReview(subject.id).then((review) => {
      if (cancelled) return;
      setRating(review?.rating ?? 5);
      setText(review?.text ?? "");
    }).catch((error) => {
      if (!cancelled) showToast(error instanceof Error ? error.message : "Не удалось загрузить отзыв.", "info");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subject, showToast]);

  const submit = async () => {
    if (!subject) return;
    setSaving(true);
    try {
      await saveReview(subject.id, rating, text);
      showToast("Отзыв сохранён.");
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось сохранить отзыв.", "info");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={Boolean(subject)} onClose={onClose} title={`Отзыв о ${subject?.name ?? "собеседнике"}`}
      footer={<Button size="lg" fullWidth loading={saving || loading} onClick={() => void submit()}>Сохранить отзыв</Button>}>
      <div className={styles.form} aria-busy={loading}>
        <p>Оцените опыт общения. Отзыв можно будет отредактировать.</p>
        <div className={styles.stars} role="radiogroup" aria-label="Оценка">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" role="radio" aria-checked={rating === value}
              onClick={() => setRating(value)} disabled={loading} aria-label={`${value} из 5`}>
              <Star size={30} fill={value <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <label>
          <span>Комментарий</span>
          <textarea rows={5} maxLength={2000} value={text} disabled={loading}
            placeholder="Что было важно в вашем общении?" onChange={(event) => setText(event.target.value)} />
        </label>
      </div>
    </BottomSheet>
  );
}
