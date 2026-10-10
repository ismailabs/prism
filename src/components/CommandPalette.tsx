import { useAppStore } from "@/store/useAppStore";
import type { Tab } from "@/types";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "./ui/dialog";
export function CommandPalette({
  open,
  onOpenChange,
  onAdd,
  canAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  canAdd: boolean;
}) {
  const { t } = useTranslation();
  const store = useAppStore();
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const commands = [
    ...(
      [
        "dashboard",
        "transactions",
        "analytics",
        "accounting",
        "accounts",
        "plans",
        "goals","savings","notes","reminders","notifications","calendar",
        "debts",
        "settings",
      ] as Tab[]
    ).map((tab) => ({
      id: tab,
      label: t(tab),
      run: () => store.setActiveTab(tab),
    })),
    ...(canAdd ? [{ id: "add", label: t("addTransaction"), run: onAdd }] : []),
    {
      id: "privacy",
      label: t("togglePrivacy"),
      run: () =>
        store.setPersonalization({
          privacyMode: !store.personalization.privacyMode,
        }),
    },
    {
      id: "theme",
      label: t("toggleTheme"),
      run: () =>
        store.setTheme(
          document.documentElement.classList.contains("dark")
            ? "light"
            : "dark",
        ),
    },
  ].filter((c) =>
    c.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const selected = Math.min(index, Math.max(0, commands.length - 1));
  function execute(i: number) {
    const command = commands[i];
    if (command) {
      setSearch('');
      setIndex(0);
      onOpenChange(false);
      command.run();
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setSearch("");
          setIndex(0);
        }
      }}
      title={t("quickNavigation")}
      description={t("keyboardHint")}
    >
      <div
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setIndex(
              (selected + (e.key === "ArrowDown" ? 1 : -1) + commands.length) %
                Math.max(1, commands.length),
            );
          }
          if (e.key === "Enter") {
            e.preventDefault();
            execute(selected);
          }
        }}
      >
        <div className="search-field">
          <Search size={17} />
          <input
            autoFocus
            role="combobox"
            aria-label={t("commandSearch")}
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={
              commands[selected]
                ? `command-${commands[selected].id}`
                : undefined
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIndex(0);
            }}
            placeholder={t("commandSearch")}
          />
        </div>
        <div
          id="command-list"
          role="listbox"
          aria-label={t("quickNavigation")}
          className="command-list"
        >
          {commands.map((command, i) => (
            <button
              type="button"
              role="option"
              aria-selected={i === selected}
              id={`command-${command.id}`}
              key={command.id}
              onClick={() => execute(i)}
              onMouseEnter={() => setIndex(i)}
            >
              {command.id === "add" ? (
                <Plus size={15} />
              ) : (
                <span aria-hidden="true">↗</span>
              )}
              {command.label}
            </button>
          ))}
          {!commands.length && (
            <p className="p-4 text-subtle">{t("noCommands")}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
