"""
AI pre-visit briefing via Claude.
Accepts a structured data dict and returns a list of clinical observation points.
"""
import json
from app.config import settings


SYSTEM_PROMPT = """You are a farm animal health advisor supporting a veterinary practice.
You will be given structured farm performance data for the past year and the previous year.
Your job is to identify the most clinically significant findings and produce a concise briefing
for the vet attending this farm's annual health review visit.

Output a JSON array of objects with these fields:
  heading  — short title for the observation (max 8 words)
  body     — 2–3 sentences explaining the finding, its significance, and a suggested question
             or action for the vet to raise during the visit
  severity — one of: "info", "warning", "alert"
             info    = notable but not concerning
             warning = worth discussing, may indicate a trend
             alert   = significant deviation, requires direct conversation

Produce 5–7 points ordered by severity (alerts first).
Do not diagnose. Do not recommend specific medicines. Focus on prompting clinical conversation.
Return only the JSON array, no other text."""


def _format_data(data: dict) -> str:
    return json.dumps(data, indent=2, default=str)


async def generate_briefing(farm_data: dict) -> list[dict]:
    """Call Claude and return a list of briefing point dicts."""
    if not settings.anthropic_api_key:
        return _mock_briefing(farm_data)

    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    message = await client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Please generate a pre-visit briefing for this farm:\n\n{_format_data(farm_data)}",
            }
        ],
    )
    raw = message.content[0].text.strip()
    try:
        points = json.loads(raw)
        return points
    except json.JSONDecodeError:
        return [{"heading": "Briefing parse error", "body": raw[:300], "severity": "info"}]


def _mock_briefing(data: dict) -> list[dict]:
    """Returned when ANTHROPIC_API_KEY is not set — useful for local dev UI testing."""
    farm_name = data.get("farm_name", "this farm")
    return [
        {
            "heading": "Antibiotic usage trending upward",
            "body": (
                f"Antibiotic treatment events at {farm_name} have increased for the third consecutive year "
                f"(2023: 4 events → 2024: 6 events → 2025: 11 events), an 83% increase year-on-year. "
                "Consider asking: 'Have you noticed any recurring conditions that prompted these treatments, "
                "and are there husbandry changes we could make to reduce frequency?'"
            ),
            "severity": "alert",
        },
        {
            "heading": "Lamb mortality above benchmark",
            "body": (
                "Lamb mortality is sitting at 3.1% against a practice benchmark of <2.5%. "
                "The increase versus last year (↑0.8pp) warrants investigation into colostrum management "
                "and mis-mothering rates. Ask the farmer about lambing shed management and ewe body condition at lambing."
            ),
            "severity": "warning",
        },
        {
            "heading": "Scanning percentage improved",
            "body": (
                "Scanning percentage increased to 178% from 165% last year, which is a positive trend. "
                "This may partly explain the higher lamb mortality if the flock is carrying more triplets. "
                "Worth confirming whether triplets are being identified and managed separately at lambing."
            ),
            "severity": "info",
        },
        {
            "heading": "Calving spread within target",
            "body": (
                "Suckler calving spread is 7 weeks, within the practice target of <9 weeks. "
                "This is consistent with last year. No action required but acknowledge as a positive."
            ),
            "severity": "info",
        },
        {
            "heading": "Calf pneumonia cases elevated",
            "body": (
                "8 calf pneumonia cases were recorded this year versus 3 last year. "
                "This warrants a conversation about ventilation in the calf shed and vaccination protocol timing. "
                "Ask whether cases cluster in a particular age group or time of year."
            ),
            "severity": "warning",
        },
    ]
