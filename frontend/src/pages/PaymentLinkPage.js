import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { CheckCircle2, AlertTriangle, CreditCard, Loader2, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentLinkPage() {
  const { token } = useParams();
  const [search] = useSearchParams();
  const success = search.get('success') === '1';
  const cancelled = search.get('cancelled') === '1';

  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  const fetchLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/payment-links/${token}`);
      setLink(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Link non valido');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLink(); }, [fetchLink, success]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await axios.post(`${API}/payment-links/${token}/checkout`);
      window.location.href = res.data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Impossibile creare la sessione');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="surface-card p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-display font-medium mb-2">Link non disponibile</h1>
          <p className="text-sm text-muted-foreground mb-6">{error || 'Il link non esiste pi\u00f9 o \u00e8 stato annullato.'}</p>
          <Link to="/" className="text-primary underline text-sm">Torna alla home</Link>
        </div>
      </div>
    );
  }

  const isPaid = link.status === 'paid' || success;
  const isCancelled = link.status === 'cancelled';
  const isExpired = link.status === 'expired';

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-lg" data-testid="paylink-public-page">
        <div className="surface-card p-8">
          {/* Status banner */}
          {isPaid && (
            <div role="alert" className="flex gap-3 border-l-4 border-green-600 bg-green-50 dark:bg-green-950/20 px-4 py-3 mb-6" data-testid="paylink-success-banner">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Pagamento ricevuto</p>
                <p className="text-sm text-green-800 dark:text-green-300 mt-1">Grazie! Riceverai conferma a breve. Puoi chiudere questa pagina.</p>
              </div>
            </div>
          )}
          {cancelled && !isPaid && (
            <div role="alert" className="flex gap-3 border-l-4 border-amber-600 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">Pagamento annullato. Puoi riprovare quando vuoi.</p>
            </div>
          )}
          {(isCancelled || isExpired) && (
            <div role="alert" className="flex gap-3 border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">
                {isExpired ? 'Questo link \u00e8 scaduto. Contatta il proprietario per riceverne uno nuovo.' : 'Link annullato dal proprietario.'}
              </p>
            </div>
          )}

          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Richiesta di pagamento</p>
          <h1 className="text-3xl md:text-4xl font-display font-medium mb-1" data-testid="paylink-amount">
            €{Number(link.amount).toFixed(2)}
          </h1>
          <p className="text-base text-foreground mb-6" data-testid="paylink-description">{link.description}</p>

          <div className="space-y-2 text-sm text-muted-foreground mb-8">
            {link.customer_name && <p><span className="text-foreground font-medium">Intestatario:</span> {link.customer_name}</p>}
            {(link.check_in || link.check_out) && (
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {link.check_in || '—'} → {link.check_out || '—'}
              </p>
            )}
            {link.location && (
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {link.location}
              </p>
            )}
            {link.notes && <p className="italic pt-2 border-t border-border/30">{link.notes}</p>}
          </div>

          {!isPaid && !isCancelled && !isExpired && (
            <Button
              onClick={handlePay}
              disabled={paying}
              size="lg"
              className="w-full"
              data-testid="paylink-pay-btn"
            >
              {paying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Apertura Stripe\u2026</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Paga ora con carta</>
              )}
            </Button>
          )}

          <p className="text-[11px] text-muted-foreground text-center mt-6">
            Pagamento sicuro processato da Stripe. La tua carta non viene salvata sui nostri server.
          </p>
        </div>
      </div>
    </div>
  );
}
