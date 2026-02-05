import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
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

  useEffect(() => {
    fetchProperty();
  }, [slug]);

  useEffect(() => {
    if (property && dateRange.from && dateRange.to) {
      calculatePrice();
    }
  }, [dateRange, guests, selectedExtras, property]);

  const fetchProperty = async () => {
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
  };

  const calculatePrice = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
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
  };

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

  return (
    <div className="min-h-screen pt-20" data-testid="property-detail-page">
      {/* Image Gallery */}
      <section className="relative h-[60vh] bg-card" data-testid="property-gallery">
        <img
          src={property.images[currentImageIndex]}
          alt={translation.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020408]/60 to-transparent" />
        
        {/* Gallery Navigation */}
        {property.images.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImageIndex(i => i === 0 ? property.images.length - 1 : i - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 glass p-3 hover:bg-white/10 transition-colors"
              data-testid="gallery-prev"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentImageIndex(i => i === property.images.length - 1 ? 0 : i + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 glass p-3 hover:bg-white/10 transition-colors"
              data-testid="gallery-next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Thumbnails */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {property.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentImageIndex ? 'bg-primary' : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
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
                    <div key={amenity} className="flex items-center gap-3 p-3 bg-card border border-white/5">
                      <Icon className="w-5 h-5 text-primary" />
                      <span>{t(`amenity.${amenity}`)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div data-testid="property-reviews">
                <h2 className="text-2xl font-display font-medium mb-6">{t('detail.reviews')}</h2>
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-6 bg-card border border-white/5">
                      <div className="flex items-center gap-2 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
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
            <div className="p-6 bg-card border border-white/5">
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
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-medium text-primary">
                  €{property.pricing.base_price}
                </span>
                <span className="text-muted-foreground">{t('properties.perNight')}</span>
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
                  disabled={[{ before: new Date() }, ...disabledDates]}
                  locale={dateLocale}
                  numberOfMonths={1}
                  className="bg-card border border-white/10 p-3"
                  data-testid="booking-calendar"
                />
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
                  className="w-full bg-card border border-white/10 p-3 text-foreground"
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
                <div className="border-t border-white/10 pt-6 space-y-3" data-testid="price-breakdown">
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
                  <div className="flex justify-between font-medium text-lg pt-3 border-t border-white/10">
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
