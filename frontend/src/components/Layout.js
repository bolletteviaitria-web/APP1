import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Globe, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'it' ? 'en' : 'it');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <span className="text-2xl font-display font-semibold text-foreground tracking-tight">
              Terracito<span className="text-primary">Appartments</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/properties" 
              className="text-foreground/70 hover:text-foreground link-underline transition-colors"
              data-testid="nav-properties"
            >
              {t('nav.properties')}
            </Link>
            <Link 
              to="/contact" 
              className="text-foreground/70 hover:text-foreground link-underline transition-colors"
              data-testid="nav-contact"
            >
              {t('nav.contact')}
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleLanguage}
              className="text-foreground/70 hover:text-foreground"
              data-testid="language-toggle"
            >
              <Globe className="h-5 w-5" />
              <span className="ml-1 text-xs uppercase">{i18n.language}</span>
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2" data-testid="user-menu-trigger">
                    <User className="h-5 w-5" />
                    <span className="hidden lg:inline">{user.full_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2" data-testid="admin-link">
                        <LayoutDashboard className="h-4 w-4" />
                        {t('nav.dashboard')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2" data-testid="logout-btn">
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" data-testid="login-link">
                  <Button variant="ghost" className="text-foreground/70 hover:text-foreground">
                    {t('nav.login')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-border/60">
          <div className="px-6 py-4 space-y-4">
            <Link 
              to="/properties" 
              className="block py-2 text-foreground/70 hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              {t('nav.properties')}
            </Link>
            <Link 
              to="/contact" 
              className="block py-2 text-foreground/70 hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              {t('nav.contact')}
            </Link>
            <div className="flex items-center gap-4 pt-4 border-t border-border/60">
              <Button variant="ghost" size="sm" onClick={toggleLanguage}>
                <Globe className="h-4 w-4 mr-1" />
                {i18n.language.toUpperCase()}
              </Button>
              {!user && (
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm">{t('nav.login')}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const whatsappNumber = '+393445361830';

  return (
    <footer className="bg-card border-t border-border/40" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-display font-semibold mb-4 tracking-tight">
              Terracito<span className="text-primary">Appartments</span>
            </h3>
            <p className="text-muted-foreground max-w-md">
              {t('footer.tagline')}
            </p>
            <div className="mt-6">
              <a
                href={`https://wa.me/${whatsappNumber.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                data-testid="whatsapp-footer-link"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="overline mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.properties')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="overline mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 text-center text-muted-foreground text-sm">
          © {currentYear} TerracitoAppartments. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
};
