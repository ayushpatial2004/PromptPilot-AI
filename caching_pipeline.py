"""
Cache-Optimized 3-Layer Prompt Pipeline (Google GenAI SDK)
==========================================================

Layer 1 (Static System Instructions)  -> cached, TTL ~ 1h
Layer 2 (Developer Rules)             -> cached, TTL ~ 1h
Layer 3 (Dynamic User Input)          -> fresh on every call

Install:
    pip install google-genai>=1.0.0 python-dotenv

Set the GEMINI_API_KEY environment variable before running.

A matching JS implementation lives in:
    src/components/CachingPipeline.jsx
    src/config/cachingPipeline.js
"""

import hashlib
import os
import time
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
API_KEY = os.environ["GEMINI_API_KEY"]

MODEL = "gemini-1.5-flash-002"
DEFAULT_TTL = "3600s"  # 1 hour


# ---------------------------------------------------------------------------
# Layer 1: Static System Instructions (Fully Cacheable)
# ---------------------------------------------------------------------------
LAYER_1_SYSTEM_INSTRUCTIONS = """You are PromptPilot, an expert prompt-engineering copilot that rewrites weak or vague prompts into precise, high-signal instructions for large language models.

Operating contract:
1. Preserve the user's original intent and target model.
2. Add only what is necessary: missing context, constraints, output format, edge cases, success criteria.
3. Never invent facts, libraries, or APIs the user did not mention.
4. If the user's request is ambiguous, choose the most reasonable interpretation and surface the assumption.
5. Output MUST be valid JSON only - no markdown, no prose outside the JSON object.

Scoring rubric (0-100 each, compute from the OUTPUT enhanced prompt):
- clarity_score: how unambiguous each instruction is.
- specificity_score: concreteness of inputs, examples, and constraints.
- quality_score: structural soundness, formatting, and edge-case coverage.

Final JSON shape:
{
  "enhanced_prompt": string,
  "domain_detected": string,
  "clarity_score": integer 0-100,
  "specificity_score": integer 0-100,
  "quality_score": integer 0-100,
  "missing_requirements": string[],
  "ambiguities_resolved": string[],
  "transformation_insight": string
}"""


# ---------------------------------------------------------------------------
# Layer 2: Developer / Reference Rules (Cacheable)
# ---------------------------------------------------------------------------
LAYER_2_DEVELOPER_RULES = """Domain frameworks:
- frontend: prefer component-scoped state, accessibility (WCAG AA), responsive layout, semantic HTML.
- backend: explicit error contracts, request/response examples, idempotency, observability hooks.
- fullstack: end-to-end type safety, contract-first API, deployment-shape awareness.
- uiux: typography scale, spacing system, contrast tokens, motion budget.
- writing: audience, tone, format (Markdown/HTML/plain), length target.
- marketing: channel, funnel stage, CTA, brand voice guardrails.
- research: scope, citation style, depth, "stop conditions".
- resume: target role, ATS keywords, quantified impact.
- interview: round type, seniority signal, structured answer (STAR/CAR).
- business: stakeholder, decision needed, format (one-pager/memo/email).
- youtube: hook, retention beats, CTA, target length.
- social: platform, voice, hashtags, character limit.
- education: learner level, prior knowledge, assessment.
- dsa: constraints, time/space target, expected pattern.

Mode overlays:
- technical: deep specs, edge cases, failure modes, testability.
- senior: architecture trade-offs, long-term maintenance, team impact.
- creative: open exploration, multiple framings, optional wild cards.
- concise: tight scope, one default answer, no optionality.
- detailed: exhaustive context, examples, rationale for each decision.
- startup: ship-today bias, opinionated defaults, minimal config.
- beginner: step-by-step, gloss every term, single file when possible."""


@dataclass
class CachedPipeline:
    """Lifecycle wrapper around a single Gemini cached-content resource."""

    cache_name: str
    rules_hash: str
    created_at: float

    @property
    def age_seconds(self) -> float:
        return time.time() - self.created_at


class ThreeLayerPromptPipeline:
    """Production wrapper for the 3-layer prompt caching pipeline."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = MODEL,
        ttl: str = DEFAULT_TTL,
    ) -> None:
        self.client = genai.Client(api_key=api_key or API_KEY)
        self.model = model
        self.ttl = ttl
        self._cache: Optional[CachedPipeline] = None

    # ------------------------------------------------------------------
    # Cache management
    # ------------------------------------------------------------------
    @staticmethod
    def _hash_rules(rules: str) -> str:
        return hashlib.sha256(rules.encode("utf-8")).hexdigest()[:16]

    def _build_cache(self, rules: str) -> CachedPipeline:
        """Create a fresh Gemini cached-content resource from L1 + L2."""
        config = types.CreateCachedContentConfig(
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part(text=LAYER_1_SYSTEM_INSTRUCTIONS)],
                ),
                types.Content(
                    role="user",
                    parts=[types.Part(text=rules)],
                ),
            ],
            ttl=self.ttl,
        )
        resource = self.client.caches.create(model=self.model, config=config)
        return CachedPipeline(
            cache_name=resource.name,
            rules_hash=self._hash_rules(rules),
            created_at=time.time(),
        )

    def get_or_create_cache(self, rules: str) -> CachedPipeline:
        """Reuse the cache when rules are unchanged; rebuild on miss."""
        rules_hash = self._hash_rules(rules)
        ttl_seconds = int(self.ttl.rstrip("s"))
        if (
            self._cache
            and self._cache.rules_hash == rules_hash
            and self._cache.age_seconds < ttl_seconds
        ):
            return self._cache

        self._cache = self._build_cache(rules)
        return self._cache

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------
    def enhance(
        self,
        user_prompt: str,
        developer_rules: str = LAYER_2_DEVELOPER_RULES,
        *,
        temperature: float = 0.4,
        max_output_tokens: int = 1024,
    ) -> str:
        """Run the pipeline: send L1+L2 cached, L3 fresh."""
        cached = self.get_or_create_cache(developer_rules)

        response = self.client.models.generate_content(
            model=self.model,
            contents=user_prompt,  # <-- Layer 3 (dynamic, uncached)
            config=types.GenerateContentConfig(
                cached_content=cached.cache_name,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
            ),
        )
        return response.text


# ---------------------------------------------------------------------------
# Example
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    pipeline = ThreeLayerPromptPipeline()

    raw = "make login page"
    enhanced = pipeline.enhance(raw)
    print(enhanced)
