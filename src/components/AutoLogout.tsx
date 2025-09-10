import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_TIME = 1 * 60 * 1000; // show warning 1 min before logout

export default function AutoLogout() {
  const { logout, isAuthenticated } = useAuth0();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_TIME / 1000); // 60 seconds

  useEffect(() => {
    if (!isAuthenticated) return;

    let logoutTimer: number;
    let warningTimer: number;
    let countdownInterval: number;

    const resetTimers = () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);

      setShowWarning(false);
      setCountdown(WARNING_TIME / 1000);

      // warning fires before logout
      warningTimer = window.setTimeout(() => {
        setShowWarning(true);
        let remaining = WARNING_TIME / 1000;
        countdownInterval = window.setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
        }, 1000);
      }, TIMEOUT - WARNING_TIME);

      // actual logout
      logoutTimer = window.setTimeout(() => {
        logout({ logoutParams: { returnTo: window.location.origin } });
      }, TIMEOUT);
    };

    // listen for user activity (only clicks)
    window.addEventListener("click", resetTimers);

    resetTimers();

    return () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      window.removeEventListener("click", resetTimers);
    };
  }, [isAuthenticated, logout]);

  if (!showWarning) return null;

  return (
    <div className="auto-logout-warning">
      <p>You will be logged out in {countdown}s due to inactivity.</p>
      <button
        onClick={() => setShowWarning(false)}
        className="btn btn-primary"
      >
        Stay Logged In
      </button>
    </div>
  );
}
