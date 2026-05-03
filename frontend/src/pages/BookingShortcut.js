import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { warn } from '@/lib/logger';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Shortcut URL that the AI concierge can send to guests:
 *   /prenota/:slug?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&guests=N
 *
 * Resolves the property, pre-calculates the price, then hands off to the
 * normal `/booking` page via React-Router state — exactly as the property
 * detail page does. Zero duplication of the existing booking flow.
 */
export const BookingShortcut = () => {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      const checkin = sp.get('checkin');
      const checkout = sp.get('checkout');
      const guestsRaw = sp.get('guests');
      const guests = Math.max(1, parseInt(guestsRaw || '2', 10) || 2);

      if (!slug || !checkin || !checkout) {
        toast.error(lang === 'it' ? 'Link prenotazione non valido' : 'Invalid booking link');
        navigate('/properties');
        return;
      }

      try {
        // 1) Load property
        const pRes = await axios.get(`${API}/properties/${slug}`);
        const property = pRes.data;

        // 2) Compute price
        const from = parseISO(checkin);
        const to = parseISO(checkout);
        const nights = Math.max(1, differenceInDays(to, from));

        const priceRes = await axios.post(`${API}/properties/${property.id}/calculate-price`, {
          check_in: checkin,
          check_out: checkout,
          guests,
          extras: []
        });
        if (cancelled) return;

        navigate('/booking', {
          state: {
            property,
            dateRange: { from, to },
            guests,
            selectedExtras: [],
            priceBreakdown: priceRes.data,
            nights
          }
        });
      } catch (err) {
        warn('BookingShortcut: resolve failed', err);
        toast.error(lang === 'it'
          ? 'Impossibile trovare la casa o calcolare il prezzo'
          : 'Could not resolve property or compute price');
        navigate('/properties');
      }
    };
    go();
    return () => { cancelled = true; };
  }, [slug, sp, navigate, lang]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3" data-testid="booking-shortcut">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {t('common.loading', lang === 'it' ? 'Preparo la tua prenotazione\u2026' : 'Preparing your booking\u2026')}
      </p>
    </div>
  );
};

export default BookingShortcut;
