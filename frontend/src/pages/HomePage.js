import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ArrowRight, Star, Users, BedDouble, Bath, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const HomePage = () => {
  const { t, i18n } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const lang = i18n.language;

  const seedData = useCallback(async () => {
    try {
      await axios.post(`${API}/seed`);
    } catch (error) {
      // Seed endpoint is idempotent — only meaningful failures are network issues we can ignore here
      if (process.env.NODE_ENV !== 'production') {
        console.debug('seed (non-blocking):', error?.response?.status || error?.message);
      }
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/properties`);
      setProperties(response.data.slice(0, 4));
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
    seedData();
  }, [fetchProperties, seedData]);

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center text-white" data-testid="hero-section">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1672226405717-697c84f48f9e?w=1920&q=80"
            alt="Casa vacanza in Italia"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E232B]/80 via-[#1E232B]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E232B]/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20">
          <div className="max-w-2xl animate-slide-up">
            <span className="overline mb-6 block text-[hsl(var(--gold-soft))]">{t('hero.overline')}</span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-light leading-[1.05] mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-lg text-white/85 mb-10 max-w-xl font-light">
              {t('hero.subtitle')}
            </p>
            <Link to="/properties" data-testid="hero-cta">
              <Button className="btn-primary group">
                {t('hero.cta')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent" />
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-24 bg-background" data-testid="featured-properties">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="overline mb-4 block">{t('hero.overline')}</span>
            <h2 className="text-4xl sm:text-5xl font-display font-medium mb-4">
              {t('properties.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('properties.subtitle')}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card animate-pulse h-96" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {properties.map((property, index) => (
                <PropertyCard 
                  key={property.id} 
                  property={property} 
                  lang={lang}
                  index={index}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link to="/properties" data-testid="view-all-properties">
              <Button className="btn-secondary">
                {t('properties.viewDetails')} {t('nav.properties')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-feature">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-medium mb-3">
                {lang === 'it' ? 'Sempre Pulite' : 'Always Spotless'}
              </h3>
              <p className="text-muted-foreground">
                {lang === 'it' 
                  ? 'Pulizie accurate prima di ogni arrivo: troverai biancheria fresca e ambienti curati nel dettaglio.' 
                  : 'Thorough cleaning before every arrival: fresh linen and rooms cared for down to the smallest detail.'}
              </p>
            </div>

            <div className="card-feature">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-medium mb-3">
                {lang === 'it' ? 'Posizioni Belle' : 'Lovely Locations'}
              </h3>
              <p className="text-muted-foreground">
                {lang === 'it' 
                  ? 'Dalle coste della Sardegna alle montagne, case in luoghi che ti faranno sentire davvero in vacanza.' 
                  : 'From Sardinian coasts to the mountains, homes in places that will truly make you feel on holiday.'}
              </p>
            </div>

            <div className="card-feature">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-medium mb-3">
                {lang === 'it' ? 'Sempre a Disposizione' : 'Always Available'}
              </h3>
              <p className="text-muted-foreground">
                {lang === 'it' 
                  ? 'Un punto di contatto diretto via WhatsApp prima, durante e dopo il soggiorno.' 
                  : 'A direct WhatsApp contact before, during and after your stay.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export const PropertyCard = ({ property, lang, index = 0 }) => {
  const { t } = useTranslation();
  const translation = property.translations[lang] || property.translations['it'];

  return (
    <Link 
      to={`/property/${property.slug}`}
      className="group card-property block"
      style={{ animationDelay: `${index * 100}ms` }}
      data-testid={`property-card-${property.slug}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.images[0]}
          alt={translation.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E232B]/85 via-[#1E232B]/15 to-transparent" />

        {/* Rating Badge */}
        {property.average_rating > 0 && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-foreground">{property.average_rating}</span>
          </div>
        )}

        {/* Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 text-white/85 text-sm mb-2">
            <MapPin className="w-4 h-4" />
            <span>{property.location.city}, {property.location.region}</span>
          </div>
          <h3 className="text-2xl font-display font-medium mb-3 text-white">
            {translation.title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-white/85">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {property.max_guests} {t('properties.guests')}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="w-4 h-4" />
              {property.bedrooms}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              {property.bathrooms}
            </span>
          </div>
        </div>
      </div>

      {/* Price Bar */}
      <div className="bg-card p-4 flex items-center justify-between border-t border-border/40">
        <div>
          <span className="text-muted-foreground text-sm">{t('properties.from')}</span>
          <span className="text-xl font-display font-medium text-primary ml-2">
            €{property.pricing.base_price}
          </span>
          <span className="text-muted-foreground text-sm">{t('properties.perNight')}</span>
        </div>
        <Button variant="ghost" className="group-hover:text-primary transition-colors">
          {t('properties.viewDetails')}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </Link>
  );
};
