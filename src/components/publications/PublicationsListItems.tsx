import { lastPathSegment } from "../../util/pathUtils";
import type { EnrichedItem } from "../../controllers/publicationsController";

type Props = {
  items: EnrichedItem[];
  deleting: Set<string>;
  onEdit: (item: EnrichedItem) => void;
  onDeleteRequest: (pathname: string) => void;
};

export default function PublicationsListItems({
  items,
  deleting,
  onEdit,
  onDeleteRequest,
}: Props) {
  return (
    <ul>
      {items.map((item) => {
        const key = item.pathname;
        const d = item.detail;
        return (
          <li key={key} className="list-item pub-item">
            <button
              type="button"
              className="icon-btn item-edit"
              aria-label="Edit publication"
              title="Edit publication"
              onClick={() => onEdit(item)}
            >
              <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className="icon-btn item-trash"
              aria-label="Delete publication"
              title="Delete publication"
              onClick={() => onDeleteRequest(item.pathname)}
              aria-busy={deleting.has(item.pathname)}
              disabled={deleting.has(item.pathname)}
            >
              <i className="fa-solid fa-trash" aria-hidden="true"></i>
            </button>

            <h3 className="item-pathname pub-pathname" title={item.pathname}>
              {lastPathSegment(item.pathname)}
            </h3>

            {!d && item.error && (
              <p className="pub-error" style={{ color: "crimson" }}>
                Error: {item.error}
              </p>
            )}

            {d && (
              <div className="item-content pub-content">
                <div className="item-header pub-header">
                  <span className="item-date pub-date" title={d.date}>
                    {d.date}
                  </span>
                  <h2 className="item-title pub-title">{d.title}</h2>
                </div>
                <div className="item-meta pub-meta">
                  {(d.authors?.length ?? 0) > 0 && (
                    <div
                      className="item-extra pub-authors"
                      title={(d.authors || []).filter(Boolean).join(", ")}
                    >
                      {(d.authors || []).filter(Boolean).join(", ")}
                    </div>
                  )}
                  {d.venue && <div className="pub-venue">{d.venue}</div>}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
