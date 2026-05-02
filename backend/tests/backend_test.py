"""
Backend tests for TerracitoAppartments:
- Rebrand checks (auth, properties)
- iCal sync admin endpoints (create/list/run/delete), iCal export
- Availability with cached ical_events
- Guest ID document upload / list / admin download / admin soft-delete
"""

import os
import io
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://property-rental-test.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@terracitoappartments.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin123")


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["access_token"] if "access_token" in data else data["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def sample_property():
    r = requests.get(f"{API}/properties", timeout=30)
    assert r.status_code == 200
    props = r.json()
    assert len(props) >= 1, "No properties seeded"
    return props[0]


@pytest.fixture(scope="session")
def test_booking(sample_property):
    """Create a direct booking (no auth required) for document upload tests."""
    import secrets
    offset = 90 + secrets.randbelow(276)  # 90..365, cryptographically-safe random
    check_in = (date.today() + timedelta(days=offset)).isoformat()
    check_out = (date.today() + timedelta(days=offset + 3)).isoformat()
    payload = {
        "property_id": sample_property["id"],
        "check_in": check_in,
        "check_out": check_out,
        "guests": 2,
        "guest_name": "TEST_Guest",
        "guest_email": "test_guest@example.com",
        "guest_phone": "+391234567890",
        "extras": [],
        "notes": "TEST_booking"
    }
    r = requests.post(f"{API}/bookings", json=payload, timeout=30)
    assert r.status_code == 200, f"Booking create failed: {r.status_code} {r.text}"
    return r.json()


# ---------- auth & rebrand ----------
class TestAuthRebrand:
    def test_admin_login_success(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_admin_me(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"

    def test_old_admin_removed(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@vacaystay.com", "password": "admin123"}, timeout=30)
        assert r.status_code in (401, 400, 404), f"Old vacaystay admin should NOT login: {r.status_code}"


# ---------- properties ----------
class TestProperties:
    def test_list_properties_has_5(self):
        r = requests.get(f"{API}/properties", timeout=30)
        assert r.status_code == 200
        props = r.json()
        assert isinstance(props, list)
        assert len(props) == 5, f"Expected 5 seeded properties, got {len(props)}"


# ---------- iCal sync admin endpoints ----------
class TestICalSync:
    created_sync_id = None

    def test_create_sync_requires_admin(self, sample_property):
        r = requests.post(f"{API}/ical-sync", json={
            "property_id": sample_property["id"],
            "platform": "airbnb",
            "ical_url": "https://www.airbnb.com/calendar/ical/dummy.ics"
        }, timeout=30)
        assert r.status_code in (401, 403)

    def test_create_sync(self, admin_headers, sample_property):
        r = requests.post(f"{API}/ical-sync", json={
            "property_id": sample_property["id"],
            "platform": "airbnb",
            "ical_url": "https://www.airbnb.com/calendar/ical/dummy.ics"
        }, headers=admin_headers, timeout=60)
        assert r.status_code == 200, f"iCal create failed: {r.status_code} {r.text}"
        body = r.json()
        assert "id" in body
        TestICalSync.created_sync_id = body["id"]

    def test_list_all_syncs(self, admin_headers):
        r = requests.get(f"{API}/ical-syncs", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        syncs = r.json()
        assert isinstance(syncs, list)
        assert TestICalSync.created_sync_id is not None
        found = [s for s in syncs if s["id"] == TestICalSync.created_sync_id]
        assert len(found) == 1
        s = found[0]
        # Immediate initial sync attempt should populate last_synced; last_error present
        assert s.get("last_synced") is not None, f"last_synced not populated: {s}"
        assert "last_error" in s
        # URL intentionally 404s => error expected, events_imported 0
        assert s.get("last_error") is not None, "last_error should be populated for failing URL"
        assert s.get("last_event_count", 0) == 0

    def test_manual_run_sync(self, admin_headers):
        assert TestICalSync.created_sync_id is not None
        r = requests.post(f"{API}/ical-sync/{TestICalSync.created_sync_id}/run", headers=admin_headers, timeout=60)
        assert r.status_code == 200
        body = r.json()
        assert body["sync_id"] == TestICalSync.created_sync_id
        assert body["events_imported"] == 0
        assert body["error"] is not None

    def test_run_sync_404(self, admin_headers):
        r = requests.post(f"{API}/ical-sync/nonexistent/run", headers=admin_headers, timeout=30)
        assert r.status_code == 404

    def test_availability_shape(self, admin_headers, sample_property):
        r = requests.get(f"{API}/properties/{sample_property['id']}/availability", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "bookings" in data
        assert "blocked_dates" in data
        # blocked_dates should be a list (may be empty since dummy feed had no events)
        assert isinstance(data["blocked_dates"], list)
        for ev in data["blocked_dates"]:
            # field-shape contract
            assert "start" in ev and "end" in ev and "source" in ev and "summary" in ev

    def test_delete_sync(self, admin_headers):
        assert TestICalSync.created_sync_id is not None
        r = requests.delete(f"{API}/ical-sync/{TestICalSync.created_sync_id}", headers=admin_headers, timeout=30)
        assert r.status_code == 200

    def test_delete_sync_404(self, admin_headers):
        r = requests.delete(f"{API}/ical-sync/nonexistent-id", headers=admin_headers, timeout=30)
        assert r.status_code == 404


# ---------- iCal export ----------
class TestICalExport:
    def test_export_ics_public(self, sample_property, test_booking):
        r = requests.get(f"{API}/ical-export/{sample_property['id']}.ics", timeout=30)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "text/calendar" in ct, f"Wrong content-type: {ct}"
        body = r.text
        assert "BEGIN:VCALENDAR" in body
        assert "END:VCALENDAR" in body
        # Booking we created is pending => should appear
        assert "BEGIN:VEVENT" in body
        assert "END:VEVENT" in body

    def test_export_ics_unknown_property(self):
        r = requests.get(f"{API}/ical-export/nonexistent-property.ics", timeout=30)
        assert r.status_code == 404


# ---------- Guest document upload ----------
class TestGuestDocuments:
    uploaded_doc_id = None

    def _make_png_bytes(self):
        # Minimal 1x1 PNG
        return bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000D49444154789C63F8FFFF3F0000050001011C27D3810000000049454E44AE426082"
        )

    def test_upload_document_unknown_booking(self):
        files = {"file": ("id.png", self._make_png_bytes(), "image/png")}
        r = requests.post(f"{API}/bookings/nonexistent-booking/documents", files=files, timeout=30)
        assert r.status_code == 404

    def test_upload_document_unsupported_type(self, test_booking):
        files = {"file": ("evil.exe", b"MZ\x90\x00binary", "application/x-msdownload")}
        r = requests.post(f"{API}/bookings/{test_booking['id']}/documents", files=files, timeout=30)
        assert r.status_code == 400

    def test_upload_document_png(self, test_booking):
        files = {"file": ("id_front.png", self._make_png_bytes(), "image/png")}
        r = requests.post(
            f"{API}/bookings/{test_booking['id']}/documents?document_type=id_front",
            files=files, timeout=60
        )
        assert r.status_code == 200, f"Upload failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["booking_id"] == test_booking["id"]
        assert data["content_type"] == "image/png"
        assert data["document_type"] == "id_front"
        assert data["size"] > 0
        TestGuestDocuments.uploaded_doc_id = data["id"]

    def test_upload_document_pdf(self, test_booking):
        pdf_min = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
        files = {"file": ("passport.pdf", pdf_min, "application/pdf")}
        r = requests.post(
            f"{API}/bookings/{test_booking['id']}/documents?document_type=passport",
            files=files, timeout=60
        )
        assert r.status_code == 200
        assert r.json()["content_type"] == "application/pdf"

    def test_list_documents_has_uploads(self, test_booking):
        r = requests.get(f"{API}/bookings/{test_booking['id']}/documents", timeout=30)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        assert len(docs) >= 2
        assert TestGuestDocuments.uploaded_doc_id in [d["id"] for d in docs]

    def test_admin_download_document(self, admin_headers):
        assert TestGuestDocuments.uploaded_doc_id is not None
        r = requests.get(
            f"{API}/admin/documents/{TestGuestDocuments.uploaded_doc_id}/download",
            headers=admin_headers, timeout=30
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        assert "image/png" in r.headers.get("content-type", "")
        assert len(r.content) > 0

    def test_admin_download_requires_admin(self):
        r = requests.get(
            f"{API}/admin/documents/{TestGuestDocuments.uploaded_doc_id}/download",
            timeout=30
        )
        assert r.status_code in (401, 403)

    def test_admin_soft_delete(self, admin_headers, test_booking):
        assert TestGuestDocuments.uploaded_doc_id is not None
        r = requests.delete(
            f"{API}/admin/documents/{TestGuestDocuments.uploaded_doc_id}",
            headers=admin_headers, timeout=30
        )
        assert r.status_code == 200
        # Ensure it's removed from list
        r2 = requests.get(f"{API}/bookings/{test_booking['id']}/documents", timeout=30)
        assert r2.status_code == 200
        remaining_ids = [d["id"] for d in r2.json()]
        assert TestGuestDocuments.uploaded_doc_id not in remaining_ids

    def test_admin_soft_delete_404(self, admin_headers):
        r = requests.delete(f"{API}/admin/documents/nonexistent", headers=admin_headers, timeout=30)
        assert r.status_code == 404


# ---------- Property image upload / public fetch ----------
class TestPropertyImages:
    uploaded_image_id = None

    def _make_png_bytes(self):
        return bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000D49444154789C63F8FFFF3F0000050001011C27D3810000000049454E44AE426082"
        )

    def test_upload_image_requires_admin(self):
        files = {"file": ("x.png", self._make_png_bytes(), "image/png")}
        r = requests.post(f"{API}/admin/properties/upload-image", files=files, timeout=30)
        assert r.status_code in (401, 403)

    def test_upload_image_rejects_text(self, admin_headers):
        files = {"file": ("notes.txt", b"hello world", "text/plain")}
        r = requests.post(f"{API}/admin/properties/upload-image",
                          files=files, headers=admin_headers, timeout=30)
        assert r.status_code == 400

    def test_upload_image_too_large(self, admin_headers):
        # 11 MB of zeros tagged as PNG
        big = b"\x89PNG\r\n\x1a\n" + b"0" * (11 * 1024 * 1024)
        files = {"file": ("big.png", big, "image/png")}
        r = requests.post(f"{API}/admin/properties/upload-image",
                          files=files, headers=admin_headers, timeout=120)
        assert r.status_code == 400

    def test_upload_image_png_success(self, admin_headers):
        files = {"file": ("prop.png", self._make_png_bytes(), "image/png")}
        r = requests.post(f"{API}/admin/properties/upload-image",
                          files=files, headers=admin_headers, timeout=60)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert "id" in data
        assert data["url"] == f"/api/property-images/{data['id']}"
        assert data["size"] > 0
        assert data["filename"] == "prop.png"
        TestPropertyImages.uploaded_image_id = data["id"]

    def test_public_image_fetch_ok(self):
        assert TestPropertyImages.uploaded_image_id
        r = requests.get(f"{API}/property-images/{TestPropertyImages.uploaded_image_id}", timeout=30)
        assert r.status_code == 200
        assert "image/png" in r.headers.get("content-type", "")
        # Note: Cache-Control may be overridden by CDN/proxy to no-store; backend sets public max-age=86400
        assert len(r.content) > 0

    def test_public_image_fetch_unknown_404(self):
        r = requests.get(f"{API}/property-images/{uuid.uuid4()}", timeout=30)
        assert r.status_code == 404


# ---------- Property full CRUD ----------
class TestPropertyCRUD:
    created_property_id = None

    def _payload(self, slug):
        return {
            "slug": slug,
            "translations": {
                "it": {"title": "TEST Villa IT", "description": "Descrizione IT"},
                "en": {"title": "TEST Villa EN", "description": "Description EN"},
            },
            "location": {"address": "Via Roma 1", "city": "Roma", "region": "Lazio",
                         "country": "IT", "lat": 41.9, "lng": 12.5},
            "amenities": ["wifi", "pool"],
            "max_guests": 4,
            "bedrooms": 2,
            "bathrooms": 1,
            "images": ["https://images.unsplash.com/photo-1672226405717-697c84f48f9e?w=800"],
            "pricing": {"base_price": 150.0, "cleaning_fee": 40.0},
            "seasons": [],
            "extras": [],
            "min_nights": 2,
            "is_active": True,
        }

    def test_create_property_requires_admin(self):
        r = requests.post(f"{API}/properties", json=self._payload(f"test-noauth-{uuid.uuid4().hex[:6]}"), timeout=30)
        assert r.status_code in (401, 403)

    def test_create_property(self, admin_headers):
        slug = f"test-villa-{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/properties", json=self._payload(slug),
                          headers=admin_headers, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data["slug"] == slug
        assert data["translations"]["it"]["title"] == "TEST Villa IT"
        assert data["pricing"]["base_price"] == 150.0
        assert "id" in data
        TestPropertyCRUD.created_property_id = data["id"]

        # verify persistence with GET
        r2 = requests.get(f"{API}/properties/{data['id']}", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["slug"] == slug

    def test_update_property(self, admin_headers):
        pid = TestPropertyCRUD.created_property_id
        assert pid
        # pull current to keep slug
        cur = requests.get(f"{API}/properties/{pid}", timeout=30).json()
        payload = self._payload(cur["slug"])
        payload["pricing"]["base_price"] = 222.0
        r = requests.put(f"{API}/properties/{pid}", json=payload,
                         headers=admin_headers, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        assert r.json()["pricing"]["base_price"] == 222.0
        # verify persistence
        r2 = requests.get(f"{API}/properties/{pid}", timeout=30)
        assert r2.json()["pricing"]["base_price"] == 222.0

    def test_update_property_404(self, admin_headers):
        r = requests.put(f"{API}/properties/nonexistent-id",
                         json=self._payload("test-nope"), headers=admin_headers, timeout=30)
        assert r.status_code == 404

    def test_delete_property(self, admin_headers):
        pid = TestPropertyCRUD.created_property_id
        assert pid
        r = requests.delete(f"{API}/properties/{pid}", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        # verify gone
        r2 = requests.get(f"{API}/properties/{pid}", timeout=30)
        assert r2.status_code == 404

    def test_delete_property_404(self, admin_headers):
        r = requests.delete(f"{API}/properties/nonexistent", headers=admin_headers, timeout=30)
        assert r.status_code == 404

    def test_seeded_properties_intact(self):
        r = requests.get(f"{API}/properties", timeout=30)
        assert r.status_code == 200
        slugs = {p["slug"] for p in r.json()}
        required = {"villa-smeraldo", "casa-amalfi", "trullo-valle-itria",
                    "chalet-dolomiti", "palazzo-toscano"}
        assert required.issubset(slugs), f"Missing seeded slugs: {required - slugs}"
