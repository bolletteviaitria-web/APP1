"""
Iteration 6 critical-bug regression tests:
- iCal overlap rejection in POST /api/bookings (ical_events collection)
- Stripe checkout deposit guard for €0 deposits (no 500)
- Regression: full-stay booking + stripe checkout still works

Inserts a fake ical_events doc directly via mongo and cleans up after.
Uses villa-smeraldo (min_nights=3). All tests use future dates (2027) to avoid
collisions with real bookings.
"""
import os
import uuid
import asyncio
import pytest
import requests
from datetime import date, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://property-rental-test.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def villa_smeraldo():
    r = requests.get(f"{API}/properties", timeout=30)
    assert r.status_code == 200
    props = r.json()
    villa = next((p for p in props if p["slug"] == "villa-smeraldo"), None)
    assert villa is not None, "villa-smeraldo not seeded"
    return villa


@pytest.fixture(scope="module")
def ical_event_seed(villa_smeraldo):
    """Seed an ical_events doc blocking 2027-05-29 → 2027-06-01 (exclusive)."""
    async def _seed():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        ev_id = f"TEST_ical_{uuid.uuid4().hex[:8]}"
        await db.ical_events.insert_one({
            "id": ev_id,
            "property_id": villa_smeraldo["id"],
            "start_date": "2027-05-29",
            "end_date": "2027-06-01",
            "platform": "airbnb",
            "summary": "TEST_ical_block",
        })
        client.close()
        return ev_id

    async def _cleanup(ev_id):
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.ical_events.delete_one({"id": ev_id})
        client.close()

    loop = asyncio.new_event_loop()
    try:
        ev_id = loop.run_until_complete(_seed())
        yield ev_id
        loop.run_until_complete(_cleanup(ev_id))
    finally:
        loop.close()


class TestICalOverlap:
    def test_booking_overlap_with_ical_rejected(self, villa_smeraldo, ical_event_seed):
        """Range 2027-05-28 → 2027-05-31 overlaps the iCal block of 05-29 → 06-01."""
        payload = {
            "property_id": villa_smeraldo["id"],
            "check_in": "2027-05-28",
            "check_out": "2027-05-31",
            "guests": 2,
            "guest_name": "TEST_overlap",
            "guest_email": "test_overlap@example.com",
            "guest_phone": "+391234567890",
            "extras": [],
            "notes": "TEST_overlap"
        }
        r = requests.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        body = r.json()
        detail = body.get("detail", "")
        assert "not available" in detail.lower(), f"Bad detail: {detail}"

    def test_booking_fully_inside_ical_block_rejected(self, villa_smeraldo, ical_event_seed):
        """Range 2027-05-30 → 2027-06-01 is fully inside iCal block."""
        payload = {
            "property_id": villa_smeraldo["id"],
            "check_in": "2027-05-30",
            "check_out": "2027-06-01",
            "guests": 2,
            "guest_name": "TEST_inside",
            "guest_email": "test_inside@example.com",
            "guest_phone": "+391234567890",
            "extras": [],
            "notes": "TEST_inside"
        }
        r = requests.post(f"{API}/bookings", json=payload, timeout=30)
        # Note: villa-smeraldo has min_nights=3 — this 2-night booking may fail
        # min-nights check. Either status is acceptable but must NOT be 500.
        assert r.status_code in (400, 422), f"Expected 4xx, got {r.status_code}: {r.text}"

    def test_booking_after_ical_block_succeeds(self, villa_smeraldo, ical_event_seed):
        """Range 2027-06-01 → 2027-06-04 starts on iCal end_date (exclusive) → OK."""
        payload = {
            "property_id": villa_smeraldo["id"],
            "check_in": "2027-06-01",
            "check_out": "2027-06-04",
            "guests": 2,
            "guest_name": "TEST_after",
            "guest_email": "test_after@example.com",
            "guest_phone": "+391234567890",
            "extras": [],
            "notes": "TEST_after"
        }
        r = requests.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body["check_in"] == "2027-06-01"
        # Cleanup: delete the booking we just created via mongo
        async def _del():
            client = AsyncIOMotorClient(MONGO_URL)
            await client[DB_NAME].bookings.delete_one({"id": body["id"]})
            client.close()
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(_del())
        finally:
            loop.close()


class TestDepositZeroGuard:
    """When stay ≤ 7 nights, security_deposit = 0 ⇒ deposit checkout must
    return clean 400 (not 500)."""

    def test_deposit_with_zero_amount_returns_400(self, villa_smeraldo):
        # Step 1: create a 3-night booking (min_nights=3) → deposit should be 0
        payload = {
            "property_id": villa_smeraldo["id"],
            "check_in": "2027-09-10",
            "check_out": "2027-09-13",
            "guests": 2,
            "guest_name": "TEST_dep0",
            "guest_email": "test_dep0@example.com",
            "guest_phone": "+391234567890",
            "extras": [],
            "notes": "TEST_dep0"
        }
        r = requests.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 200, f"Booking create failed: {r.status_code} {r.text}"
        booking = r.json()
        booking_id = booking["id"]
        # The 3-night stay must produce 0 deposit (≤ 7 nights)
        assert booking["deposit_amount"] in (0, 0.0), f"Expected 0 deposit, got {booking['deposit_amount']}"

        try:
            # Step 2: try to checkout with payment_type=deposit ⇒ must be 400, not 500
            r2 = requests.post(
                f"{API}/payments/create-checkout",
                params={"booking_id": booking_id, "payment_type": "deposit"},
                timeout=30,
            )
            assert r2.status_code == 400, f"Expected 400, got {r2.status_code}: {r2.text}"
            detail = r2.json().get("detail", "")
            # Italian message expected per the fix
            assert "cauzione" in detail.lower() or "importo" in detail.lower() or "deposit" in detail.lower(), (
                f"Bad detail: {detail}"
            )
        finally:
            # Cleanup booking
            async def _del():
                client = AsyncIOMotorClient(MONGO_URL)
                await client[DB_NAME].bookings.delete_one({"id": booking_id})
                client.close()
            loop = asyncio.new_event_loop()
            try:
                loop.run_until_complete(_del())
            finally:
                loop.close()


class TestFullStripeRegression:
    """Regression: full-stay stripe booking must still produce a checkout_url."""

    def test_full_payment_returns_checkout_url(self, villa_smeraldo):
        payload = {
            "property_id": villa_smeraldo["id"],
            "check_in": "2027-10-05",
            "check_out": "2027-10-09",
            "guests": 2,
            "guest_name": "TEST_full",
            "guest_email": "test_full@example.com",
            "guest_phone": "+391234567890",
            "extras": [],
            "notes": "TEST_full",
            "payment_method": "stripe"
        }
        r = requests.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 200, f"Booking create failed: {r.status_code} {r.text}"
        booking = r.json()
        booking_id = booking["id"]
        try:
            r2 = requests.post(
                f"{API}/payments/create-checkout",
                params={"booking_id": booking_id, "payment_type": "full"},
                timeout=60,
            )
            assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
            data = r2.json()
            assert "checkout_url" in data and data["checkout_url"].startswith("http"), data
            assert "session_id" in data
        finally:
            async def _del():
                client = AsyncIOMotorClient(MONGO_URL)
                await client[DB_NAME].bookings.delete_one({"id": booking_id})
                client.close()
            loop = asyncio.new_event_loop()
            try:
                loop.run_until_complete(_del())
            finally:
                loop.close()
