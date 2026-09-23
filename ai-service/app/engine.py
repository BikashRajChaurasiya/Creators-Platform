"""Deterministic heuristic engine backing the AI endpoints.

The responses match the shapes defined in packages/shared:
  ContentAnalysisResult, GeneratedCopy, MatchScore.
"""

import re
from typing import Any, Iterable

# ---------------------------------------------------------------------- helpers


def _n(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _has(s: str | None, *needles: str) -> bool:
    if not s:
        return False
    t = s.lower()
    return any(n in t for n in needles)


def _words(s: str | None) -> int:
    if not s:
        return 0
    return len(re.findall(r"\w+", s, flags=re.UNICODE))


# ------------------------------------------------------------------ analyze-content


def analyze_content(payload: dict) -> dict:
    caption = payload.get("caption") or ""
    file_url = payload.get("fileUrl") or ""
    mime = (payload.get("mimeType") or (file_url.rsplit(".", 1)[-1] if "." in file_url else "")).lower()

    words = _words(caption)
    has_hook = len(caption) >= 80
    has_emojis = bool(re.search(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", caption))
    has_hashtags = _has(caption, "#")
    mentions_brand = _has(payload.get("brandName") or "", "nepal", "ugcnp") or _has(caption, "nepal", "authentic")

    engaging = sum([has_hook, has_emojis, has_hashtags, mentions_brand])

    is_video = any(k in mime for k in ["mp4", "mov", "webm", "video"])
    is_image = any(k in mime for k in ["jpg", "jpeg", "png", "webp", "image"])

    video_quality = 0.9 if is_video else 0.6 if is_image else 0.5
    visual_quality = _clamp(0.5 + 0.1 * words + (0.15 if is_video else 0.0))
    brand_compliance = _clamp(0.55 + 0.15 * mentions_brand + (0.1 if has_hashtags else 0.0))
    logo_placement = _clamp(0.6 + (0.15 if mentions_brand else 0.0) + (0.1 if is_video else 0.0))
    speech_clarity = _clamp(0.5 + (0.2 if is_video else 0.05) + (0.1 if words > 40 else 0.0))
    sentiment = _clamp(0.2 + 0.1 * engaging, -1.0, 1.0)

    checks = {
        "videoQuality": round(video_quality, 2),
        "brandCompliance": round(brand_compliance, 2),
        "logoPlacement": round(logo_placement, 2),
        "speechClarity": round(speech_clarity, 2),
        "sentiment": round(sentiment, 2),
        "visualQuality": round(visual_quality, 2),
    }
    overall = round(sum(checks.values()) / 6, 2)

    flags: list[str] = []
    suggested: list[str] = []
    if words < 20:
        flags.append("caption-too-short")
        suggested.append("Expand the caption to at least 80 characters with a storytelling hook.")
    if not has_hashtags:
        flags.append("missing-hashtags")
        suggested.append("Add 3-5 relevant hashtags to improve discoverability.")
    if not is_video and file_url:
        flags.append("static-asset-only")
        suggested.append("Consider adding short video clips to boost engagement.")
    if brand_compliance < 0.65:
        flags.append("brand-fit-low")
        suggested.append("Reference the brand name and product benefits more explicitly.")

    return {
        "overallScore": overall,
        "checks": checks,
        "flags": flags,
        "suggestedActions": suggested,
    }


# ------------------------------------------------------------------ generate-copy


def generate_copy(payload: dict) -> dict:
    brand = payload.get("brandName") or "the brand"
    product = payload.get("product") or "this product"
    objective = (payload.get("objective") or "brand_awareness").upper()
    audience = payload.get("targetAudience") or payload.get("audience") or ""
    platform = (payload.get("platform") or "INSTAGRAM").lower()

    verb = {
        "PRODUCT_LAUNCH": "unveiling",
        "SALES_CONVERSION": "up for grabs",
        "ENGAGEMENT": "your thoughts",
        "USER_GENERATED_CONTENT": "your take",
        "TRAFFIC": "tap in",
        "BRAND_AWARENESS": "on your radar",
        "BRAND_AWARENESS": "on your radar",
    }.get(objective, "on your radar")

    emoji = "🔥" if "TIKTOK" in platform.upper() else "✨"
    hooks = [
        f"POV: {product} is finally {verb} in Nepal {emoji}",
        f"We put {product} to the test so you don't have to {emoji}",
        f"3 reasons {product} belongs in your routine {emoji}",
        f"{audience or 'Nepal'}, meet your new favourite {emoji}",
    ]
    captions = [
        (
            f"{hooks[0]}\n\n"
            f"@ {brand} has been cooking, and honestly? Worth every Rupee. "
            f"We went hands-on and came back impressed {emoji}\n\n"
            f"📍 Available now across Nepal\n#Nepal #{brand.replace(' ', '')} #ProductReview"
        ),
        (
            f"{hooks[1]}\n\n"
            f"From unboxing to real-world use, here is the honest lowdown on {product} "
            f"by {brand}. Spoiler: yes, we would buy it again {emoji}\n\n"
            f"#MadeInNepal #UGCNP #CreatorPick"
        ),
    ]
    hashtags = ["#NepalCreator", "#BrandName".replace("BrandName", brand.replace(" ", "")), "#UGCNP", "#ProductReview", "#LocalBusinessNP"]
    description = (
        f"Sponsored {platform.upper()} content for {brand}: showcase {product} with an "
        f"honest, local tone, 15-30s, ending with a clear CTA ({verb.lower()}). "
        f"Keep audio in Nepali/English mix."
    )

    return {
        "captions": captions,
        "hooks": hooks,
        "hashtags": hashtags,
        "description": description,
    }


# ------------------------------------------------------------------ match


def match_creators(payload: dict) -> list[dict]:
    req_categories = {c.upper() for c in payload.get("creatorRequirements", {}).get("categories", [])} or None
    min_followers = int(_n(payload.get("creatorRequirements", {}).get("minFollowers"), 0))
    budget_min = _n(payload.get("budget", {}).get("amountMin"), 0)
    budget_max = _n(payload.get("budget", {}).get("amountMax"), 0)
    locations = {l.lower() for l in payload.get("targetLocations", [])}

    candidates = payload.get("candidates") or payload.get("creators") or []
    if not candidates:
        return []

    scored: list[tuple[float, dict]] = []
    for c in candidates:
        cats = {k.upper() for k in (c.get("category") or c.get("categories") or [])}
        if isinstance(cats, str):
            cats = {cats.upper()}
        followers = int(_n(c.get("followersEstimate") or c.get("followers"), 0))
        city = (c.get("city") or "").lower()
        rate = _n(c.get("rateMax"), 0)

        score = 0.5
        reasons: list[str] = []

        if req_categories and cats & req_categories:
            score += 0.2
            reasons.append("matches requested category")
        elif req_categories:
            reasons.append("category not listed")

        if min_followers and followers >= min_followers:
            score += 0.15
            reasons.append(f"followers {followers:,}")
        elif min_followers:
            reasons.append("below follower requirement")

        if locations and city in {l.lower() for l in locations}:
            score += 0.15
            reasons.append("based in target location")
        elif locations:
            reasons.append("outside target location")

        if rate and budget_min and rate <= budget_max:
            score += 0.15
            reasons.append("within budget")
        elif rate and budget_min and rate > budget_max:
            reasons.append("above budget")

        if payload.get("preferVerified") and c.get("verificationStatus") == "VERIFIED":
            score += 0.1
            reasons.append("verified creator")

        scored.append((_clamp(score), c))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "creatorId": c.get("creatorId") or c.get("id") or "",
            "name": c.get("name") or "Unknown creator",
            "score": round(score, 2),
            "reasons": reasons[:4],
        }
        for score, c in scored
    ]


# ------------------------------------------------------------------ predict


def predict(payload: dict) -> dict:
    mode = payload.get("mode") or "engagement"
    if mode == "match":
        return _predict_match(payload)
    if mode == "campaign":
        return _predict_campaign(payload)
    return _predict_engagement(payload)


def _predict_engagement(payload: dict) -> dict:
    followers = _n(payload.get("followers"), 10000)
    rate = _n(payload.get("engagementRate"), 4.0)
    expected = followers * rate / 100
    confidence = _clamp(_n(payload.get("confidenceBasis"), 0.7))
    return {
        "predictedLikes": int(expected * 0.7),
        "predictedComments": int(expected * 0.08),
        "predictedShares": int(expected * 0.03),
        "predictedReach": int(followers * 1.4),
        "confidence": round(confidence, 2),
    }


def _predict_campaign(payload: dict) -> dict:
    budget = _n(payload.get("budget", {}).get("amountMax"), 0)
    applicants = len(payload.get("candidates") or payload.get("applicants") or [])
    fills = _clamp(applicants / 20.0)
    return {
        "expectedApplications": int(applicants * 1.5),
        "expectedFillRate": round(fills * 100),
        "expectedCostPerCreator": int(budget / max(1, applicants)),
        "confidence": 0.75,
    }


def _predict_match(payload: dict) -> dict:
    result = match_creators(payload)
    allscores: Iterable[float] = (r.get("score", 0.0) for r in result)
    avg = sum(allscores) / max(1, len(result))
    return {"bestMatchScore": round(max(allscores, default=0.0), 2), "averageScore": round(avg, 2), "topMatches": result[:3]}