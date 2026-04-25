"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { FarmListItem } from "@/lib/types";

function CompletionBar({ pct }: { pct: number }) {
  const colour = pct >= 75 ? "bg-bfe-green" : pct >= 40 ? "bg-bfe-amber" : "bg-bfe-red";
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${colour} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EnterpriseTag({ type }: { type: string }) {
  const styles: Record<string, string> = {
    sheep: "bg-purple-100 text-purple-700",
    suckler: "bg-amber-100 text-amber-700",
    calf_rearer: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[type] ?? "bg-gray-100 text-gray-600"}`}>
      {type.replace("_", " ")}
    </span>
  );
}

export default function AdminDashboard() {
  const [farms, setFarms] = useState<FarmListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "behind" | "alerts">("all");

  useEffect(() => {
    api.listFarms()
      .then((d) => { setFarms(d as FarmListItem[]); })
      .catch((e) => { console.error("listFarms failed:", e); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = farms.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
                        f.client_ref.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (tab === "behind") return f.completion_pct < 40;
    if (tab === "alerts") return f.alert_count > 0;
    return true;
  });

  const avgCompletion = farms.length
    ? Math.round(farms.reduce((s, f) => s + f.completion_pct, 0) / farms.length)
    : 0;
  const behind = farms.filter((f) => f.completion_pct < 40).length;
  const alerts = farms.filter((f) => f.alert_count > 0).length;

  return (
    <div className="max-w-4xl mx-auto px-5 py-6">
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Active farms", value: farms.length, colour: "text-bfe-purple" },
          { label: "Avg completion", value: `${avgCompletion}%`, colour: avgCompletion >= 60 ? "text-bfe-green" : "text-bfe-amber" },
          { label: "Behind schedule", value: behind, colour: behind > 0 ? "text-bfe-red" : "text-bfe-green" },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className={`text-2xl font-black ${s.colour}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["all", "behind", "alerts"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                ${tab === t ? "bg-white shadow-sm text-bfe-purple" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t === "all" ? `All (${farms.length})` : t === "behind" ? `Behind (${behind})` : `Alerts (${alerts})`}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search farms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-bfe-purple"
        />
      </div>

      {/* Farm list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading farms…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No farms match your filter.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((farm) => (
            <div key={farm.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{farm.name}</span>
                  <span className="text-xs text-gray-400">{farm.client_ref}</span>
                  {farm.enterprise_types.map((e) => <EnterpriseTag key={e} type={e} />)}
                  {farm.alert_count > 0 && (
                    <span className="text-xs font-bold text-bfe-red bg-bfe-red-light px-2 py-0.5 rounded-full">
                      {farm.alert_count} alert{farm.alert_count > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 max-w-[160px]">
                    <CompletionBar pct={farm.completion_pct} />
                  </div>
                  <span className="text-xs text-gray-500">{farm.completion_pct}% this year</span>
                </div>
                {farm.last_response && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Last response: {new Date(farm.last_response).toLocaleDateString("en-GB")}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/admin/farms/${farm.id}/report`}
                  className="text-xs font-semibold px-3 py-2 rounded-lg bg-bfe-purple text-white hover:bg-bfe-purple-dark transition-colors"
                >
                  Report
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
