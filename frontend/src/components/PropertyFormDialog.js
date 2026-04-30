import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Upload, Loader2, X, Image as ImageIcon, GripVertical
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from './ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AMENITY_OPTIONS = [
  'pool', 'wifi', 'ac', 'parking', 'sea_view', 'garden', 'bbq', 'dishwasher',
  'terrace', 'washing_machine', 'kitchen', 'fireplace', 'sauna', 'ski_storage',
  'mountain_view', 'heated_floors', 'elevator', 'concierge', 'city_view',
  'historic', 'art_collection', 'outdoor_shower', 'bikes'
];

const emptyProperty = () => ({
  slug: '',
  translations: {
    it: { title: '', description: '', area_description: '' },
    en: { title: '', description: '', area_description: '' }
  },
  location: { address: '', city: '', region: '', country: 'Italia', lat: 0, lng: 0 },
  amenities: [],
  max_guests: 4,
  bedrooms: 2,
  bathrooms: 1,
  images: [],
  pricing: {
    base_price: 100,
    weekend_price: 0,
    weekly_discount: 0,
    monthly_discount: 0,
    cleaning_fee: 0,
    security_deposit: 0,
    extra_guest_fee: 0
  },
  seasons: [],
  extras: [],
  min_nights: 1,
  is_active: true
});

