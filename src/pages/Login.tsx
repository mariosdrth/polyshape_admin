import { useAuth0 } from "@auth0/auth0-react";

export default function LoginPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
      <button onClick={() => loginWithRedirect()}>
        Log in with GitHub
      </button>
    </div>
  );
}
