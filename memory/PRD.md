# TerracitoAppartments — Product Requirements

## Original Problem Statement
Sito web completo per gestione di multiple case vacanza in Italia. Posizionamento: case **ben curate, pulite e accoglienti** — comfort autentico, non lusso ostentato. Multilingua IT/EN, prenotazione diretta con calcolo prezzi, integrazione Stripe, contatto WhatsApp, dashboard admin completa, sincronizzazione iCal con Airbnb/Booking. Si parte da 5 case estendibili tramite admin.

## Stack
- **Frontend**: React + Tailwind v3 + shadcn/ui, react-i18next (IT/EN), date-fns
- **Backend**: FastAPI + MongoDB (Motor async) + APScheduler (background jobs)
- **Integrazioni**: Stripe (payments), Emergent Object Storage (immagini proprietà + documenti ID), iCalendar parsing/export
- **Brand**: TerracitoAppartments (rebranded da VacayStay 2026-04-30)

## Design — Light Mediterranean Luxury
- Background `#F6F4F0` cream / Foreground `#1E232B` charcoal
- Primary `#D26A45` terracotta (HSL: 21 65% 52%)
- Tipografia: Cormorant Garamond (display) + Manrope (body)
- Asymmetric hero, flat cards, micro-animations
- Tutti i token CSS in `/app/frontend/src/index.css`; design system in `/app/design_guidelines.md`

## Implemented Features

### Pubblico
- HomePage con hero, 4 proprietà in evidenza, feature section
- PropertiesPage con filtri (città, ospiti, prezzo)
- PropertyDetailPage con galleria, amenity, calendario disponibilità, recensioni, calcolo prezzo dinamico
- BookingPage con form ospite, scelta full/deposit, redirect Stripe
- BookingSuccessPage con polling pagamento + upload documenti d'identità
- ContactPage con form + WhatsApp CTA
- LegalPages (Privacy, Termini)
- Auth (Login/Register) con JWT, banner demo admin

### Admin Dashboard (`/admin`)
- **Stats**: proprietà totali, prenotazioni totali, in attesa, ricavi mensili, prossimi check-in/out
- **Properties CRUD completo**: PropertyFormDialog con sezioni Basic / Translations IT-EN / Location / Capacity / Pricing / Photos (upload + URL paste + reorder + cover label) / Amenities (multi-toggle) / Seasons / Extras
- **Bookings**: tabella con conferma/cancella/completa + dialog "Documenti Ospite"
- **Contacts**: lista messaggi
- **Sync iCal**: Add feed (Airbnb/Booking/Vrbo/Other), tabella stati, run/delete manuale, copy export URL per piattaforma

### Backend APIs
- Auth (`/api/auth/*`)
- Properties CRUD (`/api/properties/*`) + upload immagine (`/api/admin/properties/upload-image`) + serving pubblico (`/api/property-images/{id}`)
- Bookings (`/api/bookings/*`) + calcolo prezzi (`/api/properties/calculate-price`) + disponibilità (`/api/properties/{id}/availability`)
- Stripe (`/api/payments/*`, webhook)
- Reviews (`/api/reviews/*`)
- iCal sync (`/api/ical-sync*`) + export pubblico (`/api/ical-export/{property_id}.ics`)
- Documenti ospite (`/api/bookings/{id}/documents`) + admin (`/api/admin/documents/{id}/{download|delete}`)
- Contact (`/api/contact`) + Admin dashboard (`/api/admin/dashboard`)

### Background Jobs
- APScheduler AsyncIO: `sync_all_feeds_job` ogni 30 min — pulla tutti i feed iCal e popola la collection `ical_events` (usata in availability)

## Data Models (MongoDB)
- `users`, `properties`, `bookings`, `payment_transactions`, `reviews`
- `ical_syncs` (config), `ical_events` (cache eventi parsati)
- `booking_documents` (con `is_deleted` soft-delete)
- `property_images` (con `is_deleted` soft-delete)
- `contacts`

## Changelog
- **2026-04-30** — Iteration 1 (handoff): MVP completo VacayStay, Stripe, WhatsApp, Admin base, seed 5 properties.
- **2026-04-30** — Iteration 2: Rebrand → TerracitoAppartments. iCal scheduler bidirezionale (APScheduler + export pubblico). Upload documenti d'identità ospiti via Emergent Object Storage. 23/23 backend tests green.
- **2026-04-30** — Iteration 3: Light Mediterranean theme (Cormorant Garamond, terracotta su cream). Admin Property CRUD completo con upload immagini. 36/36 backend tests green.
- **2026-04-30** — Iteration 4: Riposizionamento copy. Rimossi tutti i riferimenti a "lusso/luxury/esclusivo/elegante". Hero, feature card, footer, descrizioni seed e meta SEO ora puntano su "case ben curate, sempre pulite, accoglienti, comfort autentico". Aggiornate 5 proprietà già seedate nel DB.

## Pending / Future
- **P1** Multi-lingua IT/EN dinamica (il toggle esiste ma alcune stringhe sono ancora hardcoded; rivedere AdminDashboard, BookingPage, LegalPages)
- **P2** Email automatiche pre/post-soggiorno + invio contratto (Resend o SendGrid)
- **P2** Sistema upselling in fase di prenotazione (selezione extras prima del pagamento)
- **P3** DocumentUpload visibile anche prima del completamento Stripe (gating su payment status fa sì che non si veda in dev)
- **P3** Refactoring `server.py` (1561 righe) → suddivisione in router per dominio
- **P3** Cleanup job per `property_images` orfane

## Test Credentials
Vedi `/app/memory/test_credentials.md`
