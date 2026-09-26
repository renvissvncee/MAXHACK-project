import { AlertTriangle } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import StateView from "../../components/StateView/StateView";
import SplashLoader from "../../components/SplashLoader/SplashLoader";
import { useUser } from "../../context/UserContext";
import { useIntroSeen } from "./useIntroSeen";

/**
 * Guards the core app routes (home/search/profile/listing detail). The
 * mini-app never has an "unauthenticated" state to defend against — MAX
 * hands over identity before this ever mounts — but it does have an
 * "onboarding not finished yet" state, which is what this redirects on.
 */
export default function OnboardingGate() {
  const { user, status, reload } = useUser();
  const { introSeen } = useIntroSeen();

  if (status === "loading") return <SplashLoader />;

  if (status === "error") {
    return (
      <div className="screen-shell">
        <div className="screen">
          <StateView
            tone="danger"
            icon={<AlertTriangle size={28} strokeWidth={1.6} />}
            title="Не удалось загрузить профиль"
            description="Проверьте соединение и попробуйте ещё раз."
            actionLabel="Повторить"
            onAction={reload}
          />
        </div>
      </div>
    );
  }

  if (!introSeen) return <Navigate to="/" replace />;
  if (user && !user.onboardingCompleted) return <Navigate to="/profile-setup" replace />;

  return <Outlet />;
}
