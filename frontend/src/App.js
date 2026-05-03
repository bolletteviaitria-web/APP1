import "@/App.css";
import "@/i18n";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar, Footer } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { PropertiesPage } from "./pages/PropertiesPage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { BookingPage, BookingSuccessPage } from "./pages/BookingPage";
import { BookingShortcut } from "./pages/BookingShortcut";
import { LoginPage } from "./pages/AuthPages";
import { ContactPage } from "./pages/ContactPage";
import { PrivacyPage, TermsPage } from "./pages/LegalPages";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Toaster } from "./components/ui/sonner";
import { ChatWidget } from "./components/ChatWidget";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App min-h-screen bg-background text-foreground">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/property/:slug" element={<PropertyDetailPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/booking/success" element={<BookingSuccessPage />} />
              <Route path="/prenota/:slug" element={<BookingShortcut />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
          <Footer />
          <ChatWidget />
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
