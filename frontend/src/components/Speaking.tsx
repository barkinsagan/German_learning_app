export function Speaking() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Sprechen — Speaking
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          Practice speaking German aloud and get pronunciation feedback.
        </p>
      </div>

      {/* Placeholder mic card */}
      <div className="card border-dashed border-white/10 flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="relative">
          <div className="text-5xl">🎤</div>
          <div className="absolute -inset-4 rounded-full border border-accent/20 animate-ping" />
        </div>
        <div>
          <p className="text-text-primary font-semibold">Coming Soon</p>
          <p className="text-text-secondary text-sm mt-1 max-w-sm">
            Speaking exercises will use Web Speech API for recording, with
            Gemini analyzing pronunciation, fluency, and vocabulary usage.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {["Pronunciation", "Role-play", "Conversation"].map((tag) => (
            <span
              key={tag}
              className="badge bg-surface-raised text-text-muted border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
