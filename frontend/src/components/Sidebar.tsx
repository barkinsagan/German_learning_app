import { Section } from "../types";

interface NavItem {
  id: Section;
  labelDe: string;
  labelEn: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "reading", labelDe: "Lesen", labelEn: "Reading", icon: "📖" },
  { id: "writing", labelDe: "Schreiben", labelEn: "Writing", icon: "✍️" },
  { id: "listening", labelDe: "Hören", labelEn: "Listening", icon: "🎧" },
  { id: "speaking", labelDe: "Sprechen", labelEn: "Speaking", icon: "🎤" },
  { id: "vocabulary", labelDe: "Vokabeln", labelEn: "Vocabulary", icon: "📝" },
  { id: "flashcards", labelDe: "Karteikarten", labelEn: "Flashcards", icon: "🃏" },
];

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 bg-surface border-r border-white/5 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-lg font-bold text-white">
            D
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm leading-none">
              DeutschLern
            </p>
            <p className="text-text-muted text-xs mt-0.5">Level A1–B2</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Skills
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                isActive
                  ? "bg-accent-muted text-accent border border-accent/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <div className="flex flex-col">
                <span>{item.labelDe}</span>
                <span
                  className={`text-xs ${isActive ? "text-accent/70" : "text-text-muted"}`}
                >
                  {item.labelEn}
                </span>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-sm">
            👤
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary">Lernender</p>
            <p className="text-xs text-text-muted">A1 Beginner</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
