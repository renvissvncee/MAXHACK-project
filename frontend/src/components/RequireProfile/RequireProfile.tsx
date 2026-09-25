import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import SplashLoader from "../SplashLoader/SplashLoader";

export default function RequireProfile() {
  const { user, isLoading } = useUser();

  if (isLoading) return <SplashLoader />;
  if (!user) return <Navigate to="/" replace />;

  return <Outlet />;
}
