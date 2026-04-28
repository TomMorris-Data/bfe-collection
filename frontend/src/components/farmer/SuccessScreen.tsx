import type { Farm } from "@/lib/types";

interface Props {
  farm: Farm;
  periodStart: string;
}

function nextCheckin(iso: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function SuccessScreen({ farm, periodStart }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-bfe-green-light rounded-full flex items-center justify-center mb-6">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="#3A8C3F" />
          <path d="M12 20l6 6 10-12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">Check-in complete!</h1>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Thanks, {farm.contact_name || farm.name}. Your data has been sent to Belmont Farm &amp; Equine Vets.
      </p>
      <div className="card max-w-xs w-full text-left">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">What happens next</div>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex gap-3">
            <span className="text-bfe-purple font-bold">1</span>
            <span>Your vet reviews your responses on the practice dashboard</span>
          </div>
          <div className="flex gap-3">
            <span className="text-bfe-purple font-bold">2</span>
            <span>Any urgent concerns will be flagged and they may be in touch</span>
          </div>
          <div className="flex gap-3">
            <span className="text-bfe-purple font-bold">3</span>
            <span>Your next check-in link arrives on <strong>{nextCheckin(periodStart)}</strong></span>
          </div>
        </div>
      </div>
      <button
        onClick={() => window.close()}
        className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        Close this window
      </button>
    </div>
  );
}
