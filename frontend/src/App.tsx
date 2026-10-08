import { useState } from "react";
import { Section } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Reading } from "./components/Reading";
import { Writing } from "./components/Writing";
import { Listening } from "./components/Listening";
import { Speaking } from "./components/Speaking";
import { Vocabulary } from "./components/Vocabulary";
import { Flashcards } from "./components/Flashcards";
import { CurriculumView } from "./components/CurriculumView";

function SectionView({ section }: { section: Section }) {
  switch (section) {
    case "reading":
      return <Reading />;
    case "writing":
      return <Writing />;
    case "listening":
      return <Listening />;
    case "speaking":
      return <Speaking />;
    case "vocabulary":
      return <Vocabulary />;
    case "flashcards":
      return <Flashcards />;
    case "curriculum":
      return <CurriculumView />;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>("reading");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <span>DeutschLern</span>
            <span>/</span>
            <span className="text-text-primary capitalize">{activeSection}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="w-2 h-2 rounded-full bg-success" />
              Backend: localhost:3001
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="px-8 py-8 max-w-3xl mx-auto">
          <SectionView section={activeSection} />
        </div>
      </main>
    </div>
  );
}
