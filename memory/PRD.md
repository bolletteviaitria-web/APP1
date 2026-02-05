# VacayStay - PRD (Product Requirements Document)

## Problem Statement
Sviluppare un sito web completo per la gestione di multiple case vacanze, con funzionalità di prenotazione diretta, integrazione con piattaforme esterne e strumenti di gestione efficienti.

## User Personas
1. **Guest/Tourist** - Cerca e prenota case vacanze di lusso in Italia
2. **Property Owner/Admin** - Gestisce proprietà, prenotazioni, prezzi e sincronizzazione

## Core Requirements (Static)
- Multilingua (IT/EN)
- Design responsive mobile-first
- Prenotazione diretta con calendario real-time
- Calcolo automatico prezzi (stagionale, weekend, sconti)
- Pagamenti sicuri (Stripe + PayPal)
- Integrazione WhatsApp
- Dashboard amministrativa
- Sincronizzazione iCal (Airbnb/Booking.com)
- GDPR compliant

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Payments**: Stripe (Emergent integration)
- **External Sync**: iCal format

## Implemented Features ✅ (Feb 2026)

### Customer-facing
- [x] Homepage con hero section e proprietà in evidenza
- [x] Listing proprietà con filtri (città, ospiti, prezzo)
- [x] Dettaglio proprietà con galleria, servizi, mappa
- [x] Calendario disponibilità real-time
- [x] Calcolo prezzi dinamico (base, weekend, stagionale, sconti)
- [x] Sistema prenotazione con selezione extra
- [x] Checkout Stripe
- [x] Integrazione WhatsApp (pulsanti + messaggi precompilati)
- [x] Registrazione/Login utenti
- [x] Pagine legali (Privacy GDPR, Termini)

### Admin Dashboard
- [x] Overview con statistiche (proprietà, prenotazioni, ricavi)
- [x] Gestione prenotazioni (conferma, cancella, completa)
- [x] Lista proprietà
- [x] Gestione messaggi contatti
- [x] Sincronizzazione iCal

### Backend APIs
- [x] Auth: register, login, me
- [x] Properties: CRUD, calculate-price, availability
- [x] Bookings: CRUD, status updates
- [x] Payments: Stripe checkout, webhook
- [x] Reviews: CRUD
- [x] iCal sync: CRUD
- [x] Contact messages

## Prioritized Backlog

### P0 (High Priority)
- [ ] PayPal integration (in addition to Stripe)
- [ ] Email notifications (conferma prenotazione, pre/post soggiorno)
- [ ] Gestione documenti identità ospiti

### P1 (Medium Priority)
- [ ] Editor proprietà completo in admin
- [ ] Sistema recensioni con raccolta automatica
- [ ] Reportistica avanzata e export

### P2 (Low Priority)
- [ ] Chat live
- [ ] Sistema fedeltà clienti
- [ ] "Prenota ora, paga dopo"
- [ ] Upselling automatico

## Next Tasks
1. Implementare PayPal come metodo pagamento alternativo
2. Sistema email automatiche (SendGrid/Resend)
3. Editor proprietà completo nell'admin
4. Gestione documenti ospiti per compliance legale

## Technical Notes
- WhatsApp: +39 3445361830
- Admin credentials: admin@vacaystay.com / admin123
- 5 proprietà demo (Villa Smeraldo, Casa Amalfi, Trullo Valle d'Itria, Chalet Dolomiti, Palazzo Toscano)
