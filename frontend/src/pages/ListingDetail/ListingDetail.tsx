import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Calendar,
  CheckCircle2,
  Heart,
  ListChecks,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import BottomSheet from "../../components/BottomSheet/BottomSheet";
import Button from "../../components/Button/Button";
import PhotoPlaceholder from "../../components/PhotoPlaceholder/PhotoPlaceholder";
import RatingStars from "../../components/RatingStars/RatingStars";
import StateView from "../../components/StateView/StateView";
import Tag from "../../components/Tag/Tag";
import { useToast } from "../../context/ToastContext";
import { isFavorite, toggleFavorite } from "../../services/favoritesService";
import { getListingById } from "../../services/listingsService";
import { accommodationTypeLabels, type Listing } from "../../types/listing";
import styles from "./ListingDetail.module.css";

type Status = "loading" | "success" | "error";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [status, setStatus] = useState<Status>("loading");
  const [listing, setListing] = useState<Listing | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus("loading");
    getListingById(id).then((result) => {
      if (cancelled) return;
      if (result) {
        setListing(result);
        setFavorite(isFavorite(result.id));
        setStatus("success");
      } else {
        setStatus("error");
      }
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleFavorite = () => {
    if (!listing) return;
    setFavorite(toggleFavorite(listing.id));
  };

  const handleRequest = async () => {
    setSending(false);
    showToast("Заявки и взаимные знакомства ещё не подключены.");
  };

  const closeRequest = () => {
    setRequestOpen(false);
    if (sent) {
      showToast("Демо-запрос отправлен хозяину. В реальном приложении здесь откроется чат.");
    }
    window.setTimeout(() => setSent(false), 300);
  };

  if (status === "loading") {
    return (
      <div className="screen-shell">
        <div className={`screen ${styles.loadingScreen}`}>
          <div className={styles.loadingPhoto} />
          <div className={styles.loadingBody}>
            <div className={styles.loadingLine} style={{ width: "60%" }} />
            <div className={styles.loadingLine} style={{ width: "40%" }} />
            <div className={styles.loadingLine} style={{ width: "90%" }} />
            <div className={styles.loadingLine} style={{ width: "80%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error" || !listing) {
    return (
      <div className="screen-shell">
        <div className="screen">
          <div className={styles.errorHeader}>
            <button type="button" className={styles.iconCircle} onClick={() => navigate(-1)} aria-label="Назад">
              <ArrowLeft size={20} />
            </button>
          </div>
          <StateView
            tone="danger"
            icon={<AlertTriangle size={28} strokeWidth={1.6} />}
            title="Вариант не найден"
            description="Возможно, объявление было удалено или ссылка устарела."
            actionLabel="К поиску"
            onAction={() => navigate("/home")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen-shell">
      <div className={`screen ${styles.screen}`}>
        <div className={styles.gallery}>
          <PhotoPlaceholder variant={listing.photos[activePhoto]} iconSize={40} />
          <div className={styles.galleryTop}>
            <button type="button" className={styles.iconCircle} onClick={() => navigate(-1)} aria-label="Назад">
              <ArrowLeft size={20} />
            </button>
            <button
              type="button"
              className={styles.iconCircle}
              data-active={favorite || undefined}
              onClick={handleFavorite}
              aria-label="В избранное"
            >
              <Heart size={19} fill={favorite ? "currentColor" : "none"} />
            </button>
          </div>
          {listing.photos.length > 1 && (
            <div className={styles.dots}>
              {listing.photos.map((photo, index) => (
                <button
                  key={photo + index}
                  type="button"
                  className={styles.dot}
                  data-active={index === activePhoto || undefined}
                  onClick={() => setActivePhoto(index)}
                  aria-label={`Фото ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.titleRow}>
            <div>
              <h1 className={styles.title}>{listing.title}</h1>
              <p className={styles.subtitle}>{listing.city}</p>
            </div>
            <RatingStars rating={listing.rating} reviewsCount={listing.reviewsCount} />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Описание</h2>
            <p className={styles.paragraph}>{listing.description}</p>
            <div className={styles.tagsRow}>
              {listing.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>О хозяине</h2>
            <div className={styles.hostCard}>
              <Avatar
                emoji={listing.host.avatarEmoji}
                color={listing.host.avatarColor}
                name={listing.host.name}
                size={52}
              />
              <div className={styles.hostInfo}>
                <div className={styles.hostNameRow}>
                  <strong>{listing.host.name}</strong>
                </div>
                <RatingStars rating={listing.host.rating} reviewsCount={listing.host.reviewsCount} size={12} />
                <p className={styles.hostBio}>{listing.host.bio}</p>
                <div className={styles.tagsRow}>
                  {listing.host.interests.map((interest) => (
                    <Tag key={interest}>{interest}</Tag>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Условия</h2>
            <div className={styles.conditionsGrid}>
              <div className={styles.conditionItem}>
                <Users size={17} />
                <span>До {listing.guests} {listing.guests === 1 ? "гостя" : "гостей"}</span>
              </div>
              <div className={styles.conditionItem}>
                <BedDouble size={17} />
                <span>{accommodationTypeLabels[listing.accommodationType]}</span>
              </div>
              <div className={styles.conditionItem}>
                <Calendar size={17} />
                <span>{listing.availableDates}</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Удобства</h2>
            <div className={styles.tagsRow}>
              {listing.amenities.map((amenity) => (
                <Tag key={amenity}>{amenity}</Tag>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <ListChecks size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
              Требования хозяина
            </h2>
            <ul className={styles.rulesList}>
              {listing.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.ctaBar}>
          <Button size="lg" fullWidth onClick={() => setRequestOpen(true)}>
            Запросить размещение
          </Button>
        </div>

        <BottomSheet
          open={requestOpen}
          onClose={closeRequest}
          title={sent ? "Запрос отправлен" : "Запросить размещение"}
          footer={
            sent ? (
              <Button size="lg" fullWidth onClick={closeRequest}>
                Готово
              </Button>
            ) : (
              <Button size="lg" fullWidth onClick={handleRequest} loading={sending}>
                Отправить запрос
              </Button>
            )
          }
        >
          {sent ? (
            <div className={styles.sentState}>
              <CheckCircle2 size={40} className={styles.sentIcon} />
              <p>
                Это демо-действие: реальная отправка сообщений появится в следующей версии. {listing.host.name} увидит
                ваш запрос и свяжется с вами через MAX.
              </p>
            </div>
          ) : (
            <p className={styles.requestText}>
              {listing.host.name} получит демо-уведомление о вашем запросе на «{listing.title}». В MVP это
              имитация действия — настоящий чат подключим позже.
            </p>
          )}
        </BottomSheet>
      </div>
    </div>
  );
}
