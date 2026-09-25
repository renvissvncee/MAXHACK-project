import { Star } from "lucide-react";
import styles from "./RatingStars.module.css";

interface RatingStarsProps {
  rating: number;
  reviewsCount?: number;
  size?: number;
}

export default function RatingStars({ rating, reviewsCount, size = 14 }: RatingStarsProps) {
  return (
    <span className={styles.rating}>
      <Star size={size} className={styles.star} fill="currentColor" strokeWidth={0} />
      <span className={styles.value}>{rating.toFixed(1)}</span>
      {typeof reviewsCount === "number" && <span className={styles.count}>({reviewsCount})</span>}
    </span>
  );
}
