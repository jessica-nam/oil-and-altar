"""API tests for the Oil & Altar backend."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

ADMIN_TOKEN = "test-admin-token"  # test-only value, set via env in the fixture


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("OILANDALTAR_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("OILANDALTAR_MEDIA_DIR", str(tmp_path / "media"))
    monkeypatch.setenv("OILANDALTAR_ADMIN_TOKEN", ADMIN_TOKEN)
    with TestClient(create_app()) as c:
        yield c


def test_www_redirects_to_canonical_host(tmp_path, monkeypatch):
    monkeypatch.setenv("OILANDALTAR_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("OILANDALTAR_MEDIA_DIR", str(tmp_path / "media"))
    monkeypatch.setenv("OILANDALTAR_CANONICAL_HOST", "oilandaltar.com")
    with TestClient(create_app(), follow_redirects=False) as c:
        res = c.get("/api/health", headers={"Host": "www.oilandaltar.com"})
        assert res.status_code == 308
        assert res.headers["location"] == "https://oilandaltar.com/api/health"

        # the canonical host itself, and health-check hosts, are untouched
        assert c.get("/api/health", headers={"Host": "oilandaltar.com"}).status_code == 200
        assert c.get("/api/health").status_code == 200


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "lit"}


def test_series_seeded(client):
    res = client.get("/api/series")
    assert res.status_code == 200
    series = res.json()
    assert [s["slug"] for s in series] == ["votive", "still-lifes", "nocturnes"]
    votive = series[0]
    assert votive["numeral"] == "I"
    assert len(votive["plates"]) == 5
    assert votive["plates"][0]["title"] == "The Vigil"
    assert votive["plates"][0]["image_url"] is None


def test_frontend_served_at_root(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "Oil" in res.text and "Altar" in res.text


def test_create_inquiry(client):
    res = client.post(
        "/api/inquiries",
        json={"name": "Ada", "email": "ada@example.com", "message": "A portrait, please."},
    )
    assert res.status_code == 201
    assert res.json()["id"] >= 1


def test_create_inquiry_rejects_bad_email(client):
    res = client.post(
        "/api/inquiries",
        json={"name": "Ada", "email": "not-an-email", "message": "hi"},
    )
    assert res.status_code == 422


def test_list_inquiries_requires_token(client):
    assert client.get("/api/inquiries").status_code == 401
    assert client.get("/api/inquiries", headers={"X-Admin-Token": "wrong"}).status_code == 401


def test_list_inquiries_with_token(client):
    client.post(
        "/api/inquiries",
        json={"name": "Ada", "email": "ada@example.com", "message": "A portrait, please."},
    )
    res = client.get("/api/inquiries", headers={"X-Admin-Token": ADMIN_TOKEN})
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["email"] == "ada@example.com"


def test_admin_unconfigured_returns_503(client, monkeypatch):
    monkeypatch.delenv("OILANDALTAR_ADMIN_TOKEN")
    assert client.get("/api/inquiries").status_code == 503


def test_upload_plate_image(client):
    fake_jpeg = b"\xff\xd8\xff\xe0" + b"0" * 128
    res = client.post(
        "/api/plates/1/image",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        files={"file": ("vigil.jpg", fake_jpeg, "image/jpeg")},
    )
    assert res.status_code == 200
    image_url = res.json()["image_url"]
    assert image_url.startswith("/media/") and image_url.endswith(".jpg")

    # the plate now reports its image, and the file is actually served
    series = client.get("/api/series").json()
    assert series[0]["plates"][0]["image_url"] == image_url
    assert client.get(image_url).content == fake_jpeg


def test_upload_rejects_wrong_type(client):
    res = client.post(
        "/api/plates/1/image",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert res.status_code == 415


def test_upload_missing_plate_404(client):
    res = client.post(
        "/api/plates/999/image",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        files={"file": ("x.jpg", b"\xff\xd8", "image/jpeg")},
    )
    assert res.status_code == 404


def test_upload_requires_token(client):
    res = client.post(
        "/api/plates/1/image",
        files={"file": ("x.jpg", b"\xff\xd8", "image/jpeg")},
    )
    assert res.status_code == 401
