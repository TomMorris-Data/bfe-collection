"use client";
import { useState } from "react";
import type { Question } from "@/lib/types";

interface Props {
  questions: Question[];
  responses: Record<string, string | number | null>;
  onSave: (updated: Record<string, string | number | null>) => Promise<void>;
  onComplete: (final: Record<string, string | number | null>) => Promise<void>;
  onBack: () => void;
}

export default function QuestionStep({ questions, responses, onSave, onComplete, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [local, setLocal] = useState<Record<string, string | number | null>>({ ...responses });
  const [saving, setSaving] = useState(false);

  const q = questions[index];
  const value = local[q.key] ?? null;
  const isLast = index === questions.length - 1;
  const progress = Math.round(((index + 1) / questions.length) * 100);

  const setValue = (v: string | number | null) => setLocal((prev) => ({ ...prev, [q.key]: v }));

  const handleNext = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    if (isLast) {
      await onComplete(local);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleSaveAndLeave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 no-print">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Question {index + 1} of {questions.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-bfe-purple rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 px-5 py-8 max-w-lg mx-auto w-full">
        <div className="text-xs font-bold uppercase tracking-wide text-bfe-purple mb-2">
          {q.section.replace(/_/g, " ")}
        </div>
        <h2 className="text-xl font-bold mb-2">{q.label}</h2>
        {q.hint && <p className="text-sm text-gray-500 mb-6">{q.hint}</p>}

        {/* Number input */}
        {q.type === "number" && (
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <button
                className="w-14 h-14 shrink-0 rounded-2xl bg-gray-100 text-2xl font-bold flex items-center justify-center
                           hover:bg-gray-200 active:scale-95 transition-all"
                onClick={() => setValue(Math.max(0, (Number(value) || 0) - 1))}
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={value ?? ""}
                onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))}
                className="w-0 flex-1 min-w-0 text-center text-3xl font-bold border-2 border-gray-200 rounded-2xl py-4
                           focus:border-bfe-purple focus:outline-none
                           [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                className="w-14 h-14 shrink-0 rounded-2xl bg-bfe-purple text-white text-2xl font-bold flex items-center justify-center
                           hover:bg-bfe-purple-dark active:scale-95 transition-all"
                onClick={() => setValue((Number(value) || 0) + 1)}
              >
                +
              </button>
            </div>
            {q.unit && <div className="text-center text-sm text-gray-400 mt-2">{q.unit}</div>}
          </div>
        )}

        {/* Text input */}
        {q.type === "text" && (
          <textarea
            className="w-full mt-4 border-2 border-gray-200 rounded-xl p-4 text-base
                       focus:border-bfe-purple focus:outline-none resize-none"
            rows={4}
            placeholder="Type your answer here…"
            value={String(value ?? "")}
            onChange={(e) => setValue(e.target.value)}
          />
        )}

        {/* Option select */}
        {q.type === "option" && q.options && (
          <div className="flex flex-col gap-3 mt-4">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setValue(opt)}
                className={`w-full text-left py-4 px-5 rounded-xl border-2 font-medium transition-all
                  ${value === opt
                    ? "border-bfe-purple bg-bfe-purple text-white"
                    : "border-gray-200 bg-white hover:border-bfe-purple hover:bg-bfe-purple-light"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Boolean */}
        {q.type === "boolean" && (
          <div className="flex gap-4 mt-4">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => setValue(opt)}
                className={`flex-1 py-5 rounded-xl border-2 font-bold text-lg transition-all
                  ${value === opt
                    ? "border-bfe-purple bg-bfe-purple text-white"
                    : "border-gray-200 bg-white hover:border-bfe-purple"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-8 pt-4 max-w-lg mx-auto w-full space-y-3 no-print">
        <button
          onClick={handleNext}
          disabled={saving || value === null}
          className="btn-primary w-full"
        >
          {saving ? "Saving…" : isLast ? "Submit check-in" : "Next →"}
        </button>
        <button onClick={handleSaveAndLeave} disabled={saving} className="btn-secondary w-full">
          Save &amp; come back later
        </button>
      </div>
    </div>
  );
}
