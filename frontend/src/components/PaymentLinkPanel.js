import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Copy, ExternalLink, Trash2, RefreshCw } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STYLE = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/40',
  paid: 'bg-green-500/10 text-green-700 border-green-500/40',
  expired: 'bg-muted text-muted-foreground border-border/60',
  cancelled: 'bg-red-500/10 text-red-700 border-red-500/40',
};

const empty = {
  amount: '',
  description: '',
  customer_name: '',
  customer_email: '',
  check_in: '',
  check_out: '',
  location: '',
  notes: '',
  expires_in_days: 30,
};

export const PaymentLinkPanel = ({ lang, t }) => {
  const isIt = lang === 'it';
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/payment-links`);
      setLinks(res.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || (isIt ? 'Errore caricamento' : 'Load error'));
    } finally {
      setLoading(false);
    }
  }, [isIt]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error(isIt ? 'Inserisci una descrizione' : 'Enter a description'); return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error(isIt ? 'Importo non valido' : 'Invalid amount'); return;
    }
    setCreating(true);
    try {
      const payload = {
        ...form,
        amount: amt,
        expires_in_days: parseInt(form.expires_in_days || 30, 10),
      };
      // Drop empty optional strings so the backend doesn't reject empty email
      ['customer_email', 'customer_name', 'check_in', 'check_out', 'location', 'notes'].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      const res = await axios.post(`${API}/admin/payment-links`, payload);
      setLinks((prev) => [res.data, ...prev]);
      setForm(empty);
      toast.success(isIt ? 'Link creato — pronto da copiare' : 'Link created — ready to copy');
      navigator.clipboard?.writeText(res.data.public_url);
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard?.writeText(url);
    toast.success(isIt ? 'Link copiato' : 'Link copied');
  };

  const deleteLink = async (id) => {
    if (!window.confirm(isIt ? 'Eliminare questo link?' : 'Delete this link?')) return;
    try {
      await axios.delete(`${API}/admin/payment-links/${id}`);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success(isIt ? 'Link eliminato' : 'Link deleted');
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  return (
    <div className="space-y-6" data-testid="paylink-tab-content">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium">
            {isIt ? 'Link di pagamento' : 'Payment links'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isIt
              ? 'Crea un link Stripe personalizzato (importo, motivo, eventuali date) e mandalo al cliente. Quando paga riceverai un\u2019email automatica.'
              : 'Create a custom Stripe link (amount, description, optional dates) and send it to the customer. You\u2019ll get an email when paid.'}
          </p>
        </div>
        <Button onClick={fetchLinks} variant="ghost" size="icon">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <form onSubmit={handleCreate} className="surface-card p-6 space-y-4" data-testid="paylink-create-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              {isIt ? 'Importo (€) *' : 'Amount (€) *'}
            </label>
            <Input
              type="number" step="0.01" min="0.5"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="350.00"
              required
              data-testid="paylink-amount"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              {isIt ? 'Validità (giorni)' : 'Expires (days)'}
            </label>
            <Input
              type="number" min="1" max="365"
              value={form.expires_in_days}
              onChange={(e) => setForm({ ...form, expires_in_days: e.target.value })}
              data-testid="paylink-expires"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
            {isIt ? 'Motivazione / descrizione *' : 'Reason / description *'}
          </label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={isIt ? 'Es. Acconto soggiorno luglio + pulizie extra' : 'E.g. July stay deposit + extra cleaning'}
            required
            data-testid="paylink-description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              {isIt ? 'Nome cliente (opz.)' : 'Customer name (opt.)'}
            </label>
            <Input
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Mario Rossi"
              data-testid="paylink-customer-name"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              {isIt ? 'Email cliente (opz.)' : 'Customer email (opt.)'}
            </label>
            <Input
              type="email"
              value={form.customer_email}
              onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
              placeholder="cliente@esempio.it"
              data-testid="paylink-customer-email"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              {isIt ? 'Check-in (opz.)' : 'Check-in (opt.)'}
            </label>
            <Input
              type="date"
              value={form.check_in}
              onChange={(e) => setForm({ ...form, check_in: e.target.value })}
              data-testid="paylink-checkin"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              {isIt ? 'Check-out (opz.)' : 'Check-out (opt.)'}
            </label>
            <Input
              type="date"
              value={form.check_out}
              onChange={(e) => setForm({ ...form, check_out: e.target.value })}
              data-testid="paylink-checkout"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              {isIt ? 'Luogo (opz.)' : 'Location (opt.)'}
            </label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Reggio Calabria"
              data-testid="paylink-location"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
            {isIt ? 'Note interne (opz.)' : 'Internal notes (opt.)'}
          </label>
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={isIt ? 'Visibili al cliente sulla pagina di pagamento' : 'Visible to the customer on the payment page'}
            data-testid="paylink-notes"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button type="submit" disabled={creating} data-testid="paylink-create-btn">
            {creating
              ? (isIt ? 'Creazione\u2026' : 'Creating\u2026')
              : (isIt ? 'Crea link e copia' : 'Create link & copy')}
          </Button>
        </div>
      </form>

      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <h2 className="font-medium">
            {isIt ? 'Link recenti' : 'Recent links'} <span className="text-muted-foreground text-sm">({links.length})</span>
          </h2>
        </div>
        {links.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {isIt ? 'Nessun link generato ancora.' : 'No links generated yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {links.map((l) => (
              <li key={l.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3" data-testid={`paylink-row-${l.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-mono font-semibold">€{Number(l.amount).toFixed(2)}</span>
                    <Badge className={`text-[10px] uppercase ${STATUS_STYLE[l.status] || STATUS_STYLE.pending}`}>
                      {l.status}
                    </Badge>
                    {l.customer_name && <span className="text-sm text-muted-foreground">— {l.customer_name}</span>}
                  </div>
                  <p className="text-sm truncate">{l.description}</p>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-1">
                    {l.check_in && <span>{l.check_in} → {l.check_out}</span>}
                    {l.location && <span>📍 {l.location}</span>}
                    {l.expires_at && <span>{isIt ? 'Scade' : 'Expires'} {new Date(l.expires_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => copyUrl(l.public_url)}
                    title={l.public_url}
                    data-testid={`paylink-copy-${l.id}`}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {isIt ? 'Copia link' : 'Copy link'}
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => window.open(l.public_url, '_blank', 'noopener')}
                    title={isIt ? 'Apri pagina pagamento' : 'Open payment page'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => deleteLink(l.id)}
                    className="text-destructive hover:bg-destructive/10"
                    data-testid={`paylink-delete-${l.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PaymentLinkPanel;
