import { useState } from "react";

export default function ProjectsList() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div>
      <div className="list-toolbar">
        <div className="toolbar-left">
          <button
            className="btn btn-default"
            title="Refresh projects"
            type="button"
            onClick={() => { /* no-op for now */ }}
          >
            <i className="fa-solid fa-rotate"></i>
            <span className="label">Refresh</span>
          </button>
        </div>
        <div className="toolbar-search">
          <input
            type="search"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search projects by title"
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
            title="Add project"
            type="button"
            onClick={() => { /* no-op for now */ }}
          >
            <i className="fa-solid fa-plus"></i>
            <span className="label">Add</span>
          </button>
        </div>
      </div>

      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        Projects section coming soon.
      </p>
    </div>
  );
}
