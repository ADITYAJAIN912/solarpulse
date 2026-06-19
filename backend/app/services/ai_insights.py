"""
AI root-cause analysis for SolarPulse alerts via the Groq API.

When a plant is flagged Warning or Critical, this service sends structured
performance context to a Groq-hosted LLM (default: llama-3.3-70b-versatile)
and receives a constrained root-cause diagnosis with a concrete maintenance action.

Prompt design choices
---------------------
1. Fixed root-cause taxonomy — the model must pick exactly one label from a
   closed list so the dashboard can filter, badge, and route alerts
   consistently.  Free-text causes would fragment analytics.

2. Causal-chain instruction — Solar underperformance has many correlates
   (temperature, irradiance, time of day).  The prompt explicitly rejects
   bare correlation ("temperature rose, output fell") and requires a
   mechanistic narrative: what failed, why that failure would produce the
   observed hourly pattern, and why alternative causes are less likely.

3. JSON response mode — response_format={"type": "json_object"} (OpenAI-
   compatible) eliminates markdown fences and makes parsing reliable in
   production.

4. ML context injection — Isolation Forest anomaly scores are included when
   available so the LLM can distinguish a broad weather dip from a sharp,
   localized deviation at specific peak-sun hours.

5. Graceful degradation — Any API failure returns a safe fallback dict so
   alerting never blocks on an external dependency (PRD NFR: reliability).
"""

import json
import logging
import re
from typing import Any

from groq import Groq

from app.config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger(__name__)

ROOT_CAUSES: list[str] = [
    "panel_soiling",
    "shading",
    "hotspot",
    "inverter_overheating",
    "string_fault",
    "sensor_failure",
    "weather_impact",
    "unknown",
]

VALID_CONFIDENCE_LEVELS: set[str] = {"low", "medium", "high"}

GROQ_TIMEOUT_SECONDS: int = 30


def _fallback_response(reason: str = "unavailable") -> dict[str, str]:
    """
    Return a safe default when Gemini cannot be reached or returns invalid data.

    The reason string is intentionally kept out of the user-facing explanation
    to avoid exposing raw API errors in the dashboard.
    It is only emitted to the server log.
    """
    logger.warning("AI insight fallback triggered — reason: %s", reason)

    # Detect quota / rate-limit errors so we can give a more specific message.
    quota_hit = (
        "429" in reason
        or "quota" in reason.lower()
        or "rate_limit" in reason.lower()
        or "billing" in reason.lower()
    )

    if quota_hit:
        explanation = (
            "Automated AI analysis could not be generated for this alert because "
            "the Groq API rate limit has been reached. "
            "The fault pattern data is still available above — review the flagged "
            "hours and compare plant-level output against inverter-level readings "
            "to localise the issue manually."
        )
        action = (
            "1. Inspect Inverter A and Inverter B event logs for the flagged hour window. "
            "2. Compare string-level current readings to isolate which sub-array is affected. "
            "3. Check for physical obstructions, soiling, or loose DC connections. "
            "To restore AI analysis, wait a moment for the rate limit window to reset, "
            "then revisit this plant's detail page."
        )
    else:
        explanation = (
            "Automated AI analysis was temporarily unavailable when this alert was created. "
            "Review the flagged hours above and compare plant-level versus inverter-level "
            "output to narrow the fault locally."
        )
        action = (
            "Pull inverter event logs and SCADA trend data for the flagged hours. "
            "Dispatch a technician for a string-level continuity check if "
            "underperformance persists beyond 24 hours."
        )

    return {
        "root_cause": "unknown",
        "explanation": explanation,
        "suggested_action": action,
        "confidence_level": "low",
    }


