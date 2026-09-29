import {
  AlertTriangle,
  ArrowUp,
  Home as HomeIcon,
  MapPinOff,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import ListingCard from "../../components/ListingCard/ListingCard";
import SkeletonCard from "../../components/SkeletonCard/SkeletonCard";
import FilterSheet from "../../components/FilterSheet/FilterSheet";
import StateView from "../../components/StateView/StateView";
import Tag from "../../components/Tag/Tag";
import LocalityCombobox from "../../components/LocalityCombobox/LocalityCombobox";
import { quickCities } from "../../data/cities";
import { useUser } from "../../context/UserContext";
import { searchListings } from "../../services/listingsService";
import { findCity, getLocality } from "../../services/localitiesService";
import type { SearchFormState } from "../../types/filters";
import type { AccommodationType, Listing } from "../../types/listing";
import type { Locality } from "../../types/locality";
import styles from "./Home.module.css";

type ListingsStatus = "loading" | "success" | "empty" | "error";

function readFiltersFromParams(params: URLSearchParams): SearchFormState {
  return {
    dateFrom: params.get("date_from") ?? "",
    dateTo: params.get("date_to") ?? "",
    guests: Number(params.get("guests") ?? 1) || 1,
    accommodationType: (params.get("type") as AccommodationType | null) ?? "any",
  };
}

function writeParams(target: SearchFormState, locality: Locality | null): URLSearchParams {
  const params = new URLSearchParams();
  if (locality) params.set("locality_id", locality.id);
  if (target.dateFrom) params.set("date_from", target.dateFrom);
  if (target.dateTo) params.set("date_to", target.dateTo);
  if (target.guests > 1) params.set("guests", String(target.guests));
  if (target.accommodationType !== "any") params.set("type", target.accommodationType);
  return params;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilters = readFiltersFromParams(searchParams);
  const activeLocalityId = searchParams.get("locality_id") ?? "";
  const hasActiveSearch = activeLocalityId.length > 0;

  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ListingsStatus>("loading");
  const [filters, setFilters] = useState<SearchFormState>(urlFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedLocality, setSelectedLocality] = useState<Locality | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // The URL is the source of truth for an active search (deep-linkable,
  // survives reload). Re-sync the draft input/filters whenever it changes
  // from outside this component's own submit handlers — e.g. browser
  // back/forward — the same class of staleness bug fixed earlier in
  // Requests.tsx's direction tab.
  useEffect(() => {
    setFilters(urlFilters);
    if (!activeLocalityId) {
      setSelectedLocality(null);
    } else if (selectedLocality?.id !== activeLocalityId) {
      getLocality(activeLocalityId).then(setSelectedLocality).catch(() => setSelectedLocality(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      // Always go through the same filtered search, city or not — guests/
      // accommodation type/dates from the filter sheet must apply to the
      // "nearby" feed too, not only once a locality has been selected.
      const data = await searchListings({
        localityId: activeLocalityId || undefined,
        dateFrom: urlFilters.dateFrom || undefined,
        dateTo: urlFilters.dateTo || undefined,
        guests: urlFilters.guests > 1 ? urlFilters.guests : undefined,
        accommodationType: urlFilters.accommodationType === "any" ? undefined : urlFilters.accommodationType,
      });
      setListings(data);
      setStatus(data.length > 0 ? "success" : "empty");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить варианты.");
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const runSearch = (locality: Locality, nextFilters: SearchFormState = filters) => {
    setSelectedLocality(locality);
    setSearchParams(writeParams(nextFilters, locality));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedLocality) runSearch(selectedLocality);
  };

  const activeFilterCount = (filters.guests > 1 ? 1 : 0) + (filters.accommodationType !== "any" ? 1 : 0);
  // Whether ANY filter narrows the feed — not just a typed city. Guests/type/
  // dates from the sheet apply to the "nearby" list too, so "no results"
  // messaging and the count need to react to those as well.
  const hasActiveFilters = hasActiveSearch || activeFilterCount > 0 || Boolean(filters.dateFrom) || Boolean(filters.dateTo);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!user) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.profileLink} onClick={() => navigate("/profile")}>
          <Avatar photo={user.photo} name={user.name} size={42} />
          <div>
            <p className={styles.greeting}>Привет, {user.name.split(" ")[0] || "путешественник"} 👋</p>
            <p className={styles.location}>Ваш город: {user.locality?.shortLabel ?? user.city}</p>
          </div>
        </button>
        <ThemeToggle />
      </header>

      <section className={styles.searchSection}>
        <form className={styles.searchBar} onSubmit={handleSubmit}>
          <LocalityCombobox
            value={selectedLocality}
            onChange={setSelectedLocality}
            placeholder="Куда едете?"
            ariaLabel="Населённый пункт поездки"
            bare
          />
          <button type="submit" className={styles.searchSubmit} aria-label="Искать" disabled={!selectedLocality}>
            Найти
          </button>
        </form>

        <div className={styles.quickCities}>
          {quickCities.map((city) => (
            <Tag key={city} active={city === selectedLocality?.name} onClick={() => {
              if (city === selectedLocality?.name) {
                setSelectedLocality(null);
                setSearchParams(writeParams(filters, null));
              } else {
                void findCity(city).then((locality) => { if (locality) runSearch(locality); });
              }
            }}>
              {city}
            </Tag>
          ))}
        </div>

        <button type="button" className={styles.filtersButton} onClick={() => setFilterSheetOpen(true)}>
          <SlidersHorizontal size={16} />
          Фильтры
          {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
        </button>
      </section>

      <section className={styles.listSection}>
        <div className={styles.listHeading}>
          <h2 className={styles.sectionTitle}>
            {hasActiveSearch ? `Варианты · ${selectedLocality?.shortLabel ?? "выбранное место"}` : "Варианты рядом"}
          </h2>
          {hasActiveFilters && (
            <p className={styles.resultsStatus}>
              {status === "loading" && "Ищем варианты…"}
              {status === "success" && `Найдено: ${listings.length}`}
              {status === "empty" && "Ничего не найдено"}
              {status === "error" && "Не удалось загрузить результаты"}
            </p>
          )}
        </div>

        {status === "loading" && (
          <div className={styles.cardsGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}
        {status === "error" && (
          <StateView
            tone="danger"
            icon={<AlertTriangle size={26} strokeWidth={1.6} />}
            title="Не удалось загрузить варианты"
            description={error}
            actionLabel="Повторить"
            onAction={load}
          />
        )}
        {status === "empty" && hasActiveFilters && (
          <StateView
            icon={<MapPinOff size={26} strokeWidth={1.6} />}
            title={hasActiveSearch ? "В этом городе пока нет подходящих вариантов" : "Под такие фильтры пока ничего не нашлось"}
            description="Попробуйте выбрать другой город или ослабить фильтры поиска."
            actionLabel="Изменить фильтры"
            onAction={() => setFilterSheetOpen(true)}
          />
        )}
        {status === "empty" && !hasActiveFilters && (
          <StateView
            icon={<HomeIcon size={26} strokeWidth={1.6} />}
            title="Пока нет предложений"
            description="Другие пользователи ещё не добавили варианты размещения."
          />
        )}
        {status === "success" && (
          <div className={styles.cardsGrid}>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      <FilterSheet
        open={filterSheetOpen}
        value={filters}
        onChange={setFilters}
        onClose={() => setFilterSheetOpen(false)}
        onApply={() => {
          setSearchParams(writeParams(filters, selectedLocality));
        }}
      />

      {showScrollTop && (
        <button type="button" className={styles.scrollTop} onClick={scrollToTop} aria-label="Наверх, к поиску">
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
