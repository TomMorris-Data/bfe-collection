"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { FarmListItem } from "@/lib/types";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ENTERPRISE_OPTIONS = [
  { value: "sheep", label: "Sheep" },
  { value: "suckler", label: "Suckler" },
  { value: "calf_rearer", label: "Calf Rearer" },
];

function CompletionBar({ pct }: { pct: number }) {
  const colour = pct >= 75 ? "bg-bfe-green" : pct >= 40 ? "bg-bfe-amber" : "bg-bfe-red";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${colour} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-9 text-right">{pct}%</span>
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
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${styles[type] ?? "bg-gray-100 text-gray-600"}`}>
      {type.replace("_", " ")}
    </span>
  );
}

// ── Add Farm Modal ────────────────────────────────────────────────────────────

function AddFarmModal({ onClose, onCreated }: { onClose: () => void; onCreated: (farm: FarmListItem) => void }) {
  const [form, setForm] = useState({
    name: "", client_ref: "", contact_name: "", email: "",
    phone: "", sbi_no: "", ahwp_agreement_no: "",
    enterprise_types: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleEnterprise(val: string) {
    setForm((f) => ({
      ...f,
      enterprise_types: f.enterprise_types.includes(val)
        ? f.enterprise_types.filter((e) => e !== val)
        : [...f.enterprise_types, val],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.enterprise_types.length === 0) { setErr("Select at least one enterprise type."); return; }
    setSaving(true); setErr(null);
    try {
      const created = await api.createFarm({
        name: form.name,
        client_ref: form.client_ref,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        enterprise_types: form.enterprise_types,
        sbi_no: form.sbi_no || null,
        ahwp_agreement_no: form.ahwp_agreement_no || null,
      }) as { id: string };
      onCreated({
        id: created.id,
        name: form.name,
        client_ref: form.client_ref,
        enterprise_types: form.enterprise_types,
        email: form.email || null,
        completion_pct: 0,
        last_response: null,
        alert_count: 0,
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create farm");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-bfe-purple mb-4">Add farm</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Farm name *</label>
              <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Client ref *</label>
              <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.client_ref}
                onChange={(e) => setForm((f) => ({ ...f, client_ref: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">SBI number</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.sbi_no}
                onChange={(e) => setForm((f) => ({ ...f, sbi_no: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">AHWP agreement no.</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.ahwp_agreement_no}
                onChange={(e) => setForm((f) => ({ ...f, ahwp_agreement_no: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Enterprise types *</label>
            <div className="flex gap-2 flex-wrap">
              {ENTERPRISE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => toggleEnterprise(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${form.enterprise_types.includes(opt.value)
                      ? "bg-bfe-purple text-white border-bfe-purple"
                      : "bg-white text-gray-600 border-gray-200 hover:border-bfe-purple"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-bfe-purple text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
              {saving ? "Saving…" : "Create farm"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Demo Dispatch Panel ───────────────────────────────────────────────────────

function DemoPanel({ farmId, farmName, onClose }: { farmId: string; farmName: string; onClose: () => void }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [result, setResult] = useState<{ url: string; period_start: string; period_end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await api.demoDispatch(farmId, month) as { url: string; period_start: string; period_end: string };
      setResult(r);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Demo</span>
          <h2 className="text-base font-bold text-gray-800">{farmName}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Generate a check-in link for any month without sending an email. Use this to test seasonal questions.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Simulate month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        {result && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm space-y-2">
            <div className="text-xs text-gray-500">
              Period: {new Date(result.period_start).toLocaleDateString("en-GB")} – {new Date(result.period_end).toLocaleDateString("en-GB")}
            </div>
            <a href={result.url} target="_blank" rel="noreferrer"
              className="block text-bfe-purple font-semibold break-all hover:underline text-xs">{result.url}</a>
            <button onClick={() => navigator.clipboard.writeText(result.url)}
              className="text-xs text-gray-500 hover:text-gray-700 underline">Copy link</button>
          </div>
        )}
        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={run} disabled={loading}
            className="flex-1 bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-amber-600">
            {loading ? "Generating…" : "Generate demo link"}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dispatch Button ───────────────────────────────────────────────────────────

function DispatchButton({ farm }: { farm: FarmListItem }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);

  async function dispatch() {
    if (!farm.email) return;
    setState("sending");
    try {
      const r = await api.dispatchCheckin(farm.id) as { url: string };
      setUrl(r.url ?? null);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done" && url) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs text-green-600 font-semibold">Sent ✓</span>
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-bfe-purple underline">Open link</a>
      </div>
    );
  }

  return (
    <button onClick={dispatch} disabled={!farm.email || state === "sending"}
      title={!farm.email ? "No email address on record" : "Send check-in email"}
      className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap
        ${!farm.email ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : state === "error" ? "bg-red-100 text-red-600"
          : "bg-bfe-green text-white hover:opacity-90"}`}>
      {state === "sending" ? "Sending…" : state === "error" ? "Error" : "Dispatch"}
    </button>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [farms, setFarms] = useState<FarmListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "behind" | "alerts">("all");
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [demoFarm, setDemoFarm] = useState<FarmListItem | null>(null);

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
  const noEmail = farms.filter((f) => !f.email).length;

  return (
    <div className="max-w-6xl mx-auto px-5 py-6">
      {showAddFarm && (
        <AddFarmModal
          onClose={() => setShowAddFarm(false)}
          onCreated={(farm) => {
            setFarms((prev) => [...prev, farm].sort((a, b) => a.name.localeCompare(b.name)));
            setShowAddFarm(false);
          }}
        />
      )}
      {demoFarm && (
        <DemoPanel farmId={demoFarm.id} farmName={demoFarm.name} onClose={() => setDemoFarm(null)} />
      )}

      {/* Stat strip — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active farms", value: farms.length, colour: "text-bfe-purple" },
          { label: "Avg completion", value: `${avgCompletion}%`, colour: avgCompletion >= 60 ? "text-bfe-green" : "text-bfe-amber" },
          { label: "Behind schedule", value: behind, colour: behind > 0 ? "text-bfe-red" : "text-bfe-green" },
          { label: "No email", value: noEmail, colour: noEmail > 0 ? "text-bfe-amber" : "text-bfe-green" },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className={`text-2xl font-black ${s.colour}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
          {(["all", "behind", "alerts"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
                ${tab === t ? "bg-white shadow-sm text-bfe-purple" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "all" ? `All (${farms.length})` : t === "behind" ? `Behind (${behind})` : `Alerts (${alerts})`}
            </button>
          ))}
        </div>
        <input type="search" placeholder="Search farms…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-bfe-purple" />
        <button onClick={() => setShowAddFarm(true)}
          className="shrink-0 bg-bfe-purple text-white rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90">
          + Add farm
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading farms…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No farms match your filter.</div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="space-y-3 md:hidden">
            {filtered.map((farm) => (
              <div key={farm.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{farm.name}</span>
                    <span className="text-xs text-gray-400">{farm.client_ref}</span>
                    {farm.enterprise_types.map((e) => <EnterpriseTag key={e} type={e} />)}
                  </div>
                  <div className="mt-2 max-w-[200px]">
                    <CompletionBar pct={farm.completion_pct} />
                  </div>
                  {farm.last_response && (
                    <div className="text-xs text-gray-400 mt-1">
                      Last: {new Date(farm.last_response).toLocaleDateString("en-GB")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => setDemoFarm(farm)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700">Demo</button>
                  <DispatchButton farm={farm} />
                  <Link href={`/admin/farms/${farm.id}/report`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-bfe-purple text-white text-center">Report</Link>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (hidden below md) ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Farm</th>
                  <th className="text-left px-4 py-3">Enterprises</th>
                  <th className="text-left px-4 py-3 w-44">Completion</th>
                  <th className="text-left px-4 py-3 w-28">Last check-in</th>
                  <th className="text-right px-5 py-3 w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((farm) => (
                  <tr key={farm.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-800 leading-tight">{farm.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{farm.client_ref}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {farm.enterprise_types.map((e) => <EnterpriseTag key={e} type={e} />)}
                        {farm.alert_count > 0 && (
                          <span className="text-xs font-bold text-bfe-red bg-bfe-red-light px-2 py-0.5 rounded-full">
                            {farm.alert_count} alert{farm.alert_count > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <CompletionBar pct={farm.completion_pct} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {farm.last_response
                        ? new Date(farm.last_response).toLocaleDateString("en-GB")
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setDemoFarm(farm)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                          Demo
                        </button>
                        <DispatchButton farm={farm} />
                        <Link href={`/admin/farms/${farm.id}/report`}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-bfe-purple text-white hover:opacity-90 transition-opacity">
                          Report
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              {filtered.length} farm{filtered.length !== 1 ? "s" : ""}
              {filtered.length !== farms.length ? ` (filtered from ${farms.length})` : ""}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
