import { AlertTriangle, Home as HomeIcon, SlidersHorizontal, Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import ListingCard from "../../components/ListingCard/ListingCard";
import SkeletonCard from "../../components/SkeletonCard/SkeletonCard";
import FilterSheet from "../../components/FilterSheet/FilterSheet";
import StateView from "../../components/StateView/StateView";
import Tag from "../../components/Tag/Tag";
import { quickCities } from "../../data/cities";
import { useUser } from "../../context/UserContext";
import { getListings } from "../../services/listingsService";
import { defaultSearchState, type SearchFormState } from "../../types/filters";
import type { Listing } from "../../types/listing";
import styles from "./Home.module.css";

type ListingsStatus = "loading" | "success" | "empty" | "error";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ListingsStatus>("loading");
  const [filters, setFilters] = useState<SearchFormState>(defaultSearchState);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [cityInput, setCityInput] = useState("");

  const loadListings = useCallback(() => {
    setStatus("loading");
    getListings()
      .then((data) => {
        setListings(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Не удалось загрузить варианты.");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const goSearch = (city: string) => {
    const params = new URLSearchParams();
    params.set("city", city);
    if (filters.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters.dateTo) params.set("date_to", filters.dateTo);
    if (filters.guests > 1) params.set("guests", String(filters.guests));
    if (filters.accommodationType !== "any") params.set("type", filters.accommodationType);
    navigate(`/search?${params.toString()}`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const city = cityInput.trim();
    if (city) goSearch(city);
  };

  const activeFilterCount = (filters.guests > 1 ? 1 : 0) + (filters.accommodationType !== "any" ? 1 : 0);

  if (!user) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.profileLink} onClick={() => navigate("/profile")}>
          <Avatar photo={user.photo} name={user.name} size={42} />
          <div>
            <p className={styles.greeting}>Привет, {user.name.split(" ")[0] || "путешественник"} 👋</p>
            <p className={styles.location}>Ваш город: {user.city}</p>
          </div>
        </button>
        <ThemeToggle />
      </header>

      <section className={styles.searchSection}>
        <form className={styles.searchBar} onSubmit={handleSubmit}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="В какой город едете?"
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
          />
          <button type="submit" className={styles.searchSubmit} aria-label="Искать">
            Найти
          </button>
        </form>

        <div className={styles.quickCities}>
          {quickCities.map((city) => (
            <Tag key={city} onClick={() => goSearch(city)}>
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
        <h2 className={styles.sectionTitle}>Варианты рядом</h2>
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
            onAction={loadListings}
          />
        )}
        {status === "empty" && (
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
          if (cityInput.trim()) goSearch(cityInput.trim());
        }}
      />
    </div>
  );
}
