import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { format, addDays, differenceInDays, parseISO, startOfToday } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import {
  Star, MapPin, Users, BedDouble, Bath, ChevronLeft, ChevronRight,
  Check, Wifi, Car, Waves, Trees, Flame, Wind, Tv, Coffee,
  UtensilsCrossed, Snowflake, Mountain, Building, Palette
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Checkbox } from '../components/ui/checkbox';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const amenityIcons = {
  pool: Waves,
  wifi: Wifi,
  ac: Wind,
  parking: Car,
  sea_view: Waves,
  garden: Trees,
  bbq: Flame,
  dishwasher: UtensilsCrossed,
  terrace: Building,
  washing_machine: Tv,
  kitchen: UtensilsCrossed,
  fireplace: Flame,
  sauna: Snowflake,
  ski_storage: Mountain,
  mountain_view: Mountain,
  heated_floors: Flame,
  elevator: Building,
  concierge: Coffee,
  city_view: Building,
  historic: Palette,
  art_collection: Palette,
  outdoor_shower: Waves,
  bikes: Car,
};

export const PropertyDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const dateLocale = lang === 'it' ? it : enUS;

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [guests, setGuests] = useState(2);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [reviews, setReviews] = useState([]);

  // Initial data + price calculation effects are declared after the useCallback definitions below.

  const fetchProperty = useCallback(async () => {
    try {
      const [propertyRes, availabilityRes, reviewsRes] = await Promise.all([
        axios.get(`${API}/properties/${slug}`),
        axios.get(`${API}/properties/${slug}/availability`).catch(() => ({ data: { bookings: [], blocked_dates: [] } })),
        axios.get(`${API}/reviews/${slug}`).catch(() => ({ data: [] }))
      ]);
      setProperty(propertyRes.data);
      setAvailability(availabilityRes.data);
      setReviews(reviewsRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const calculatePrice = useCallback(async () => {
    if (!dateRange.from || !dateRange.to || !property) return;
    try {
      const response = await axios.post(`${API}/properties/calculate-price`, {
        property_id: property.id,
        check_in: format(dateRange.from, 'yyyy-MM-dd'),
        check_out: format(dateRange.to, 'yyyy-MM-dd'),
        guests,
        extras: selectedExtras
      });
      setPriceBreakdown(response.data);
    } catch (error) {
      console.error('Price calculation error:', error);
      setPriceBreakdown(null);
    }
  }, [dateRange, guests, selectedExtras, property]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  useEffect(() => {
    if (property && dateRange.from && dateRange.to) {
      calculatePrice();
    }
  }, [calculatePrice, property, dateRange]);

  const disabledDates = useMemo(() => {
    if (!availability) return [];
    const disabled = [];

    // Add booked dates
    availability.bookings?.forEach(booking => {
      let current = parseISO(booking.check_in);
      const end = parseISO(booking.check_out);
      while (current < end) {
        disabled.push(new Date(current));
        current = addDays(current, 1);
      }
    });

    // Add iCal blocked dates
    availability.blocked_dates?.forEach(block => {
      let current = parseISO(block.start);
      const end = parseISO(block.end);
      while (current < end) {
        disabled.push(new Date(current));
        current = addDays(current, 1);
      }
    });

    return disabled;
  }, [availability]);

  const calendarDisabledRules = useMemo(
    () => [{ before: new Date() }, ...disabledDates],
    [disabledDates]
  );

  // Quick ISO-date lookup so the modifiers functions stay O(1).
  const disabledIsoSet = useMemo(() => {
    const s = new Set();
    disabledDates.forEach((d) => s.add(format(d, 'yyyy-MM-dd')));
    return s;
  }, [disabledDates]);

  // Highlight modifiers: green for bookable days, red for booked/blocked (future).
  const calendarModifiers = useMemo(() => {
    const today = startOfToday();
    return {
      unavailable: (date) =>
        date >= today && disabledIsoSet.has(format(date, 'yyyy-MM-dd')),
      available: (date) =>
        date >= today && !disabledIsoSet.has(format(date, 'yyyy-MM-dd'))
    };
  }, [disabledIsoSet]);

  // tailwind `!` prefix bumps specificity over the base `day` + `day_disabled` classes.
  const calendarModifiersClassNames = {
    unavailable: '!bg-red-100 !text-red-700 !line-through !opacity-100 hover:!bg-red-100',
    available: '!bg-green-50 !text-green-900 hover:!bg-green-100'
  };

  const handleProceedToBooking = () => {
    if (!dateRange.from || !dateRange.to || !priceBreakdown) return;
    
    navigate('/booking', {
      state: {
        property,
        dateRange,
        guests,
        selectedExtras,
        priceBreakdown
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {lang === 'it' ? 'Proprietà non trovata' : 'Property not found'}
          </p>
          <Button onClick={() => navigate('/properties')}>{t('nav.properties')}</Button>
        </div>
      </div>
    );
  }

  const translation = property.translations[lang] || property.translations['it'];
  const whatsappNumber = '+393445361830';
  const whatsappMessage = encodeURIComponent(
    lang === 'it' 
      ? `Ciao! Sono interessato a ${translation.title}. Vorrei avere maggiori informazioni.`
      : `Hi! I'm interested in ${translation.title}. I'd like more information.`
  );

  // Upgrade image URL resolution for the full-screen hero gallery.
  // - Unsplash: rewrite/add `?w=2400&q=85&auto=format&fit=crop` so the image isn't upscaled.
  // - Backend-served images (/api/property-images/...): prefix with BACKEND_URL to make them absolute.
  // - Other URLs: leave as-is.
  const heroImageUrl = (src) => {
    if (!src) return '';
    if (src.startsWith('/api/')) return `${BACKEND_URL}${src}`;
    if (src.includes('images.unsplash.com')) {
      try {
        const u = new URL(src);
        u.searchParams.set('w', '2400');
        u.searchParams.set('q', '85');
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
        return u.toString();
      } catch (e) {
        return src;
      }
    }
    if (src.includes('images.pexels.com')) {
      try {
        const u = new URL(src);
        u.searchParams.set('auto', 'compress');
        u.searchParams.set('cs', 'tinysrgb');
        u.searchParams.set('w', '2400');
        return u.toString();
      } catch (e) {
        return src;
      }
    }
    return src;
  };

  return (
    <div className="min-h-screen pt-20" data-testid="property-detail-page">
      {/* Image Gallery — contained so we never upscale the source */}
      <section
        className="relative max-w-7xl mx-auto px-4 lg:px-8 mt-6"
        data-testid="property-gallery"
      >
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          <img
            src={heroImageUrl(property.images[currentImageIndex])}
            alt={translation.title}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E232B]/35 to-transparent pointer-events-none" />

          {/* Gallery Navigation */}
          {property.images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex(i => i === 0 ? property.images.length - 1 : i - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-foreground p-3 shadow-md transition-colors"
                data-testid="gallery-prev"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentImageIndex(i => i === property.images.length - 1 ? 0 : i + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-foreground p-3 shadow-md transition-colors"
                data-testid="gallery-next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Counter */}
              <div className="absolute bottom-4 right-4 bg-foreground/70 text-white text-xs px-3 py-1.5 tracking-wider">
                {currentImageIndex + 1} / {property.images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail strip — extra discoverability of the full gallery */}
        {property.images.length > 1 && (
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {property.images.slice(0, 8).map((img, idx) => (
              <button
                key={`strip-${img}-${idx}`}
                onClick={() => setCurrentImageIndex(idx)}
                className={`relative aspect-[4/3] overflow-hidden bg-muted transition-all ${
                  idx === currentImageIndex ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                }`}
                data-testid={`gallery-thumb-${idx}`}
              >
                <img
                  src={heroImageUrl(img)}
                  alt={`${translation.title} ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Header */}
            <div data-testid="property-header">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="w-4 h-4" />
                <span>{property.location.city}, {property.location.region}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-medium mb-4">
                {translation.title}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-foreground/70">
                {property.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-primary fill-primary" />
                    <span className="font-medium">{property.average_rating}</span>
                    <span className="text-muted-foreground">({property.total_reviews} {t('detail.reviews')})</span>
                  </div>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-5 h-5" />
                  {property.max_guests} {t('properties.guests')}
                </span>
                <span className="flex items-center gap-1">
                  <BedDouble className="w-5 h-5" />
                  {property.bedrooms} {t('properties.bedrooms')}
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="w-5 h-5" />
                  {property.bathrooms} {t('properties.bathrooms')}
                </span>
              </div>
            </div>

            {/* Description */}
            <div data-testid="property-description">
              <p className="text-foreground/80 text-lg leading-relaxed">
                {translation.description}
              </p>
              {translation.area_description && (
                <p className="text-muted-foreground mt-4">
                  {translation.area_description}
                </p>
              )}
            </div>

            {/* Amenities */}
            <div data-testid="property-amenities">
              <h2 className="text-2xl font-display font-medium mb-6">{t('detail.amenities')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {property.amenities.map((amenity) => {
                  const Icon = amenityIcons[amenity] || Check;
                  return (
                    <div key={amenity} className="flex items-center gap-3 p-3 bg-card border border-border/40">
                      <Icon className="w-5 h-5 text-primary" />
                      <span>{t(`amenity.${amenity}`)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location / Map */}
            <div data-testid="property-location-map">
              <h2 className="text-2xl font-display font-medium mb-3">
                {lang === 'it' ? 'Posizione' : 'Location'}
              </h2>
              <div className="flex items-start gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 mt-1 shrink-0 text-primary" />
                <div>
                  {property.location.address && (
                    <p className="text-foreground">{property.location.address}</p>
                  )}
                  <p className="text-sm">
                    {property.location.city}{property.location.region ? `, ${property.location.region}` : ''}{property.location.country ? `, ${property.location.country}` : ''}
                  </p>
                </div>
              </div>
              {(() => {
                const lat = Number(property.location.lat);
                const lng = Number(property.location.lng);
                const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0);
                const query = hasCoords
                  ? `${lat},${lng}`
                  : encodeURIComponent([property.location.address, property.location.city, property.location.region, property.location.country].filter(Boolean).join(', '));
                const delta = 0.01;
                const bbox = hasCoords
                  ? `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`
                  : null;
                const embedSrc = hasCoords
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
                  : null;
                return (
                  <div className="bg-muted border border-border/60 overflow-hidden">
                    {embedSrc ? (
                      <iframe
                        title="map"
                        src={embedSrc}
                        className="w-full aspect-[16/9]"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="aspect-[16/9] flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                        {lang === 'it' ? 'Coordinate non ancora impostate per questa proprietà' : 'Coordinates not yet set for this property'}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs">
                      <span className="text-muted-foreground">
                        {lang === 'it' ? 'L\u2019indirizzo esatto viene fornito dopo la prenotazione.' : 'The exact address is shared after booking.'}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${query}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                        data-testid="open-in-maps"
                      >
                        {lang === 'it' ? 'Apri in Google Maps' : 'Open in Google Maps'}
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div data-testid="property-reviews">
                <h2 className="text-2xl font-display font-medium mb-6">{t('detail.reviews')}</h2>
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-6 bg-card border border-border/40">
                      <div className="flex items-center gap-2 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={`${review.id}-star-${i}`}
                            className={`w-4 h-4 ${i < review.rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      <h4 className="font-medium mb-2">{review.title}</h4>
                      <p className="text-muted-foreground mb-3">{review.comment}</p>
                      <p className="text-sm text-muted-foreground">— {review.guest_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp Contact */}
            <div className="p-6 bg-card border border-border/40">
              <h3 className="text-xl font-display font-medium mb-4">
                {lang === 'it' ? 'Hai domande?' : 'Have questions?'}
              </h3>
              <a
                href={`https://wa.me/${whatsappNumber.replace('+', '')}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 btn-secondary px-6 py-3"
                data-testid="whatsapp-property-link"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {t('contact.whatsapp')}
              </a>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 glass p-6 space-y-6" data-testid="booking-sidebar">
              {/* Price Display */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-medium text-primary">
                    €{property.pricing.base_price}
                  </span>
                  <span className="text-muted-foreground">{t('properties.perNight')}</span>
                </div>

                {/* Long-stay discount hints */}
                {(property.pricing.weekly_discount > 0 || property.pricing.monthly_discount > 0) && (
                  <div className="flex flex-wrap gap-2 pt-1" data-testid="long-stay-discounts">
                    {property.pricing.weekly_discount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary border border-primary/20">
                        <span className="font-semibold">−{property.pricing.weekly_discount}%</span>
                        <span>{lang === 'it' ? 'soggiorni 7+ notti' : 'stays 7+ nights'}</span>
                      </span>
                    )}
                    {property.pricing.monthly_discount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary border border-primary/20">
                        <span className="font-semibold">−{property.pricing.monthly_discount}%</span>
                        <span>{lang === 'it' ? 'soggiorni 28+ notti' : 'stays 28+ nights'}</span>
                      </span>
                    )}
                  </div>
                )}
                {(property.pricing.weekly_discount > 0 || property.pricing.monthly_discount > 0) && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {lang === 'it'
                      ? 'Lo sconto viene applicato automaticamente in fase di prenotazione.'
                      : 'The discount is applied automatically at checkout.'}
                  </p>
                )}
              </div>

              {/* Calendar */}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                  {t('detail.checkIn')} - {t('detail.checkOut')}
                </label>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={calendarDisabledRules}
                  modifiers={calendarModifiers}
                  modifiersClassNames={calendarModifiersClassNames}
                  locale={dateLocale}
                  numberOfMonths={1}
                  className="bg-card border border-border/60 p-3"
                  data-testid="booking-calendar"
                />
                {/* Legend: green = available, red = booked/blocked */}
                <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground" data-testid="calendar-legend">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-green-50 border border-green-200" />
                    {lang === 'it' ? 'Disponibile' : 'Available'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-red-100 border border-red-200" />
                    {lang === 'it' ? 'Non disponibile' : 'Unavailable'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('detail.minNights')}: {property.min_nights} {t('detail.nights')}
                </p>
              </div>

              {/* Guests */}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  {t('detail.guests')}
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full bg-card border border-border/60 p-3 text-foreground"
                  data-testid="guests-select"
                >
                  {[...Array(property.max_guests)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {t('properties.guests')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extras */}
              {property.extras?.length > 0 && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                    {t('detail.extras')}
                  </label>
                  <div className="space-y-3">
                    {property.extras.map((extra) => (
                      <label key={extra.id} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedExtras.includes(extra.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedExtras([...selectedExtras, extra.id]);
                            } else {
                              setSelectedExtras(selectedExtras.filter(id => id !== extra.id));
                            }
                          }}
                          data-testid={`extra-${extra.id}`}
                        />
                        <span className="flex-1 text-sm">
                          {lang === 'it' ? extra.name_it : extra.name_en}
                        </span>
                        <span className="text-primary text-sm">
                          €{extra.price}{extra.per_night ? `/${t('detail.nights').slice(0, -1)}` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              {priceBreakdown && (
                <div className="border-t border-border/60 pt-6 space-y-3" data-testid="price-breakdown">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    {t('detail.priceBreakdown')}
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span>{t('detail.basePrice')} ({priceBreakdown.nights} {t('detail.nights')})</span>
                    <span>€{priceBreakdown.base_total}</span>
                  </div>
                  {priceBreakdown.seasonal_adjustment !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{t('detail.seasonalAdjustment')}</span>
                      <span className={priceBreakdown.seasonal_adjustment > 0 ? 'text-destructive' : 'text-green-500'}>
                        {priceBreakdown.seasonal_adjustment > 0 ? '+' : ''}€{priceBreakdown.seasonal_adjustment}
                      </span>
                    </div>
                  )}
                  {priceBreakdown.extras_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{t('detail.extrasTotal')}</span>
                      <span>€{priceBreakdown.extras_total}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>{t('detail.cleaningFee')}</span>
                    <span>€{priceBreakdown.cleaning_fee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('detail.securityDeposit')}</span>
                    <span>€{priceBreakdown.security_deposit}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-3 border-t border-border/60">
                    <span>{t('detail.total')}</span>
                    <span className="text-primary">€{priceBreakdown.total}</span>
                  </div>
                </div>
              )}

              {/* Book Button */}
              <Button
                onClick={handleProceedToBooking}
                disabled={!dateRange.from || !dateRange.to || !priceBreakdown}
                className="w-full btn-primary"
                data-testid="book-now-btn"
              >
                {t('detail.bookNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
