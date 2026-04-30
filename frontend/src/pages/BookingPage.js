import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import axios from 'axios';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { DocumentUpload } from '../components/DocumentUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { property, dateRange, guests, selectedExtras, priceBreakdown } = location.state || {};

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    notes: ''
  });
  const [paymentType, setPaymentType] = useState('full');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!property || !dateRange || !priceBreakdown) {
      navigate('/properties');
    }
  }, [property, dateRange, priceBreakdown, navigate]);

  if (!property || !dateRange || !priceBreakdown) return null;

  const translation = property.translations[lang] || property.translations['it'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create booking
      const bookingResponse = await axios.post(`${API}/bookings`, {
        property_id: property.id,
        check_in: format(dateRange.from, 'yyyy-MM-dd'),
        check_out: format(dateRange.to, 'yyyy-MM-dd'),
        guests,
        extras: selectedExtras,
        ...formData
      });

      const bookingId = bookingResponse.data.id;

      // Save booking id locally so success page can offer ID document upload
      try {
        localStorage.setItem('terracito.last_booking_id', bookingId);
      } catch (_) { /* storage may be disabled */ }

      // Create Stripe checkout session
      const checkoutResponse = await axios.post(`${API}/payments/create-checkout`, null, {
        params: {
          booking_id: bookingId,
          payment_type: paymentType
        },
        headers: {
          'origin': window.location.origin
        }
      });

      // Redirect to Stripe
      window.location.href = checkoutResponse.data.checkout_url;
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.detail || t('common.error'));
      setLoading(false);
    }
  };

  const paymentAmount = paymentType === 'full' 
    ? priceBreakdown.total 
    : priceBreakdown.security_deposit;

  return (
    <div className="min-h-screen pt-20 pb-16" data-testid="booking-page">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-display font-medium mb-8">
          {t('booking.title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Guest Details */}
              <div className="glass p-6 space-y-6" data-testid="guest-details-form">
                <h2 className="text-xl font-display font-medium">{t('booking.yourDetails')}</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                      {t('booking.fullName')} *
                    </label>
                    <Input
                      value={formData.guest_name}
                      onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                      required
                      className="input-luxury border rounded-none bg-transparent"
                      data-testid="guest-name-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                      {t('booking.email')} *
                    </label>
                    <Input
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                      required
                      className="input-luxury border rounded-none bg-transparent"
                      data-testid="guest-email-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {t('booking.phone')} *
                  </label>
                  <Input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    required
                    className="input-luxury border rounded-none bg-transparent"
                    data-testid="guest-phone-input"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {t('booking.notes')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full input-luxury border rounded-none bg-transparent resize-none"
                    data-testid="guest-notes-input"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="glass p-6 space-y-6" data-testid="payment-method-form">
                <h2 className="text-xl font-display font-medium">{t('booking.paymentMethod')}</h2>
                
                <RadioGroup value={paymentType} onValueChange={setPaymentType}>
                  <label className="flex items-center gap-4 p-4 border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
                    <RadioGroupItem value="full" id="full" data-testid="payment-full" />
                    <div className="flex-1">
                      <p className="font-medium">{t('booking.payFull')}</p>
                      <p className="text-sm text-muted-foreground">€{priceBreakdown.total}</p>
                    </div>
                    <Check className={`w-5 h-5 ${paymentType === 'full' ? 'text-primary' : 'text-transparent'}`} />
                  </label>
                  
                  <label className="flex items-center gap-4 p-4 border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
                    <RadioGroupItem value="deposit" id="deposit" data-testid="payment-deposit" />
                    <div className="flex-1">
                      <p className="font-medium">{t('booking.payDeposit')}</p>
                      <p className="text-sm text-muted-foreground">€{priceBreakdown.security_deposit}</p>
                    </div>
                    <Check className={`w-5 h-5 ${paymentType === 'deposit' ? 'text-primary' : 'text-transparent'}`} />
                  </label>
                </RadioGroup>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>{lang === 'it' ? 'Pagamento sicuro con Stripe' : 'Secure payment with Stripe'}</span>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full btn-primary"
                data-testid="confirm-booking-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    {t('booking.confirm')} - €{paymentAmount}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 glass p-6 space-y-6" data-testid="booking-summary">
              <div className="flex gap-4">
                <img
                  src={property.images[0]}
                  alt={translation.title}
                  className="w-24 h-24 object-cover"
                />
                <div>
                  <h3 className="font-display font-medium">{translation.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {property.location.city}, {property.location.region}
                  </p>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.checkIn')}</span>
                  <span>{format(dateRange.from, 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.checkOut')}</span>
                  <span>{format(dateRange.to, 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.guests')}</span>
                  <span>{guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.nights')}</span>
                  <span>{priceBreakdown.nights}</span>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>{t('detail.total')}</span>
                  <span className="text-primary">€{priceBreakdown.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('terracito.last_booking_id');
      if (stored) setBookingId(stored);
    } catch (_) { /* ignore */ }
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    if (attempts >= 5) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        setStatus('success');
        setPaymentInfo(response.data);
        return;
      } else if (response.data.status === 'expired') {
        setStatus('expired');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    } catch (error) {
      console.error('Status check error:', error);
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center justify-center" data-testid="booking-success-page">
      <div className="max-w-xl w-full mx-auto px-6 text-center">
        {status === 'checking' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
            <h1 className="text-2xl font-display font-medium mb-4">
              {lang === 'it' ? 'Verifica pagamento...' : 'Verifying payment...'}
            </h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-medium mb-4">
              {t('booking.success')}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('booking.successMessage')}
            </p>
            {paymentInfo && (
              <p className="text-sm text-muted-foreground mb-6">
                {lang === 'it' ? 'Importo pagato' : 'Amount paid'}: €{paymentInfo.amount}
              </p>
            )}

            {bookingId && (
              <div className="my-8">
                <DocumentUpload bookingId={bookingId} />
              </div>
            )}

            <Button onClick={() => navigate('/')} className="btn-primary mt-4" data-testid="success-home-btn">
              {lang === 'it' ? 'Torna alla Home' : 'Back to Home'}
            </Button>
          </>
        )}

        {status === 'expired' && (
          <>
            <h1 className="text-2xl font-display font-medium mb-4 text-destructive">
              {lang === 'it' ? 'Sessione scaduta' : 'Session expired'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {lang === 'it' 
                ? 'La sessione di pagamento è scaduta. Per favore riprova.'
                : 'The payment session has expired. Please try again.'}
            </p>
            <Button onClick={() => navigate('/properties')} className="btn-primary">
              {t('nav.properties')}
            </Button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <h1 className="text-2xl font-display font-medium mb-4">
              {lang === 'it' ? 'Verifica in corso' : 'Verification in progress'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {lang === 'it' 
                ? 'Riceverai una email di conferma a breve.'
                : 'You will receive a confirmation email shortly.'}
            </p>
            <Button onClick={() => navigate('/')} className="btn-primary">
              {lang === 'it' ? 'Torna alla Home' : 'Back to Home'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
