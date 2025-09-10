
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorPage from "./ErrorPage";


export default function CallbackPage() {
  const { handleRedirectCallback } = useAuth0();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await handleRedirectCallback();
        navigate("/"); // redirect home after login
      } catch (e) {
        setError(e instanceof Error ? e.message : "Login failed.");
      }
    })();
  }, [handleRedirectCallback, navigate]);

  if (error) {
    return <ErrorPage message={error} />;
  }

  return <p>Logging you in...</p>;
}
