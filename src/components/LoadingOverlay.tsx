import type { PropsWithChildren } from "react";
import { PropagateLoader } from "react-spinners";

type LoadingOverlayProps = PropsWithChildren<{
  open?: boolean;
  label?: string;
  color?: string;
}>;

export default function LoadingOverlay({
  open = true,
  label = "Loading",
  color = "var(--main-orange)",
}: LoadingOverlayProps) {
  if (!open) return null;
  return (
    <div className="loading__overlay">
      <PropagateLoader color={color} aria-label={label} />
    </div>
  );
}
