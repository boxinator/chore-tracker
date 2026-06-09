import { RefreshCw, Settings } from "lucide-react";
import type { ReactNode } from "react";

type GlobalNavProps = {
  title: string;
  children: ReactNode;
  onOpenManage: () => void;
};

export function GlobalNav({ title, children, onOpenManage }: GlobalNavProps) {
  return (
    <header className="topbar">
      <div className="topbar-copy">
        <div className="title-block">
          <h1>{title}</h1>
        </div>
      </div>
      <div className="topbar-tools">
        {children}
        <button
          className="toolbar-button manage-icon-button"
          type="button"
          aria-label="Refresh kiosk"
          onClick={() => window.location.reload()}
        >
          <RefreshCw aria-hidden="true" />
        </button>
        <button
          className="toolbar-button manage-icon-button"
          type="button"
          aria-label="Manage"
          onClick={onOpenManage}
        >
          <Settings aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
