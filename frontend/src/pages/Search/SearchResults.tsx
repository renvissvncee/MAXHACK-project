import { AlertTriangle, ArrowLeft, MapPinOff, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FilterSheet from "../../components/FilterSheet/FilterSheet";
import ListingCard from "../../components/ListingCard/ListingCard";
import SkeletonCard from "../../components/SkeletonCard/SkeletonCard";
import StateView from "../../components/StateView/StateView";
import { searchListings } from "../../services/listingsService";
import type { SearchFormState } from "../../types/filters";
import type { AccommodationType, Listing } from "../../types/listing";
import styles from "./SearchResults.module.css";

type Status = "loading" | "success" | "empty" | "error";

function readFiltersFromParams(params: URLSearchParams): SearchFormState {
  return {
    city: params.get("city") ?? "",
    guests: Number(params.get("guests") ?? 1) || 1,
    accommodationType: (params.get("type") as AccommodationType | null) ?? "any",
  };
}

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFiltersFromParams(searchParams);

  const [draftFilters, setDraftFilters] = useState<SearchFormState>(filters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [listings, setListings] = useState<Listing[]>([]);

  const runSearch = useCallback(async (current: SearchFormState) => {
    setStatus("loading");
    try {
      if (current.city.trim().toLowerCase() === "ошибка") {
        await new Promise((_, reject) => setTimeout(() => reject(new Error("demo error")), 500));
      }
      const results = await searchListings({
        city: current.city || undefined,
        guests: current.guests > 1 ? current.guests : undefined,
        accommodationType: current.accommodationType === "any" ? undefined : current.accommodationType,
      });
      setListings(results);
      setStatus(results.length > 0 ? "success" : "empty");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    setDraftFilters(filters);
    runSearch(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const applyFilters = (next: SearchFormState) => {
    const params = new URLSearchParams();
    if (next.city) params.set("city", next.city);
    if (next.guests > 1) params.set("guests", String(next.guests));
    if (next.accommodationType !== "any") params.set("type", next.accommodationType);
    setSearchParams(params);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.city}>{filters.city || "Все города"}</h1>
          <p className={styles.count}>
            {status === "loading" && "Ищем варианты…"}
            {status === "success" && `Найдено вариантов: ${listings.length}`}
            {status === "empty" && "Ничего не найдено"}
            {status === "error" && "Не удалось загрузить результаты"}
          </p>
        </div>
        <button type="button" className={styles.filterBtn} onClick={() => setSheetOpen(true)} aria-label="Фильтры">
          <SlidersHorizontal size={18} />
        </button>
      </header>

      <div className={styles.content}>
        {status === "loading" && (
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}

        {status === "success" && (
          <div className={styles.grid}>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {status === "empty" && (
          <StateView
            icon={<MapPinOff size={28} strokeWidth={1.6} />}
            title="В этом городе пока нет подходящих вариантов"
            description="Попробуйте выбрать другой город или ослабить фильтры поиска."
            actionLabel="Изменить поиск"
            onAction={() => setSheetOpen(true)}
          />
        )}

        {status === "error" && (
          <StateView
            tone="danger"
            icon={<AlertTriangle size={28} strokeWidth={1.6} />}
            title="Что-то пошло не так"
            description="Не получилось загрузить варианты размещения. Проверьте соединение и попробуйте ещё раз."
            actionLabel="Повторить"
            onAction={() => runSearch(filters)}
          />
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        value={draftFilters}
        onChange={setDraftFilters}
        onClose={() => setSheetOpen(false)}
        onApply={() => applyFilters(draftFilters)}
      />
    </div>
  );
}
