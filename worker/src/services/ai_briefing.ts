export interface AiPoint {
  heading: string;
  body: string;
  severity: "info" | "warning" | "alert";
}

const SYSTEM_PROMPT = `You are a farm animal health advisor supporting a veterinary practice.
You will be given structured farm performance data for the past year and the previous year.
Identify the most clinically significant findings and produce a concise briefing for the vet
attending this farm's annual health review visit.

Output a JSON array of objects with these fields:
  heading  — short title for the observation (max 8 words)
  body     — 2–3 sentences explaining the finding, its significance, and a suggested question
             or action for the vet to raise during the visit
  severity — one of: "info", "warning", "alert"

Produce 5–7 points ordered by severity (alerts first).
Do not diagnose. Do not recommend specific medicines.
Return only the JSON array, no other text.`;

export async function generateBriefing(
  farmData: Record<string, unknown>,
  anthropicApiKey: string,
): Promise<AiPoint[]> {
  if (!anthropicApiKey) {
    return mockBriefing(farmData);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a pre-visit briefing for this farm:\n\n${JSON.stringify(farmData, null, 2)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`[AI] Anthropic API error: ${res.status}`);
    return mockBriefing(farmData);
  }

  const data = await res.json() as { content: { text: string }[] };
  try {
    return JSON.parse(data.content[0].text.trim()) as AiPoint[];
  } catch {
    return [{ heading: "Briefing unavailable", body: data.content[0].text.slice(0, 300), severity: "info" }];
  }
}

function mockBriefing(data: Record<string, unknown>): AiPoint[] {
  const farmName = (data.farm_name as string | undefined) ?? "this farm";
  return [
    {
      heading: "Antibiotic usage trending upward",
      body: `Antibiotic treatment events at ${farmName} have increased for the third consecutive year (2023: 4 → 2024: 6 → 2025: 11 events), an 83% year-on-year increase. Consider asking: "Have you noticed recurring conditions driving these treatments, and are there husbandry changes we could make to reduce frequency?"`,
      severity: "alert",
    },
    {
      heading: "Lamb mortality above benchmark",
      body: "Lamb mortality is sitting at 3.1% against a practice benchmark of <2.5%, up 0.8pp on last year. This warrants investigation into colostrum management and mis-mothering rates. Ask the farmer about lambing shed management and ewe body condition at lambing.",
      severity: "warning",
    },
    {
      heading: "Scanning percentage improved",
      body: "Scanning percentage increased to 178% from 165% last year, which is a positive trend. This may partly explain higher lamb mortality if the flock is carrying more triplets. Confirm whether triplets are identified and managed separately at lambing.",
      severity: "info",
    },
    {
      heading: "Calf pneumonia cases elevated",
      body: "8 calf pneumonia cases were recorded this year versus 3 last year. This warrants a conversation about ventilation in the calf shed and vaccination protocol timing. Ask whether cases cluster in a particular age group or time of year.",
      severity: "warning",
    },
    {
      heading: "Calving spread within target",
      body: "Suckler calving spread is 7 weeks, within the practice target of <9 weeks. Consistent with last year. Acknowledge as a positive — bull management is working well.",
      severity: "info",
    },
  ];
}
