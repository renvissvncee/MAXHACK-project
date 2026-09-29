import { AlertTriangle, Home, PenSquare, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import BottomSheet from "../../components/BottomSheet/BottomSheet";
import Button from "../../components/Button/Button";
import PhotoPlaceholder from "../../components/PhotoPlaceholder/PhotoPlaceholder";
import StateView from "../../components/StateView/StateView";
import { useToast } from "../../context/ToastContext";
import { deleteMyListing, getMyListing, saveMyListing, type ListingInput } from "../../services/listingsService";
import { accommodationTypeLabels, type Listing } from "../../types/listing";
import { pluralRu } from "../../utils/plural";
import MyListingForm from "./components/MyListingForm";
import styles from "./MyListing.module.css";

const GUEST_FORMS = ["гость", "гостя", "гостей"] as const;

const emptyDraft: ListingInput = {
  city: "",
  title: "",
  shortDescription: "",
  description: "",
  guests: 1,
  accommodationType: "room",
  availableFrom: "",
  availableTo: "",
  tags: [],
  amenities: [],
  rules: [],
  photoUrl: null,
};

function toInput(listing: Listing): ListingInput {
  const { city, title, shortDescription, description, guests, accommodationType,
    availableFrom, availableTo, tags, amenities, rules } = listing;
  return { city, title, shortDescription, description, guests, accommodationType,
    availableFrom, availableTo, tags, amenities, rules, photoUrl: listing.photos[0] ?? null };
}

type Status = "loading" | "ready" | "error";

export default function MyListing() {
  const [status, setStatus] = useState<Status>("loading");
  const [listing, setListing] = useState<Listing | null>(null);
  const [draft, setDraft] = useState<ListingInput>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setListing(await getMyListing());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isValid =
    draft.city.trim().length > 0 &&
    draft.title.trim().length > 0 &&
    draft.shortDescription.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    draft.availableFrom.length > 0 &&
    draft.availableTo.length > 0 &&
    draft.availableTo >= draft.availableFrom;

  const openCreate = () => {
    setDraft(emptyDraft);
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!listing) return;
    setDraft(toInput(listing));
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      setListing(await saveMyListing(draft));
      setFormOpen(false);
      showToast("Предложение сохранено.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось сохранить предложение.", "info");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteMyListing();
      setListing(null);
      setDeleteOpen(false);
      showToast("Предложение удалено.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось удалить предложение.", "info");
    } finally {
      setDeleting(false);
    }
  };

  if (status === "loading") {
    return <p className={styles.loading}>Загружаем ваше предложение…</p>;
  }

  if (status === "error") {
    return (
      <StateView
        tone="danger"
        icon={<AlertTriangle size={26} strokeWidth={1.6} />}
        title="Не удалось загрузить предложение"
        description="Проверьте соединение и попробуйте ещё раз."
        actionLabel="Повторить"
        onAction={load}
      />
    );
  }

  return (
    <>
      {listing ? (
        <article className={styles.summaryCard}>
          <div className={styles.summaryPhoto}>
            <PhotoPlaceholder variant={listing.photos[0]} className={styles.summaryPhotoInner} />
          </div>
          <div className={styles.summaryBody}>
            <h3 className={styles.summaryTitle}>{listing.title}</h3>
            <p className={styles.summaryMeta}>{listing.city}</p>
            <p className={styles.summaryMeta}>
              {accommodationTypeLabels[listing.accommodationType]} · {listing.guests}{" "}
              {pluralRu(listing.guests, GUEST_FORMS)} · {listing.availableDates}
            </p>
            <div className={styles.summaryActions}>
              <Button variant="outline" size="md" icon={<PenSquare size={15} />} onClick={openEdit}>
                Редактировать
              </Button>
              <Button variant="ghost" size="md" icon={<Trash2 size={15} />} onClick={() => setDeleteOpen(true)}>
                Удалить
              </Button>
            </div>
          </div>
        </article>
      ) : (
        <StateView
          icon={<Home size={26} strokeWidth={1.6} />}
          title="У вас пока нет размещения"
          description="Создайте предложение, чтобы гости видели вас в поиске."
          actionLabel="Создать предложение"
          onAction={openCreate}
        />
      )}

      <BottomSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={listing ? "Редактировать предложение" : "Новое предложение"}
        footer={
          <Button size="lg" fullWidth loading={saving} disabled={!isValid} onClick={handleSubmit}>
            Сохранить предложение
          </Button>
        }
      >
        <MyListingForm draft={draft} onChange={setDraft} />
      </BottomSheet>

      <BottomSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Удалить предложение?"
        footer={
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            className={styles.deleteButton}
            loading={deleting}
            onClick={handleDelete}
          >
            <Trash2 size={16} style={{ marginRight: 6 }} />
            Удалить безвозвратно
          </Button>
        }
      >
        <p className={styles.deleteWarning}>
          Предложение «{listing?.title}» будет удалено безвозвратно. Все заявки гостей на это
          размещение — включая уже принятые — тоже будут удалены и станут недоступны.
        </p>
      </BottomSheet>
    </>
  );
}
