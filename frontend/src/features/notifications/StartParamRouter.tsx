import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { currentStartParam, notificationIdFromStartParam } from "../../services/startParam";

export default function StartParamRouter() {
  const { user, status } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || status !== "ready" || !user?.onboardingCompleted) return;
    if (localStorage.getItem("priut:intro-seen") !== "1") return;
    const raw = currentStartParam();
    if (!raw) return;
    handled.current = true;
    const notificationId = notificationIdFromStartParam(raw);
    navigate(notificationId ? `/notifications/${notificationId}` : "/notifications?launch=invalid", { replace: true });
  }, [location.pathname, navigate, status, user]);

  return null;
}
