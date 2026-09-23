"""AI service tests — verify each endpoint returns the shared contract shape."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_analyze_content_shape():
    r = client.post(
        "/analyze-content",
        json={"fileUrl": "https://cdn.test/video.mp4", "caption": "Tried #product from @brand in Kathmandu 😍 full review inside! Really authentic and worth it."},
    )
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["overallScore"] <= 1
    for key in ("videoQuality", "brandCompliance", "logoPlacement", "speechClarity", "sentiment", "visualQuality"):
        assert key in body["checks"]
    assert isinstance(body["flags"], list)
    assert isinstance(body["suggestedActions"], list)


def test_generate_copy_shape():
    r = client.post(
        "/generate-copy",
        json={"brandName": "Manakamana Foods", "product": "Frozen Momos", "objective": "PRODUCT_LAUNCH", "platform": "INSTAGRAM"},
    )
    assert r.status_code == 200
    body = r.json()
    assert {"captions", "hooks", "hashtags", "description"} <= set(body.keys())
    assert len(body["captions"]) >= 1
    assert len(body["hashtags"]) >= 3


def test_match_empty():
    r = client.post("/match", json={})
    assert r.status_code == 200
    assert r.json() == []


def test_match_scores():
    r = client.post(
        "/match",
        json={
            "creatorRequirements": {"categories": ["FOOD"], "minFollowers": 20000},
            "budget": {"amountMax": 30000},
            "targetLocations": ["kathmandu"],
            "candidates": [
                {"id": "a", "name": "Aarav", "category": "FOOD", "followers": 45000, "city": "Kathmandu", "verificationStatus": "VERIFIED"},
                {"id": "b", "name": "Bikash", "category": "FITNESS", "followers": 5000, "city": "Pokhara"},
            ],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body[0]["creatorId"] == "a"
    assert body[0]["score"] > body[1]["score"]
    assert body[0]["reasons"]


def test_predict():
    r = client.post("/predict", json={"followers": 10000, "engagementRate": 5})
    assert r.status_code == 200
    body = r.json()
    assert "predictedLikes" in body
    assert "confidence" in body