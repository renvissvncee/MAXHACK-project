import { Check, Inbox, MessageSquareText, RefreshCw, UserRoundCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import Button from "../../components/Button/Button";
import StateView from "../../components/StateView/StateView";
import { useToast } from "../../context/ToastContext";
import ReviewSheet from "../../features/reviews/ReviewSheet";
import { decideStayRequest, getMatchContact, getStayRequests } from "../../services/requestsService";
import type { MatchContact, RequestDirection, RequestParty, RequestStatus, StayRequest } from "../../types/request";
import styles from "./Requests.module.css";

type LoadStatus = "loading" | "ready" | "error";

const statusLabels: Record<RequestStatus, string> = {
  pending: "Ожидает решения",
  accepted: "Принята",
  declined: "Отклонена",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}

export default function Requests() {
  const [searchParams] = useSearchParams();
  const [direction, setDirection] = useState<RequestDirection>(() => searchParams.get("direction") === "outgoing" ? "outgoing" : "incoming");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [items, setItems] = useState<StayRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, MatchContact>>({});
  const [reviewSubject, setReviewSubject] = useState<RequestParty | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setItems(await getStayRequests(direction));
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      showToast(error instanceof Error ? error.message : "Не удалось загрузить заявки.", "info");
    }
  }, [direction, showToast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (status === "ready" && focus) document.getElementById(`request-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchParams, status]);

  const decide = async (request: StayRequest, nextStatus: "accepted" | "declined") => {
    setBusyId(request.id);
    try {
      const updated = await decideStayRequest(request.id, nextStatus);
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      showToast(nextStatus === "accepted" ? "Заявка принята." : "Заявка отклонена.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось сохранить решение.", "info");
    } finally {
      setBusyId(null);
    }
  };

  const revealContact = async (request: StayRequest) => {
    setBusyId(request.id);
    try {
      const contact = await getMatchContact(request.id);
      setContacts((current) => ({ ...current, [request.id]: contact }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось получить контакт.", "info");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Поездки и гости</p>
          <h1>Заявки</h1>
        </div>
        <button type="button" className={styles.refresh} onClick={() => void load()} aria-label="Обновить">
          <RefreshCw size={19} />
        </button>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Направление заявок">
        <button type="button" role="tab" aria-selected={direction === "incoming"}
          data-active={direction === "incoming" || undefined} onClick={() => setDirection("incoming")}>
          Входящие
        </button>
        <button type="button" role="tab" aria-selected={direction === "outgoing"}
          data-active={direction === "outgoing" || undefined} onClick={() => setDirection("outgoing")}>
          Исходящие
        </button>
      </div>

      {status === "loading" && <div className={styles.loading}>Загружаем заявки…</div>}
      {status === "error" && (
        <StateView tone="danger" icon={<Inbox size={28} />} title="Не удалось загрузить"
          description="Проверьте соединение и повторите." actionLabel="Повторить" onAction={() => void load()} />
      )}
      {status === "ready" && items.length === 0 && (
        <StateView icon={<Inbox size={28} />} title={direction === "incoming" ? "Пока нет входящих" : "Пока нет исходящих"}
          description={direction === "incoming" ? "Здесь появятся запросы гостей на ваше размещение." : "Отправьте заявку из карточки подходящего жилья."} />
      )}

      {status === "ready" && items.length > 0 && <div className={styles.list}>
        {items.map((request) => {
          const person = direction === "incoming" ? request.guest : request.host;
          const contact = contacts[request.id];
          return (
            <article key={request.id} id={`request-${request.id}`} className={styles.card}
              data-focus={searchParams.get("focus") === request.id || undefined}>
              <div className={styles.person}>
                <Avatar emoji={person.avatarEmoji} color={person.avatarColor} name={person.name} size={46} />
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.city || (direction === "incoming" ? "Гость" : "Хозяин")}</span>
                </div>
                <span className={styles.status} data-status={request.status}>{statusLabels[request.status]}</span>
              </div>
              <div className={styles.details}>
                <span>{formatDate(request.dateFrom)} — {formatDate(request.dateTo)}</span>
                <span>{request.guests} {request.guests === 1 ? "гость" : "гося"}</span>
              </div>
              {request.message && <p className={styles.message}>{request.message}</p>}

              {direction === "incoming" && request.status === "pending" && (
                <div className={styles.actions}>
                  <Button variant="outline" icon={<X size={17} />} disabled={busyId === request.id}
                    onClick={() => void decide(request, "declined")}>Отклонить</Button>
                  <Button icon={<Check size={17} />} loading={busyId === request.id}
                    onClick={() => void decide(request, "accepted")}>Принять</Button>
                </div>
              )}

              {request.status === "accepted" && !contact && (
                <div className={styles.matchActions}>
                  <Button variant="secondary" icon={<UserRoundCheck size={17} />}
                    loading={busyId === request.id} onClick={() => void revealContact(request)}>
                    Контакт MAX
                  </Button>
                  <Button variant="outline" icon={<MessageSquareText size={17} />}
                    onClick={() => setReviewSubject(person)}>Отзыв</Button>
                </div>
              )}
              {contact && (
                <>
                  <div className={styles.contact}>
                    <span>Контакт MAX</span>
                    <strong>{contact.username ? `@${contact.username}` : `ID ${contact.maxUserId}`}</strong>
                  </div>
                  <Button variant="outline" fullWidth icon={<MessageSquareText size={17} />}
                    onClick={() => setReviewSubject(person)}>Оставить или изменить отзыв</Button>
                </>
              )}
            </article>
          );
        })}
      </div>}
      <ReviewSheet subject={reviewSubject} onClose={() => setReviewSubject(null)} />
    </main>
  );
}