const resolveImageUrl = (src) => {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${BACKEND_URL}${src}`;
  return src;
};

export const PropertyFormDialog = ({ open, onOpenChange, property, onSaved }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [form, setForm] = useState(emptyProperty());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (property) {
      setForm({
        ...emptyProperty(),
        ...property,
        translations: {
          it: { title: '', description: '', area_description: '', ...(property.translations?.it || {}) },
          en: { title: '', description: '', area_description: '', ...(property.translations?.en || {}) }
        },
        pricing: { ...emptyProperty().pricing, ...(property.pricing || {}) },
        location: { ...emptyProperty().location, ...(property.location || {}) },
        amenities: property.amenities || [],
        images: property.images || [],
        seasons: property.seasons || [],
        extras: property.extras || []
      });
    } else {
      setForm(emptyProperty());
    }
  }, [property, open]);

  const isEdit = Boolean(property?.id);
  const tt = (it, en) => (lang === 'it' ? it : en);

  const setTr = (l, key, val) => setForm((f) => ({
    ...f,
    translations: { ...f.translations, [l]: { ...f.translations[l], [key]: val } }
  }));
  const setLoc = (key, val) => setForm((f) => ({ ...f, location: { ...f.location, [key]: val } }));
  const setPricing = (key, val) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [key]: Number(val) || 0 } }));

  const toggleAmenity = (a) => setForm((f) => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a]
  }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 5) {
      toast.error(tt('Massimo 5 foto alla volta', 'Max 5 photos at a time'));
      e.target.value = '';
      return;
    }

    // Pre-validate sizes
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(tt(`"${f.name}" è troppo grande (max 10MB)`, `"${f.name}" is too large (max 10MB)`));
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    let succeeded = 0;
    let failed = 0;
    const newUrls = [];

    // Upload in parallel for speed
    const results = await Promise.all(files.map(async (file) => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API}/admin/properties/upload-image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return { ok: true, url: res.data.url };
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        return { ok: false, name: file.name, msg: err.response?.data?.detail || err.message };
      }
    }));

    for (const r of results) {
      if (r.ok) { newUrls.push(r.url); succeeded++; } else { failed++; }
    }

    if (newUrls.length) {
      setForm((f) => ({ ...f, images: [...f.images, ...newUrls] }));
    }
    if (succeeded && !failed) {
      toast.success(tt(`${succeeded} foto caricate`, `${succeeded} photos uploaded`));
    } else if (succeeded && failed) {
      toast.warning(tt(`${succeeded} caricate, ${failed} fallite`, `${succeeded} uploaded, ${failed} failed`));
    } else {
      toast.error(tt('Caricamento fallito', 'Upload failed'));
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addImageUrl = () => {
    const v = imageUrlInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, images: [...f.images, v] }));
    setImageUrlInput('');
  };
  const removeImage = (idx) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  const moveImage = (idx, dir) => setForm((f) => {
    const arr = [...f.images];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return f;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    return { ...f, images: arr };
  });

  // Seasons management — each row gets a stable client-side _key for React reconciliation
  const addSeason = () => setForm((f) => ({
    ...f,
    seasons: [...f.seasons, { _key: crypto.randomUUID?.() || `s-${Math.random()}`, name: '', start_date: '', end_date: '', price_multiplier: 1.0 }]
  }));
  const updateSeason = (idx, key, val) => setForm((f) => ({
    ...f,
    seasons: f.seasons.map((s, i) => i === idx ? { ...s, [key]: key === 'price_multiplier' ? Number(val) || 0 : val } : s)
  }));
  const removeSeason = (idx) => setForm((f) => ({ ...f, seasons: f.seasons.filter((_, i) => i !== idx) }));

  // Extras management
  const addExtra = () => setForm((f) => ({
    ...f,
    extras: [...f.extras, { id: crypto.randomUUID?.() || String(Math.random()), name_it: '', name_en: '', price: 0, per_night: false }]
  }));
  const updateExtra = (idx, key, val) => setForm((f) => ({
    ...f,
    extras: f.extras.map((e, i) => i === idx ? { ...e, [key]: key === 'price' ? Number(val) || 0 : val } : e)
  }));
  const removeExtra = (idx) => setForm((f) => ({ ...f, extras: f.extras.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.slug || !form.translations.it.title || !form.translations.en.title) {
      toast.error(tt('Compila slug e titoli IT/EN', 'Fill slug and IT/EN titles'));
      return;
    }
    if (form.images.length === 0) {
      toast.error(tt('Aggiungi almeno un\u2019immagine', 'Add at least one image'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_guests: Number(form.max_guests) || 1,
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        min_nights: Number(form.min_nights) || 1,
        location: {
          ...form.location,
          lat: Number(form.location.lat) || 0,
          lng: Number(form.location.lng) || 0
        }
      };
      if (isEdit) {
        await axios.put(`${API}/properties/${property.id}`, payload);
        toast.success(tt('Proprietà aggiornata', 'Property updated'));
      } else {
        await axios.post(`${API}/properties`, payload);
        toast.success(tt('Proprietà creata', 'Property created'));
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || tt('Salvataggio fallito', 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto"
        data-testid="property-form-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? tt('Modifica Proprietà', 'Edit Property') : tt('Nuova Proprietà', 'New Property')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Basic */}
          <section className="space-y-4">
            <h3 className="font-display text-lg text-primary">{tt('Informazioni di Base', 'Basic Info')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.replace(/\s+/g, '-').toLowerCase() }))}
                  placeholder="villa-smeraldo"
                  data-testid="form-slug"
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-[hsl(var(--primary))]"
                    data-testid="form-active"
                  />
                  {tt('Attivo', 'Active')}
                </label>
              </div>
            </div>
          </section>

          {/* Translations */}
          <section className="space-y-4">
            <h3 className="font-display text-lg text-primary">{tt('Traduzioni', 'Translations')}</h3>
            {['it', 'en'].map((l) => (
              <div key={l} className="space-y-3 p-4 border border-border bg-muted/30">
                <p className="overline">{l === 'it' ? 'Italiano' : 'English'}</p>
                <Input
                  value={form.translations[l].title}
                  onChange={(e) => setTr(l, 'title', e.target.value)}
                  placeholder={tt('Titolo', 'Title')}
                  data-testid={`form-title-${l}`}
                />
                <Textarea
                  value={form.translations[l].description}
                  onChange={(e) => setTr(l, 'description', e.target.value)}
                  rows={3}
                  placeholder={tt('Descrizione', 'Description')}
                  data-testid={`form-desc-${l}`}
                />
                <Input
                  value={form.translations[l].area_description || ''}
                  onChange={(e) => setTr(l, 'area_description', e.target.value)}
                  placeholder={tt('Descrizione zona / quartiere', 'Area description')}
                  data-testid={`form-area-${l}`}
                />
              </div>
            ))}
          </section>

          {/* Location */}
          <section className="space-y-4">
            <h3 className="font-display text-lg text-primary">{tt('Posizione', 'Location')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input value={form.location.address} onChange={(e) => setLoc('address', e.target.value)} placeholder={tt('Indirizzo', 'Address')} data-testid="form-address" />
              <Input value={form.location.city} onChange={(e) => setLoc('city', e.target.value)} placeholder={tt('Città', 'City')} data-testid="form-city" />
              <Input value={form.location.region} onChange={(e) => setLoc('region', e.target.value)} placeholder={tt('Regione', 'Region')} data-testid="form-region" />
              <Input value={form.location.country} onChange={(e) => setLoc('country', e.target.value)} placeholder={tt('Paese', 'Country')} />
              <Input type="number" step="any" value={form.location.lat} onChange={(e) => setLoc('lat', e.target.value)} placeholder="Lat" />
              <Input type="number" step="any" value={form.location.lng} onChange={(e) => setLoc('lng', e.target.value)} placeholder="Lng" />
            </div>
          </section>

          {/* Capacity */}
          <section className="space-y-4">
            <h3 className="font-display text-lg text-primary">{tt('Capacità', 'Capacity')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Ospiti Max', 'Max Guests')}</Label>
                <Input type="number" min="1" value={form.max_guests} onChange={(e) => setForm((f) => ({ ...f, max_guests: e.target.value }))} data-testid="form-guests" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Camere', 'Bedrooms')}</Label>
                <Input type="number" min="0" value={form.bedrooms} onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))} data-testid="form-bedrooms" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Bagni', 'Bathrooms')}</Label>
                <Input type="number" min="0" value={form.bathrooms} onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))} data-testid="form-bathrooms" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Notti min.', 'Min nights')}</Label>
                <Input type="number" min="1" value={form.min_nights} onChange={(e) => setForm((f) => ({ ...f, min_nights: e.target.value }))} data-testid="form-min-nights" />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="space-y-4">
            <h3 className="font-display text-lg text-primary">{tt('Prezzi', 'Pricing')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Prezzo base €/notte', 'Base price €/night')}</Label>
                <Input type="number" min="0" value={form.pricing.base_price} onChange={(e) => setPricing('base_price', e.target.value)} data-testid="form-base-price" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Prezzo weekend €', 'Weekend price €')}</Label>
                <Input type="number" min="0" value={form.pricing.weekend_price} onChange={(e) => setPricing('weekend_price', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Pulizia €', 'Cleaning €')}</Label>
                <Input type="number" min="0" value={form.pricing.cleaning_fee} onChange={(e) => setPricing('cleaning_fee', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Cauzione €', 'Deposit €')}</Label>
                <Input type="number" min="0" value={form.pricing.security_deposit} onChange={(e) => setPricing('security_deposit', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Sconto settim. %', 'Weekly disc. %')}</Label>
                <Input type="number" min="0" max="100" value={form.pricing.weekly_discount} onChange={(e) => setPricing('weekly_discount', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Sconto mensile %', 'Monthly disc. %')}</Label>
                <Input type="number" min="0" max="100" value={form.pricing.monthly_discount} onChange={(e) => setPricing('monthly_discount', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tt('Ospite extra €/notte', 'Extra guest €/night')}</Label>
                <Input type="number" min="0" value={form.pricing.extra_guest_fee} onChange={(e) => setPricing('extra_guest_fee', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="space-y-4">
            <h3 className="font-display text-lg text-primary">{tt('Foto', 'Photos')}</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                multiple
                onChange={handleUpload}
                className="hidden"
                data-testid="form-image-file"
              />
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary" data-testid="form-image-upload-btn">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tt('Caricamento\u2026', 'Uploading\u2026')}</> : <><Upload className="w-4 h-4 mr-2" />{tt('Carica foto (max 5)', 'Upload photos (max 5)')}</>}
              </Button>
              <div className="flex-1 flex gap-2">
                <Input value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder={tt('o incolla URL pubblico', 'or paste public URL')} data-testid="form-image-url" />
                <Button type="button" variant="outline" onClick={addImageUrl} data-testid="form-image-url-add">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {form.images.length > 0 ? (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="form-image-list">
                {form.images.map((src, idx) => (
                  <li key={`${src}-${idx}`} className="relative group border border-border bg-muted/30 aspect-[4/3]">
                    <img
                      src={resolveImageUrl(src)}
                      alt={`img-${idx}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="bg-card text-foreground p-1.5 disabled:opacity-30">
                        <GripVertical className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                      <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === form.images.length - 1} className="bg-card text-foreground p-1.5 disabled:opacity-30">
                        <GripVertical className="w-3.5 h-3.5 rotate-90" />
                      </button>
                      <button type="button" onClick={() => removeImage(idx)} className="bg-destructive text-destructive-foreground p-1.5" data-testid={`form-image-remove-${idx}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider px-2 py-0.5">
                        {tt('Cover', 'Cover')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {tt('Nessuna foto. Carica almeno una.', 'No photos. Upload at least one.')}
              </div>
            )}
          </section>

          {/* Amenities */}
          <section className="space-y-4">
            <h3 className="font-display text-lg text-primary">{tt('Servizi', 'Amenities')}</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const active = form.amenities.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`text-xs uppercase tracking-wider px-3 py-2 border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                    data-testid={`form-amenity-${a}`}
                  >
                    {a.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Seasons */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-primary">{tt('Stagioni', 'Seasons')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSeason} data-testid="form-add-season">
                <Plus className="w-4 h-4 mr-1" />{tt('Aggiungi', 'Add')}
              </Button>
            </div>
            {form.seasons.length === 0 && (
              <p className="text-sm text-muted-foreground">{tt('Nessuna stagione configurata', 'No seasons configured')}</p>
            )}
            {form.seasons.map((s, idx) => (
              <div key={s._key || `season-${s.start_date}-${idx}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-3 border border-border bg-muted/30">
                <Input value={s.name} onChange={(e) => updateSeason(idx, 'name', e.target.value)} placeholder={tt('Nome', 'Name')} />
                <Input type="date" value={s.start_date} onChange={(e) => updateSeason(idx, 'start_date', e.target.value)} />
                <Input type="date" value={s.end_date} onChange={(e) => updateSeason(idx, 'end_date', e.target.value)} />
                <Input type="number" step="0.01" value={s.price_multiplier} onChange={(e) => updateSeason(idx, 'price_multiplier', e.target.value)} placeholder="x1.5" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSeason(idx)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </section>

          {/* Extras */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-primary">{tt('Servizi Extra', 'Extras')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addExtra} data-testid="form-add-extra">
                <Plus className="w-4 h-4 mr-1" />{tt('Aggiungi', 'Add')}
              </Button>
            </div>
            {form.extras.length === 0 && (
              <p className="text-sm text-muted-foreground">{tt('Nessun extra configurato', 'No extras configured')}</p>
            )}
            {form.extras.map((e, idx) => (
              <div key={e.id || idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-3 border border-border bg-muted/30">
                <Input value={e.name_it} onChange={(ev) => updateExtra(idx, 'name_it', ev.target.value)} placeholder="Nome IT" />
                <Input value={e.name_en} onChange={(ev) => updateExtra(idx, 'name_en', ev.target.value)} placeholder="Name EN" />
                <Input type="number" min="0" value={e.price} onChange={(ev) => updateExtra(idx, 'price', ev.target.value)} placeholder="€" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!e.per_night} onChange={(ev) => updateExtra(idx, 'per_night', ev.target.checked)} className="accent-[hsl(var(--primary))]" />
                  {tt('A notte', 'Per night')}
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeExtra(idx)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tt('Annulla', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="btn-primary" data-testid="form-save-btn">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tt('Salvataggio\u2026', 'Saving\u2026')}</> : (isEdit ? tt('Aggiorna', 'Update') : tt('Crea', 'Create'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyFormDialog;
