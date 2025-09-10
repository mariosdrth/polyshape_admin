import type { ReactNode } from "react";

type TabKey = string;

type Tab = {
  key: TabKey;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  active: TabKey;
  onChange: (key: TabKey) => void;
};

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tabs">
      <div role="tablist" aria-label="Main sections" className="tabs-list">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`tab ${active === t.key ? "is-active" : ""}`.trim()}
            onClick={() => onChange(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.map((t) => (
          <div
            key={t.key}
            role="tabpanel"
            hidden={active !== t.key}
          >
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}

