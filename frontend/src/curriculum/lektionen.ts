export interface Lektion {
  id: string;
  number: number;
  module: number;
  level: "A1.1" | "A1.2";
  title: string;
  wortfelder: string[];
  grammar: string[];
}

export const LEKTIONEN: Lektion[] = [
  { id: "l01", number: 1, module: 1, level: "A1.1", title: "Länder, Alphabet", wortfelder: ["Länder", "Alphabet"], grammar: ["Verbkonjugation Singular", "W-Fragen"] },
  { id: "l02", number: 2, module: 1, level: "A1.1", title: "Berufe, Familienstand, Zahlen 1–100", wortfelder: ["Berufe", "Familienstand", "Zahlen 1–100"], grammar: ["Verbkonjugation Singular und Plural", "Negation mit nicht", "Wortbildung -in"] },
  { id: "l03", number: 3, module: 1, level: "A1.1", title: "Familie, Sprachen", wortfelder: ["Familie", "Sprachen"], grammar: ["Ja/Nein-Fragen (ja – nein – doch)", "Possessivartikel mein/dein", "Verben mit Vokalwechsel"] },
  { id: "l04", number: 4, module: 2, level: "A1.1", title: "Zahlen 100–1.000.000, Möbel, Adjektive", wortfelder: ["Zahlen 100–1.000.000", "Möbel", "Adjektive"], grammar: ["definiter Artikel der/das/die", "Personalpronomen er/es/sie"] },
  { id: "l05", number: 5, module: 2, level: "A1.1", title: "Farben, Dinge, Materialien, Formen", wortfelder: ["Farben", "Dinge", "Materialien", "Formen"], grammar: ["indefiniter Artikel ein/ein/eine", "Negativartikel kein/kein/keine"] },
  { id: "l06", number: 6, module: 2, level: "A1.1", title: "Büro, Computer", wortfelder: ["Büro", "Computer"], grammar: ["Singular – Plural", "Akkusativ"] },
  { id: "l07", number: 7, module: 3, level: "A1.1", title: "Freizeitaktivitäten", wortfelder: ["Freizeitaktivitäten"], grammar: ["Modalverb können", "Satzklammer"] },
  { id: "l08", number: 8, module: 3, level: "A1.1", title: "Tageszeiten, Wochentage, Uhrzeiten", wortfelder: ["Tageszeiten", "Wochentage", "Uhrzeiten", "Freizeitaktivitäten"], grammar: ["Verbposition im Satz", "temporale Präpositionen am, um"] },
  { id: "l09", number: 9, module: 3, level: "A1.1", title: "Lebensmittel und Speisen", wortfelder: ["Lebensmittel", "Speisen"], grammar: ["Konjugation mögen, möchte", "Wortbildung Nomen + Nomen"] },
  { id: "l10", number: 10, module: 4, level: "A1.1", title: "Verkehrsmittel, Reisen", wortfelder: ["Verkehrsmittel", "Reisen"], grammar: ["trennbare Verben"] },
  { id: "l11", number: 11, module: 4, level: "A1.1", title: "Alltagsaktivitäten", wortfelder: ["Alltagsaktivitäten"], grammar: ["Perfekt mit haben", "temporale Präpositionen von … bis, ab"] },
  { id: "l12", number: 12, module: 4, level: "A1.1", title: "Jahreszeiten, Monate", wortfelder: ["Jahreszeiten", "Monate"], grammar: ["Perfekt mit sein", "temporale Präposition im"] },
  { id: "l13", number: 13, module: 5, level: "A1.2", title: "Wege beschreiben", wortfelder: ["Wege beschreiben"], grammar: ["Lokale Präpositionen + Dativ"] },
  { id: "l14", number: 14, module: 5, level: "A1.2", title: "Wohnen", wortfelder: ["Wohnen"], grammar: ["Possessivartikel sein – ihr", "Genitiv bei Eigennamen"] },
  { id: "l15", number: 15, module: 5, level: "A1.2", title: "In der Stadt", wortfelder: ["In der Stadt"], grammar: ["Verben mit Dativ", "Personalpronomen im Dativ"] },
  { id: "l16", number: 16, module: 6, level: "A1.2", title: "Termine", wortfelder: ["Termine"], grammar: ["temporale Präpositionen vor, nach, in, für"] },
  { id: "l17", number: 17, module: 6, level: "A1.2", title: "Pläne und Wünsche", wortfelder: ["Pläne und Wünsche"], grammar: ["Präpositionen mit/ohne", "Modalverb wollen"] },
  { id: "l18", number: 18, module: 6, level: "A1.2", title: "Gesundheit und Krankheit", wortfelder: ["Gesundheit", "Krankheit"], grammar: ["Imperativ (Sie)", "Modalverb sollen"] },
  { id: "l19", number: 19, module: 7, level: "A1.2", title: "Aussehen und Charakter", wortfelder: ["Aussehen", "Charakter"], grammar: ["Präteritum war, hatte", "Perfekt nicht trennbare Verben", "Wortbildung un-"] },
  { id: "l20", number: 20, module: 7, level: "A1.2", title: "Im Haushalt", wortfelder: ["Im Haushalt"], grammar: ["Imperativ (du/ihr)", "Personalpronomen im Akkusativ"] },
  { id: "l21", number: 21, module: 7, level: "A1.2", title: "Regeln", wortfelder: ["Regeln"], grammar: ["Modalverben dürfen, müssen"] },
  { id: "l22", number: 22, module: 8, level: "A1.2", title: "Kleidung", wortfelder: ["Kleidung"], grammar: ["Komparation", "Vergleiche"] },
  { id: "l23", number: 23, module: 8, level: "A1.2", title: "Wetter", wortfelder: ["Wetter"], grammar: ["Wortbildung -los", "Konjunktion denn"] },
  { id: "l24", number: 24, module: 8, level: "A1.2", title: "Feste und Feiern", wortfelder: ["Feste", "Feiern"], grammar: ["Konjunktiv II würde", "Ordinalzahlen"] },
];
