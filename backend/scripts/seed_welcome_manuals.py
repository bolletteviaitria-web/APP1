"""
Pre-populate the `welcome_manual` field on every existing property with sensible
generic placeholder values, so the AI concierge has something concrete to answer
even before the admin has manually filled in each property.

Idempotent: only fills a sub-field if it's currently empty/None.
Run:  python /app/backend/scripts/seed_welcome_manuals.py
"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

DEFAULTS = {
    "check_in_time": "Dalle 15:00 alle 20:00 (self check-in con codice o consegna chiavi su appuntamento — concordare con l'host)",
    "check_out_time": "Entro le 11:00 il giorno della partenza",
    "wifi_name": "TerracitoAppartments",
    "wifi_password": "Verrà comunicata al check-in (oppure inviata insieme al codice prenotazione)",
    "parking_info": "Parcheggio gratuito su strada nelle immediate vicinanze. Per posto auto privato/box contattare l'host prima dell'arrivo.",
    "house_rules": (
        "Non si fuma all'interno della casa. "
        "Animali domestici di piccola taglia ammessi previo accordo. "
        "Niente feste o eventi rumorosi. "
        "Rispettare il riposo dei vicini dopo le 22:00."
    ),
    "transport_info": (
        "La stazione/aeroporto più vicini sono raggiungibili in auto o con i mezzi pubblici locali. "
        "Per indicazioni precise dal vostro punto di partenza contattate l'host."
    ),
    "emergency_contacts": (
        "Numero unico emergenze: 112. "
        "Host: +39 344 5361830 (anche WhatsApp), reperibile 24/7 per problemi urgenti."
    ),
    "local_tips": (
        "Trovate una piccola guida con i nostri consigli su ristoranti, panetterie e attività locali "
        "all'arrivo nella casa. Per consigli personalizzati basta chiedere in chat."
    ),
    "extra_faq": (
        "Asciugamani e biancheria sono inclusi e cambiati a metà soggiorno per stay > 7 notti. "
        "La pulizia finale è inclusa nel prezzo. "
        "Cucina attrezzata con stoviglie, pentole, caffettiera e kit di benvenuto."
    ),
}


async def main() -> int:
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    props = await db.properties.find({}, {"_id": 0, "id": 1, "slug": 1, "welcome_manual": 1}).to_list(1000)
    if not props:
        print("No properties found.")
        return 0

    updated = 0
    for p in props:
        wm = p.get("welcome_manual") or {}
        merged = {k: (wm.get(k) or DEFAULTS[k]) for k in DEFAULTS}
        if merged != wm:
            res = await db.properties.update_one(
                {"id": p["id"]},
                {"$set": {"welcome_manual": merged}}
            )
            if res.modified_count:
                updated += 1
                print(f"  ✓ {p.get('slug')} — manual filled")
            else:
                print(f"  · {p.get('slug')} — no change")
        else:
            print(f"  · {p.get('slug')} — already complete")

    print(f"\nDone. {updated}/{len(props)} properties updated.")
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
