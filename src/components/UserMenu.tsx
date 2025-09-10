import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

export default function UserMenu() {
  const { user, logout } = useAuth0();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-avatar-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={user.name || user.email || "Account"}
      >
        {user.picture ? (
          <img src={user.picture} alt="User avatar" className="user-avatar-img" />
        ) : (
          <span className="user-avatar-fallback" aria-hidden>
            {(user.name || "?").slice(0, 1)}
          </span>
        )}
      </button>
      <div className={`user-dropdown ${open ? "is-open" : ""}`.trim()} role="dialog" aria-label="User menu">
        <div className="user-dropdown__header" title={user.email || user.name || ""}>
          {user.name || user.email || "Account"}
        </div>
        <button
          type="button"
          className="user-dropdown__item"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
