import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PhotoPlaceholder from "../PhotoPlaceholder/PhotoPlaceholder";
import RatingStars from "../RatingStars/RatingStars";
import Tag from "../Tag/Tag";
import type { Listing } from "../../types/listing";
import styles from "./ListingCard.module.css";

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const navigate = useNavigate();

  return (
    <article
      className={styles.card}
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/listing/${listing.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter") navigate(`/listing/${listing.id}`);
      }}
    >
      <div className={styles.photoWrap}>
        <PhotoPlaceholder variant={listing.photos[0]} className={styles.photo} />
      </div>
      <div className={styles.body}>
        <div className={styles.topRow}>
          <h3 className={styles.title}>{listing.title}</h3>
          <RatingStars rating={listing.rating} />
        </div>
        <p className={styles.meta}>
          {listing.city} · {listing.host.name}
        </p>
        <p className={styles.description}>{listing.shortDescription}</p>
        <div className={styles.tags}>
          <Tag>
            <Users size={12} style={{ marginRight: 4 }} />
            {listing.guests} {listing.guests === 1 ? "гость" : "гостя"}
          </Tag>
          {listing.tags.slice(0, 2).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>
    </article>
  );
}
