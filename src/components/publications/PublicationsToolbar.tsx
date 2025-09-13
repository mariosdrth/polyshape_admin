type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  isDeleting: boolean;
};

export default function PublicationsToolbar({
  searchQuery,
  setSearchQuery,
  onRefresh,
  onAdd,
  isDeleting,
}: Props) {
  return (
    <div className="list-toolbar">
      <div className="toolbar-left">
        <button
          className="btn btn-default"
          onClick={onRefresh}
          disabled={isDeleting}
          title="Refresh publications"
        >
          <i className="fa-solid fa-rotate"></i>
          <span className="label">Refresh</span>
        </button>
      </div>
      <div className="toolbar-search">
        <input
          type="search"
          placeholder="Search by title…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search publications by title"
        />
        <button
          type="button"
          className="icon-btn search-clear"
          aria-label="Clear search"
          onClick={() => setSearchQuery("")}
          style={{ visibility: searchQuery ? "visible" : "hidden" }}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div className="toolbar-right">
        <button
          className="btn btn-primary"
          title="Add publication"
          onClick={onAdd}
        >
          <i className="fa-solid fa-plus"></i>
          <span className="label">Add</span>
        </button>
      </div>
    </div>
  );
}
