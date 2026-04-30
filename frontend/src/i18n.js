import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  it: {
    translation: {
      // Navigation
      "nav.properties": "Proprietà",
      "nav.about": "Chi Siamo",
      "nav.contact": "Contatti",
      "nav.login": "Accedi",
      "nav.register": "Registrati",
      "nav.dashboard": "Dashboard",
      "nav.logout": "Esci",
      
      // Hero
      "hero.overline": "Case Vacanza in Italia",
      "hero.title": "Soggiorni Curati nei Dettagli",
      "hero.subtitle": "Case accoglienti, sempre pulite e seguite con cura — il comfort di sentirsi a casa, ovunque tu vada.",
      "hero.cta": "Esplora le Case",
      
      // Properties
      "properties.title": "Le Nostre Case",
      "properties.subtitle": "Una piccola selezione di case curate, pulite e pronte ad accoglierti",
      "properties.guests": "ospiti",
      "properties.bedrooms": "camere",
      "properties.bathrooms": "bagni",
      "properties.from": "da",
      "properties.perNight": "/notte",
      "properties.viewDetails": "Scopri",
      "properties.filter.city": "Città",
      "properties.filter.guests": "Ospiti min.",
      "properties.filter.maxPrice": "Prezzo max",
      "properties.filter.search": "Cerca",
      
      // Property Detail
      "detail.amenities": "Servizi",
      "detail.location": "Posizione",
      "detail.reviews": "Recensioni",
      "detail.availability": "Disponibilità",
      "detail.bookNow": "Prenota Ora",
      "detail.checkIn": "Check-in",
      "detail.checkOut": "Check-out",
      "detail.guests": "Ospiti",
      "detail.extras": "Extra",
      "detail.priceBreakdown": "Riepilogo Prezzo",
      "detail.nights": "notti",
      "detail.basePrice": "Prezzo base",
      "detail.seasonalAdjustment": "Adeguamento stagionale",
      "detail.extrasTotal": "Totale extra",
      "detail.cleaningFee": "Pulizia finale",
      "detail.securityDeposit": "Deposito cauzionale",
      "detail.total": "Totale",
      "detail.minNights": "Soggiorno minimo",
      
      // Booking
      "booking.title": "Completa la Prenotazione",
      "booking.yourDetails": "I Tuoi Dati",
      "booking.fullName": "Nome completo",
      "booking.email": "Email",
      "booking.phone": "Telefono",
      "booking.notes": "Note speciali",
      "booking.paymentMethod": "Metodo di Pagamento",
      "booking.payFull": "Paga tutto ora",
      "booking.payDeposit": "Paga solo deposito",
      "booking.confirm": "Conferma e Paga",
      "booking.success": "Prenotazione Confermata!",
      "booking.successMessage": "Grazie per la tua prenotazione. Riceverai una email di conferma a breve.",
      
      // Contact
      "contact.title": "Contattaci",
      "contact.subtitle": "Siamo qui per aiutarti",
      "contact.whatsapp": "Scrivici su WhatsApp",
      "contact.name": "Nome",
      "contact.email": "Email",
      "contact.phone": "Telefono",
      "contact.message": "Messaggio",
      "contact.send": "Invia Messaggio",
      "contact.success": "Messaggio inviato con successo!",
      
      // Footer
      "footer.tagline": "Case vacanza in Italia, curate con attenzione e sempre pulite. Comfort autentico per il tuo soggiorno.",
      "footer.quickLinks": "Link Rapidi",
      "footer.legal": "Legale",
      "footer.privacy": "Privacy Policy",
      "footer.terms": "Termini e Condizioni",
      "footer.cookies": "Cookie Policy",
      "footer.rights": "Tutti i diritti riservati",
      
      // Auth
      "auth.login": "Accedi",
      "auth.register": "Registrati",
      "auth.email": "Email",
      "auth.password": "Password",
      "auth.fullName": "Nome Completo",
      "auth.phone": "Telefono",
      "auth.noAccount": "Non hai un account?",
      "auth.hasAccount": "Hai già un account?",
      
      // Admin
      "admin.dashboard": "Dashboard",
      "admin.properties": "Proprietà",
      "admin.bookings": "Prenotazioni",
      "admin.calendar": "Calendario",
      "admin.contacts": "Messaggi",
      "admin.settings": "Impostazioni",
      "admin.totalProperties": "Proprietà Totali",
      "admin.totalBookings": "Prenotazioni Totali",
      "admin.pendingBookings": "In Attesa",
      "admin.monthRevenue": "Ricavi del Mese",
      "admin.upcomingCheckins": "Check-in Imminenti",
      "admin.upcomingCheckouts": "Check-out Imminenti",
      
      // Amenities
      "amenity.pool": "Piscina",
      "amenity.wifi": "WiFi",
      "amenity.ac": "Aria Condizionata",
      "amenity.parking": "Parcheggio",
      "amenity.sea_view": "Vista Mare",
      "amenity.garden": "Giardino",
      "amenity.bbq": "Barbecue",
      "amenity.dishwasher": "Lavastoviglie",
      "amenity.terrace": "Terrazza",
      "amenity.washing_machine": "Lavatrice",
      "amenity.kitchen": "Cucina",
      "amenity.fireplace": "Camino",
      "amenity.sauna": "Sauna",
      "amenity.ski_storage": "Deposito Sci",
      "amenity.mountain_view": "Vista Montagna",
      "amenity.heated_floors": "Riscaldamento a Pavimento",
      "amenity.elevator": "Ascensore",
      "amenity.concierge": "Concierge",
      "amenity.city_view": "Vista Città",
      "amenity.historic": "Edificio Storico",
      "amenity.art_collection": "Collezione d'Arte",
      "amenity.outdoor_shower": "Doccia Esterna",
      "amenity.bikes": "Biciclette",
      
      // Common
      "common.loading": "Caricamento...",
      "common.error": "Si è verificato un errore",
      "common.retry": "Riprova",
      "common.save": "Salva",
      "common.cancel": "Annulla",
      "common.delete": "Elimina",
      "common.edit": "Modifica",
      "common.view": "Visualizza",
      "common.close": "Chiudi",
    }
  },
  en: {
    translation: {
      // Navigation
      "nav.properties": "Properties",
      "nav.about": "About Us",
      "nav.contact": "Contact",
      "nav.login": "Login",
      "nav.register": "Register",
      "nav.dashboard": "Dashboard",
      "nav.logout": "Logout",
      
      // Hero
      "hero.overline": "Italian Vacation Homes",
      "hero.title": "Stays Cared For, Down to the Detail",
      "hero.subtitle": "Welcoming homes, always spotless and looked after — the comfort of feeling at home, wherever you go.",
      "hero.cta": "Explore Homes",
      
      // Properties
      "properties.title": "Our Homes",
      "properties.subtitle": "A small selection of homes — well-kept, spotless and ready to welcome you",
      "properties.guests": "guests",
      "properties.bedrooms": "bedrooms",
      "properties.bathrooms": "bathrooms",
      "properties.from": "from",
      "properties.perNight": "/night",
      "properties.viewDetails": "View",
      "properties.filter.city": "City",
      "properties.filter.guests": "Min. guests",
      "properties.filter.maxPrice": "Max price",
      "properties.filter.search": "Search",
      
      // Property Detail
      "detail.amenities": "Amenities",
      "detail.location": "Location",
      "detail.reviews": "Reviews",
      "detail.availability": "Availability",
      "detail.bookNow": "Book Now",
      "detail.checkIn": "Check-in",
      "detail.checkOut": "Check-out",
      "detail.guests": "Guests",
      "detail.extras": "Extras",
      "detail.priceBreakdown": "Price Summary",
      "detail.nights": "nights",
      "detail.basePrice": "Base price",
      "detail.seasonalAdjustment": "Seasonal adjustment",
      "detail.extrasTotal": "Extras total",
      "detail.cleaningFee": "Cleaning fee",
      "detail.securityDeposit": "Security deposit",
      "detail.total": "Total",
      "detail.minNights": "Minimum stay",
      
      // Booking
      "booking.title": "Complete Your Booking",
      "booking.yourDetails": "Your Details",
      "booking.fullName": "Full name",
      "booking.email": "Email",
      "booking.phone": "Phone",
      "booking.notes": "Special notes",
      "booking.paymentMethod": "Payment Method",
      "booking.payFull": "Pay in full now",
      "booking.payDeposit": "Pay deposit only",
      "booking.confirm": "Confirm & Pay",
      "booking.success": "Booking Confirmed!",
      "booking.successMessage": "Thank you for your booking. You will receive a confirmation email shortly.",
      
      // Contact
      "contact.title": "Contact Us",
      "contact.subtitle": "We're here to help",
      "contact.whatsapp": "Message us on WhatsApp",
      "contact.name": "Name",
      "contact.email": "Email",
      "contact.phone": "Phone",
      "contact.message": "Message",
      "contact.send": "Send Message",
      "contact.success": "Message sent successfully!",
      
      // Footer
      "footer.tagline": "Italian vacation homes, cared for with attention and always spotless. Real comfort for your stay.",
      "footer.quickLinks": "Quick Links",
      "footer.legal": "Legal",
      "footer.privacy": "Privacy Policy",
      "footer.terms": "Terms & Conditions",
      "footer.cookies": "Cookie Policy",
      "footer.rights": "All rights reserved",
      
      // Auth
      "auth.login": "Login",
      "auth.register": "Register",
      "auth.email": "Email",
      "auth.password": "Password",
      "auth.fullName": "Full Name",
      "auth.phone": "Phone",
      "auth.noAccount": "Don't have an account?",
      "auth.hasAccount": "Already have an account?",
      
      // Admin
      "admin.dashboard": "Dashboard",
      "admin.properties": "Properties",
      "admin.bookings": "Bookings",
      "admin.calendar": "Calendar",
      "admin.contacts": "Messages",
      "admin.settings": "Settings",
      "admin.totalProperties": "Total Properties",
      "admin.totalBookings": "Total Bookings",
      "admin.pendingBookings": "Pending",
      "admin.monthRevenue": "Monthly Revenue",
      "admin.upcomingCheckins": "Upcoming Check-ins",
      "admin.upcomingCheckouts": "Upcoming Check-outs",
      
      // Amenities
      "amenity.pool": "Pool",
      "amenity.wifi": "WiFi",
      "amenity.ac": "Air Conditioning",
      "amenity.parking": "Parking",
      "amenity.sea_view": "Sea View",
      "amenity.garden": "Garden",
      "amenity.bbq": "BBQ",
      "amenity.dishwasher": "Dishwasher",
      "amenity.terrace": "Terrace",
      "amenity.washing_machine": "Washing Machine",
      "amenity.kitchen": "Kitchen",
      "amenity.fireplace": "Fireplace",
      "amenity.sauna": "Sauna",
      "amenity.ski_storage": "Ski Storage",
      "amenity.mountain_view": "Mountain View",
      "amenity.heated_floors": "Heated Floors",
      "amenity.elevator": "Elevator",
      "amenity.concierge": "Concierge",
      "amenity.city_view": "City View",
      "amenity.historic": "Historic Building",
      "amenity.art_collection": "Art Collection",
      "amenity.outdoor_shower": "Outdoor Shower",
      "amenity.bikes": "Bicycles",
      
      // Common
      "common.loading": "Loading...",
      "common.error": "An error occurred",
      "common.retry": "Retry",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.delete": "Delete",
      "common.edit": "Edit",
      "common.view": "View",
      "common.close": "Close",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'it',
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
