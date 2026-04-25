import type { Farm } from "@/lib/types";

interface Props {
  farm: Farm;
  periodStart: string;
  periodEnd: string;
  questionCount: number;
  existingCount: number;
  onStart: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function seasonLabel(iso: string) {
  const m = new Date(iso).getMonth() + 1;
  if (m >= 12 || m <= 2) return "Winter";
  if (m <= 5) return "Spring";
  if (m <= 8) return "Summer";
  return "Autumn";
}

export default function FarmHome({ farm, periodStart, periodEnd, questionCount, existingCount, onStart }: Props) {
  const pct = questionCount > 0 ? Math.round((existingCount / questionCount) * 100) : 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (1 - pct / 100);
  const enterprises = farm.enterprise_types.map((e) => e.replace("_", " ")).join(" · ");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D1A6B] to-[#5B2C8D] px-5 pt-10 pb-8 text-white">
        <div className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">
          Belmont Farm &amp; Equine Vets
        </div>
        <h1 className="text-2xl font-bold">{farm.name}</h1>
        <div className="text-sm opacity-70 mt-1">{enterprises}</div>

        {/* Season + progress */}
        <div className="flex items-center gap-5 mt-6">
          <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke="white" strokeWidth="8"
              strokeDasharray={circ} strokeDashoffset={dash}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="46" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{pct}%</text>
            <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">done</text>
          </svg>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold">{seasonLabel(periodStart)} check-in open</span>
            </div>
            <div className="text-xs opacity-60">
              {formatDate(periodStart)} – {formatDate(periodEnd)}
            </div>
            <div className="text-xs opacity-60 mt-1">
              {questionCount} questions · ~3 minutes
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-6 max-w-lg mx-auto">
        {existingCount > 0 && (
          <div className="bg-bfe-purple-light border border-purple-200 rounded-xl p-4 mb-5 text-sm text-bfe-purple font-medium">
            You&apos;ve already answered {existingCount} of {questionCount} questions. Tap below to continue.
          </div>
        )}

        <div className="card mb-4">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">This check-in covers</div>
          {farm.enterprise_types.includes("sheep") && (
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-lg shrink-0">🐑</div>
              <div>
                <div className="font-semibold text-sm">Sheep health &amp; performance</div>
                <div className="text-xs text-gray-500">Lambing, disease log, treatments</div>
              </div>
            </div>
          )}
          {farm.enterprise_types.includes("suckler") && (
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-lg shrink-0">🐄</div>
              <div>
                <div className="font-semibold text-sm">Suckler health &amp; performance</div>
                <div className="text-xs text-gray-500">Calving, calf health, disease log</div>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-lg shrink-0">💊</div>
            <div>
              <div className="font-semibold text-sm">Treatments this fortnight</div>
              <div className="text-xs text-gray-500">Antibiotics &amp; vaccines</div>
            </div>
          </div>
        </div>

        <button onClick={onStart} className="btn-primary w-full text-base">
          {existingCount > 0 ? "Continue check-in" : "Start check-in"}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          You can save and come back — your link is valid until {formatDate(periodEnd)}
        </p>
      </div>
    </div>
  );
}
