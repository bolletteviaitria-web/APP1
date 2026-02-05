import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Search, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PropertyCard } from './HomePage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PropertiesPage = () => {
  const { t, i18n } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: '',
    min_guests: '',
    max_price: ''
  });
  const lang = i18n.language;

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async (searchFilters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchFilters.city) params.append('city', searchFilters.city);
      if (searchFilters.min_guests) params.append('min_guests', searchFilters.min_guests);
      if (searchFilters.max_price) params.append('max_price', searchFilters.max_price);
      
      const response = await axios.get(`${API}/properties?${params.toString()}`);
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProperties(filters);
  };

  const clearFilters = () => {
    setFilters({ city: '', min_guests: '', max_price: '' });
    fetchProperties();
  };

  const hasFilters = filters.city || filters.min_guests || filters.max_price;

  return (
    <div className="min-h-screen pt-20" data-testid="properties-page">
      {/* Header */}
      <section className="bg-card py-16 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="overline mb-4 block">{t('hero.overline')}</span>
            <h1 className="text-4xl sm:text-5xl font-display font-medium mb-4">
              {t('properties.title')}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('properties.subtitle')}
            </p>
          </div>

          {/* Filters */}
          <form onSubmit={handleSearch} className="glass p-6" data-testid="filters-form">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  {t('properties.filter.city')}
                </label>
                <Input
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  placeholder="Porto Cervo, Amalfi..."
                  className="input-luxury border rounded-none bg-transparent"
                  data-testid="filter-city"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  {t('properties.filter.guests')}
                </label>
                <Input
                  type="number"
                  value={filters.min_guests}
                  onChange={(e) => setFilters({ ...filters, min_guests: e.target.value })}
                  placeholder="2"
                  min="1"
                  className="input-luxury border rounded-none bg-transparent"
                  data-testid="filter-guests"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  {t('properties.filter.maxPrice')} (€)
                </label>
                <Input
                  type="number"
                  value={filters.max_price}
                  onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                  placeholder="500"
                  min="0"
                  className="input-luxury border rounded-none bg-transparent"
                  data-testid="filter-price"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" className="btn-primary flex-1" data-testid="search-btn">
                  <Search className="w-4 h-4 mr-2" />
                  {t('properties.filter.search')}
                </Button>
                {hasFilters && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={clearFilters}
                    className="px-3"
                    data-testid="clear-filters-btn"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card animate-pulse h-96" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20" data-testid="no-properties">
              <p className="text-muted-foreground text-lg">
                {lang === 'it' 
                  ? 'Nessuna proprietà trovata con i filtri selezionati.' 
                  : 'No properties found with selected filters.'}
              </p>
              {hasFilters && (
                <Button onClick={clearFilters} variant="ghost" className="mt-4">
                  {lang === 'it' ? 'Rimuovi filtri' : 'Clear filters'}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-testid="properties-grid">
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
        </div>
      </section>
    </div>
  );
};