def _build_prompt(plant_data: dict[str, Any]) -> str:
    """Assemble the user prompt with all performance context."""
    flagged_lines: list[str] = []
    for fh in plant_data.get("flagged_hours", []):
        flagged_lines.append(
            f"  - Hour {fh['hour']:02d}:00 — PR {fh['performance_ratio_pct']:.1f}% "
            f"({fh.get('severity', 'warning')})"
        )

    anomaly_lines: list[str] = []
    for ah in plant_data.get("anomalous_hours", []):
        anomaly_lines.append(
            f"  - Hour {ah['hour']:02d}:00 — PR {ah['performance_ratio_pct']:.1f}%, "
            f"Isolation Forest score {ah['anomaly_score']:.4f}"
        )

    flagged_block = "\n".join(flagged_lines) if flagged_lines else "  (none)"
    anomaly_block = (
        "\n".join(anomaly_lines)
        if anomaly_lines
        else "  (Isolation Forest model not fitted or no anomalous hours detected)"
    )

    root_cause_list = ", ".join(ROOT_CAUSES)

    return f"""You are a senior solar plant reliability engineer analyzing an underperformance alert.

PLANT CONTEXT
- Name: {plant_data.get("plant_name", "Unknown")}
- Location: {plant_data.get("location", "Unknown")}
- Installed capacity: {plant_data.get("capacity_mw", 0)} MW
- Evaluation date: {plant_data.get("date", "Unknown")}

PERFORMANCE SUMMARY
- Overall daily Performance Ratio (PR): {plant_data.get("overall_pr_pct", "N/A")}%
- Severity: {plant_data.get("severity", "unknown")}
- Risk score: {plant_data.get("risk_score", "N/A")} / 100

RULE-BASED FLAGGED HOURS (PR below 85% threshold)
{flagged_block}

ML ANOMALY DETECTION (Isolation Forest — lower scores = stronger anomaly signal)
{anomaly_block}

TASK
Diagnose the most likely root cause of this underperformance.

REQUIREMENTS
1. Pick exactly ONE root_cause from this fixed list only: [{root_cause_list}]
2. Write explanation as causal-chain reasoning — describe the failure mechanism
   and why it produces THIS hourly pattern.  Reject bare correlation.
   GOOD: "Output dropped sharply during peak sun hours while neighboring hours
   remained near expected — this pattern is inconsistent with widespread weather
   impact and more consistent with a localized string-level fault disconnecting
   part of the array."
   BAD: "Temperature went up and power went down."
3. suggested_action must be a specific, time-bound maintenance step an operator
   can execute (not vague advice like "monitor the system").
4. confidence_level must be exactly one of: low, medium, high
   - high: pattern clearly matches one root cause
   - medium: most likely cause identified but alternatives remain
   - low: insufficient signal or conflicting indicators

Respond with strict JSON only — no markdown, no extra keys:
{{
  "root_cause": "<one value from the fixed list>",
  "explanation": "<causal-chain narrative>",
  "suggested_action": "<concrete next step>",
  "confidence_level": "<low|medium|high>"
}}"""


def _extract_json(text: str) -> dict[str, Any]:
    """Parse JSON from LLM output, stripping optional markdown fences."""
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1)
    return json.loads(cleaned)


def _validate_and_normalize(parsed: dict[str, Any]) -> dict[str, str]:
    """Ensure LLM output matches the required schema and allowed values."""
    root_cause = parsed.get("root_cause", "unknown")
    if root_cause not in ROOT_CAUSES:
        root_cause = "unknown"

    confidence = parsed.get("confidence_level", "low")
    if confidence not in VALID_CONFIDENCE_LEVELS:
        confidence = "low"

    explanation = str(parsed.get("explanation", "")).strip()
    suggested_action = str(parsed.get("suggested_action", "")).strip()

    if not explanation or not suggested_action:
        raise ValueError("LLM response missing explanation or suggested_action")

    return {
        "root_cause": root_cause,
        "explanation": explanation,
        "suggested_action": suggested_action,
        "confidence_level": confidence,
    }


def generate_root_cause_explanation(plant_data: dict[str, Any]) -> dict[str, str]:
    """
    Call the Groq API to produce a root-cause diagnosis for a plant underperformance alert.

    Args:
        plant_data: Context dict with keys:
            plant_name, capacity_mw, location, date, overall_pr_pct,
            severity, risk_score, flagged_hours (list of dicts),
            anomalous_hours (list of dicts, optional).

    Returns:
        Dict with keys: root_cause, explanation, suggested_action, confidence_level.
        On any failure, returns a graceful fallback with root_cause="unknown".
    """
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not set — returning fallback insight")
        return _fallback_response("API key not configured")

    try:
        client = Groq(api_key=GROQ_API_KEY, timeout=GROQ_TIMEOUT_SECONDS)

        prompt = _build_prompt(plant_data)

        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior solar plant reliability engineer. "
                        "Always respond with strict JSON only — no markdown, "
                        "no explanation outside the JSON object."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        raw_text = completion.choices[0].message.content or ""
        if not raw_text.strip():
            raise ValueError("Groq returned an empty response")

        parsed = _extract_json(raw_text)
        return _validate_and_normalize(parsed)

    except Exception as exc:
        logger.warning("Groq root-cause analysis failed: %s", exc)
        return _fallback_response(str(exc)[:200])
