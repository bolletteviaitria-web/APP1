import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MapPin, Phone, Mail, Send, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ContactPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const whatsappNumber = '+393445361830';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/contact`, formData);
      toast.success(t('contact.success'));
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20" data-testid="contact-page">
      {/* Header */}
      <section className="bg-card py-16 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <span className="overline mb-4 block">{t('hero.overline')}</span>
          <h1 className="text-4xl sm:text-5xl font-display font-medium mb-4">
            {t('contact.title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              {/* WhatsApp Card */}
              <a
                href={`https://wa.me/${whatsappNumber.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block glass p-8 hover:border-primary/30 transition-colors group"
                data-testid="whatsapp-contact-card"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-medium mb-2 group-hover:text-primary transition-colors">
                      {t('contact.whatsapp')}
                    </h3>
                    <p className="text-muted-foreground">
                      {lang === 'it' 
                        ? 'Rispondiamo entro pochi minuti durante l\'orario di lavoro'
                        : 'We respond within minutes during business hours'}
                    </p>
                    <p className="text-primary mt-2">{whatsappNumber}</p>
                  </div>
                </div>
              </a>

              {/* Other Contact Info */}
              <div className="glass p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Email</h4>
                    <a href="mailto:info@terracitoappartments.com" className="text-muted-foreground hover:text-primary transition-colors">
                      info@terracitoappartments.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{lang === 'it' ? 'Telefono' : 'Phone'}</h4>
                    <a href="tel:+393445361830" className="text-muted-foreground hover:text-primary transition-colors">
                      +39 344 536 1830
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{lang === 'it' ? 'Sede' : 'Office'}</h4>
                    <p className="text-muted-foreground">
                      Via Roma 123<br />
                      00100 Roma, Italia
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="glass p-8" data-testid="contact-form">
              <h2 className="text-2xl font-display font-medium mb-6">
                {lang === 'it' ? 'Inviaci un messaggio' : 'Send us a message'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {t('contact.name')} *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="input-luxury border rounded-none bg-transparent"
                    data-testid="contact-name-input"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {t('contact.email')} *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="input-luxury border rounded-none bg-transparent"
                    data-testid="contact-email-input"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {t('contact.phone')}
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-luxury border rounded-none bg-transparent"
                    data-testid="contact-phone-input"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {t('contact.message')} *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={5}
                    className="w-full input-luxury border rounded-none bg-transparent resize-none"
                    data-testid="contact-message-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                  data-testid="contact-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t('contact.send')}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
