"""
Milestone 7 — Prompt construction and local Ollama chat call.
"""
from __future__ import annotations

import json
from typing import Any

import httpx


DISCLAIMER_TEXT = (
    "Deadlines, eligibility, and requirements may change. "
    "Always verify details on the official application link."
)


def _safe(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def format_context_blocks(rows: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for i, row in enumerate(rows, start=1):
        title = _safe(row.get("title")) or "Untitled scholarship"
        url = _safe(row.get("url")) or "N/A"
        deadline = _safe(row.get("deadline")) or "Unknown"
        country = _safe(row.get("country")) or "Unknown"
        degree = _safe(row.get("degree_level")) or "Unknown"
        funding = _safe(row.get("funding_type")) or "Unknown"
        chunk_id = _safe(row.get("chunk_id")) or f"chunk-{i}"
        chunk_text = _safe(row.get("chunk_text"))
        lines.append(
            "\n".join(
                [
                    f"[{i}] chunk_id={chunk_id}",
                    f"title: {title}",
                    f"url: {url}",
                    f"deadline: {deadline}",
                    f"country: {country}",
                    f"degree_level: {degree}",
                    f"funding_type: {funding}",
                    f"content: {chunk_text}",
                ]
            )
        )
    return "\n\n".join(lines)


def is_eligibility_question(message: str) -> bool:
    lower = message.lower()
    return any(
        phrase in lower
        for phrase in (
            "am i eligible",
            "eligible for",
            "eligibility for",
            "do i qualify",
            "can i apply",
            "qualify for",
        )
    )


def build_scholarship_prompt(
    user_message: str,
    retrieved_rows: list[dict[str, Any]],
    filters: dict[str, Any] | None = None,
    *,
    profile: dict[str, Any] | None = None,
    eligibility_assessment: str | None = None,
) -> tuple[str, str]:
    """RAG-only prompt for scholarship lookup questions."""
    filter_json = json.dumps(filters or {}, ensure_ascii=False)
    context = format_context_blocks(retrieved_rows)
    eligibility = is_eligibility_question(user_message)

    system_prompt = (
        "You are Scholar Assistant for scholarship search.\n"
        "Rules:\n"
        "1) Use only facts from CONTEXT blocks.\n"
        "2) Do not invent deadlines, eligibility, links, amounts, or locations.\n"
        "3) If context is insufficient, say what is missing and suggest checking official links.\n"
        "4) Keep answers concise and practical.\n"
        "5) Respond in plain natural language only — do NOT include headings like 'Answer:' or a citations list.\n"
    )
    if eligibility and profile and eligibility_assessment:
        system_prompt += (
            "6) The user is signed in. Use USER_PROFILE and ELIGIBILITY_ASSESSMENT to explain how their "
            "platform profile compares to each scholarship (matches, partial matches, mismatches, unknowns).\n"
            "7) Do NOT ask the user to provide profile details — they are already loaded from the platform.\n"
            "8) Never say 'you are not eligible' unless ELIGIBILITY_ASSESSMENT overall is likely_mismatch "
            "with clear mismatches; prefer 'may not fit' or 'verify on the official page'.\n"
        )
    elif eligibility:
        system_prompt += (
            "6) For personal eligibility without a linked profile: summarize general requirements from CONTEXT "
            "and note that signing in with a completed platform profile enables personalized matching.\n"
        )

    profile_block = ""
    if profile:
        profile_block = f"USER_PROFILE:\n{json.dumps(profile, ensure_ascii=False, indent=2)}\n\n"
    assessment_block = ""
    if eligibility_assessment:
        assessment_block = f"ELIGIBILITY_ASSESSMENT:\n{eligibility_assessment}\n\n"

    user_prompt = (
        f"USER_QUESTION:\n{user_message.strip()}\n\n"
        f"{profile_block}"
        f"{assessment_block}"
        f"APPLIED_FILTERS_JSON:\n{filter_json}\n\n"
        f"CONTEXT:\n{context if context else '[none]'}\n\n"
        f"End with a brief reminder: {DISCLAIMER_TEXT}"
    )
    return system_prompt, user_prompt


def build_prompt(
    user_message: str,
    retrieved_rows: list[dict[str, Any]],
    filters: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """Alias for scholarship RAG prompt (backward compatible)."""
    return build_scholarship_prompt(user_message, retrieved_rows, filters)


def build_general_prompt(
    user_message: str,
    *,
    is_greeting: bool = False,
    optional_suggestions: list[dict[str, Any]] | None = None,
) -> tuple[str, str]:
    """Direct LLM answer; scholarships only as optional add-on, not primary."""
    system_prompt = (
        "You are Scholar Assistant, a helpful advisor for international students.\n"
        "Rules:\n"
        "1) Answer the user's exact question first — they may NOT be asking about scholarships.\n"
        "2) Do NOT invent scholarship names, deadlines, URLs, or eligibility rules.\n"
        "3) Do NOT dump a list of scholarships unless the user asked for them.\n"
        "4) Keep tone friendly and practical.\n"
    )
    if is_greeting:
        user_prompt = (
            f"USER_MESSAGE:\n{user_message.strip()}\n\n"
            "Respond with a brief greeting and offer to help find or compare scholarships. "
            "Do not list specific programs."
        )
    else:
        suggestions_block = ""
        if optional_suggestions:
            suggestions_block = (
                "\n\nOPTIONAL_SCHOLARSHIPS (only mention if naturally helpful after answering; "
                "use titles/urls exactly as given):\n"
                + format_context_blocks(optional_suggestions)
            )
        user_prompt = (
            f"USER_QUESTION:\n{user_message.strip()}\n\n"
            "Answer the question directly in 2-5 sentences."
            f"{suggestions_block}\n\n"
            "If you mention optional scholarships, add a short 'You might also explore' line at the end."
        )
    return system_prompt, user_prompt


def build_mixed_prompt(
    user_message: str,
    retrieved_rows: list[dict[str, Any]],
    filters: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """Personal/concern answer first, then grounded scholarship matches."""
    filter_json = json.dumps(filters or {}, ensure_ascii=False)
    context = format_context_blocks(retrieved_rows)

    system_prompt = (
        "You are Scholar Assistant for students exploring scholarships abroad.\n"
        "Rules:\n"
        "1) Part 1: address the user's personal/concern part empathetically (no invented facts).\n"
        "2) Part 2: use ONLY CONTEXT blocks for scholarship facts.\n"
        "3) Do not invent deadlines, eligibility, links, or amounts.\n"
        "4) Respond in plain natural language only — do NOT include headings like 'Answer:' or a citations list.\n"
    )

    user_prompt = (
        f"USER_MESSAGE:\n{user_message.strip()}\n\n"
        f"APPLIED_FILTERS_JSON:\n{filter_json}\n\n"
        f"SCHOLARSHIP_CONTEXT:\n{context if context else '[none]'}\n\n"
        "First address their concern, then mention relevant scholarships from context.\n"
        f"End with a brief reminder: {DISCLAIMER_TEXT}"
    )
    return system_prompt, user_prompt


def insufficient_context_answer(retrieved_rows: list[dict[str, Any]]) -> str:
    if not retrieved_rows:
        return (
            "I could not find enough matching scholarship context in the current index. "
            "Please broaden your query or filters, and verify details on official program links."
        )
    return (
        "I found limited context and cannot safely confirm full details. "
        "Please verify requirements and deadlines on the official links below."
    )


def ollama_chat(
    host: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    timeout_seconds: int = 120,
) -> str:
    url = host.rstrip("/") + "/api/chat"
    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "options": {"temperature": 0.2},
    }
    with httpx.Client(timeout=timeout_seconds) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    msg = data.get("message") if isinstance(data, dict) else None
    content = msg.get("content") if isinstance(msg, dict) else ""
    return _safe(content)
