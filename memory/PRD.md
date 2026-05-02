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
- **2026-04-30** — Iteration 5: Code-review fixes. Backend: bare except → tipizzato; credenziali test via env; Response spostate dentro try (no più pseudo-warning unbound vars); rimosse var inutilizzate. Frontend: useCallback/useMemo per stabilizzare reference (AuthContext value, fetchProperty, calculatePrice, fetchData admin, fetchDocs, pollPaymentStatus, calendarDisabledRules); useEffect deps complete; key React stabili al posto degli index (gallery thumbs, review stars, season rows con _key uuid); empty catch sostituiti con log+toast quando rilevanti. Bug TDZ scoperto e fixato (PropertyDetailPage useMemo order). 36/36 backend test green; UI verificata.
- **2026-05-02** — Iteration 6: Galleria contenuta e nitida (max-w-7xl + aspect 16:9, helper heroImageUrl per Unsplash/Pexels HD). Logout + "Torna al sito" in admin sidebar. "Registrati" rimosso da navbar mobile + rotta `/register` disabilitata. Filtro città dropdown dinamico in PropertiesPage. Sezione Posizione con mappa OpenStreetMap su PropertyDetailPage + link "Apri in Google Maps". Upload multiplo (max 5 foto) in PropertyFormDialog con upload parallelo. Pulsante "Trova coordinate dall'indirizzo" nel form admin (Nominatim, no API key). Badge sconti soggiorno medio-lungo (weekly/monthly_discount) accanto al prezzo notte sulla pagina dettaglio. Riposizionamento copy: rimossi residui "Collezione esclusiva", "Le Nostre Proprietà".
- **2026-05-02** — Iteration 7: **AI Chat Concierge** integrata. Backend: nuovi endpoint `/api/chat/message`, `/api/admin/chat/conversations`, `/api/admin/chat/conversations/{id}` con Claude Haiku 4.5 via emergentintegrations. Modello WelcomeManual (check-in/out, WiFi, parcheggio, regole, trasporti, emergenze, tips, FAQ libere) aggiunto a Property. Sensitive info (WiFi password + indirizzo esatto) rivelate solo con booking_code valido. Conversazioni persistite in MongoDB collection `chat_conversations`. Frontend: nuovo `ChatWidget.js` flottante (bottom-20 right-5 per non collidere col badge Made-with-Emergent), full-screen su mobile, quick prompts (Check-in / Wi-Fi / Indirizzo / Parcheggio), typing indicator, link `tel:` quando AI rimanda all'host. Auto-detect property dal pathname `/property/:slug`. localStorage persistence di session_id, history e booking_code. Tab "Chat AI" in admin con lista sessioni + viewer transcript. Errore budget LLM gestito con messaggio chiaro all'admin.
- **2026-05-02** — Iteration 8: **Fix "non ho accesso ai dettagli"**. Il chatbot ora ha sempre contesto utile: (a) iniettato un riepilogo del catalogo di tutte le proprietà (titolo, città, prezzo, ospiti, slug) nel prompt quando il guest chatta dalla Homepage o pagina Properties, così l'AI può rispondere "abbiamo 5 case: …". (b) Quando il guest è su `/property/:slug`, il prompt etichetta esplicitamente quel blocco come "CURRENT PROPERTY" e mette il catalogo come "OTHER HOUSES" sotto, eliminando la confusione del modello. (c) Aggiunte description e area_description al data block, e ammorbidita la regola "never invent" → ora "use only data from the block, if a fact is missing offer to call the host". (d) Script `scripts/seed_welcome_manuals.py` lanciato: tutte le 5 case esistenti hanno ora un Welcome Manual con placeholder generici (orari 15-20 / 11:00, parcheggio, regole, contatti emergenza, FAQ asciugamani, ecc.) — l'admin può sovrascriverli case-by-case dal form. Verificato via curl: catalogo su Homepage, dettagli check-in/parcheggio su property page, gating booking code su Wi-Fi/indirizzo, tutti corretti.

## Pending / Future
- **P1** Multi-lingua IT/EN dinamica (il toggle esiste ma alcune stringhe sono ancora hardcoded; rivedere AdminDashboard, BookingPage, LegalPages)
- **P2** Email automatiche pre/post-soggiorno + invio contratto (Resend o SendGrid)
- **P2** Sistema upselling in fase di prenotazione (selezione extras prima del pagamento)
- **P3** DocumentUpload visibile anche prima del completamento Stripe (gating su payment status fa sì che non si veda in dev)
- **P3** Refactoring `server.py` (1561 righe) → suddivisione in router per dominio. AdminDashboard.js (~830 righe) e PropertyFormDialog.js (~500 righe) — split in sotto-componenti.
- **P3** Migrazione token JWT da `localStorage` a httpOnly cookies (richiede backend session cookies + CSRF token).
- **P3** Cleanup job per `property_images` orfane.
- **P3** Refactor `calculate_price()` (complessità 19) e `sync_single_feed()` (complessità 19) in step modulari.

## Test Credentials
Vedi `/app/memory/test_credentials.md`
