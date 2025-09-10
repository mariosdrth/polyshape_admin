import { useAuth0 } from "@auth0/auth0-react";

export default function ErrorPage({ message }: { message: string }) {
  const { logout } = useAuth0();
  return (
    <div className="error-page">
      <h2 style={{ color: "#d32f2f" }}>Login Error</h2>
      <p style={{ margin: "20px 0" }}>{message}</p>
      <button
        onClick={() => logout({})}
        className="btn btn-primary"
      >
        Go back to login
      </button>
    </div>
  );
}
