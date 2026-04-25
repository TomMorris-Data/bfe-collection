"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { CheckInData } from "@/lib/types";
import FarmHome from "@/components/farmer/FarmHome";
import QuestionStep from "@/components/farmer/QuestionStep";
import SuccessScreen from "@/components/farmer/SuccessScreen";

type Screen = "loading" | "error" | "home" | "form" | "done";

export default function CheckInPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<CheckInData | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [error, setError] = useState("");
  const [responses, setResponses] = useState<Record<string, string | number | null>>({});

  useEffect(() => {
    api.getCheckin(token)
      .then((d) => {
        const checkin = d as CheckInData;
        setData(checkin);
        setResponses(checkin.existing_responses ?? {});
        setScreen(checkin.completed ? "done" : "home");
      })
      .catch(() => {
        setError("This link has expired or is invalid. Please check your email for a newer link.");
        setScreen("error");
      });
  }, [token]);

  const handleSave = async (updated: Record<string, string | number | null>) => {
    setResponses(updated);
    const payload = Object.entries(updated).map(([key, val]) => {
      const q = data!.questions.find((q) => q.key === key)!;
      return {
        question_key: key,
        section: q.section,
        value_num: typeof val === "number" ? val : null,
        value_text: q.type === "text" ? String(val ?? "") : null,
        value_option: q.type === "option" || q.type === "boolean" ? String(val ?? "") : null,
      };
    });
    await api.saveResponses(token, payload);
  };

  const handleComplete = async (final: Record<string, string | number | null>) => {
    const payload = Object.entries(final).map(([key, val]) => {
      const q = data!.questions.find((q) => q.key === key)!;
      return {
        question_key: key,
        section: q.section,
        value_num: typeof val === "number" ? val : null,
        value_text: q.type === "text" ? String(val ?? "") : null,
        value_option: q.type === "option" || q.type === "boolean" ? String(val ?? "") : null,
      };
    });
    await api.completeCheckin(token, payload);
    setScreen("done");
  };

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-bfe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-xl font-bold mb-2">Link not found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (screen === "done") {
    return <SuccessScreen farm={data.farm} periodStart={data.period_start} />;
  }

  if (screen === "home") {
    return (
      <FarmHome
        farm={data.farm}
        periodStart={data.period_start}
        periodEnd={data.period_end}
        questionCount={data.questions.length}
        existingCount={Object.keys(responses).length}
        onStart={() => setScreen("form")}
      />
    );
  }

  return (
    <QuestionStep
      questions={data.questions}
      responses={responses}
      onSave={handleSave}
      onComplete={handleComplete}
      onBack={() => setScreen("home")}
    />
  );
}
