import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import {
  LayoutDashboard, Building, Calendar, MessageSquare, Settings,
  Users, Euro, Clock, ArrowUpRight, Check, X, Edit, Trash2, Plus,
  RefreshCw, ExternalLink, Link2, FileText, Download, Copy, LogOut, Home
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { PropertyFormDialog } from '../components/PropertyFormDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const resolveImageUrl = (src) => {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${BACKEND_URL}${src}`;
  return src;
};

export const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const handleAdminLogout = () => {
    logout();
    navigate('/');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [syncs, setSyncs] = useState([]);
  const [loading, setLoading] = useState(true);

  // iCal sync form
  const [newSync, setNewSync] = useState({ property_id: '', platform: 'airbnb', ical_url: '' });
  // Booking docs viewer
  const [docsBookingId, setDocsBookingId] = useState(null);
  const [bookingDocs, setBookingDocs] = useState([]);
  // Property form dialog
  const [propertyFormOpen, setPropertyFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);

  const openNewProperty = () => { setEditingProperty(null); setPropertyFormOpen(true); };
  const openEditProperty = (p) => { setEditingProperty(p); setPropertyFormOpen(true); };
  const deleteProperty = async (p) => {
    if (!window.confirm(lang === 'it'
      ? `Eliminare definitivamente "${p.translations?.it?.title || p.slug}"?`
      : `Permanently delete "${p.translations?.en?.title || p.slug}"?`)) return;
    try {
      await axios.delete(`${API}/properties/${p.id}`);
      toast.success(lang === 'it' ? 'Proprietà eliminata' : 'Property deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  // Initial load + refetch when fetchData is reconstructed (activeTab change).
  // Keeping the original eslint-disable line to avoid duplicate effects below.

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await axios.get(`${API}/admin/dashboard`);
        setDashboardData(res.data);
      } else if (activeTab === 'properties') {
        const res = await axios.get(`${API}/properties?active_only=false`);
        setProperties(res.data);
      } else if (activeTab === 'bookings') {
        const res = await axios.get(`${API}/bookings`);
        setBookings(res.data);
      } else if (activeTab === 'contacts') {
        const res = await axios.get(`${API}/contacts`);
        setContacts(res.data);
      } else if (activeTab === 'sync') {
        const [syncRes, propRes] = await Promise.all([
          axios.get(`${API}/ical-syncs`),
          axios.get(`${API}/properties?active_only=false`)
        ]);
        setSyncs(syncRes.data);
        setProperties(propRes.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, t]);

  // Re-run when fetchData identity changes (i.e. when activeTab changes), but only if user is admin and auth is ready.
  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchData();
    }
  }, [authLoading, isAdmin, fetchData]);

  const createSync = async () => {
    if (!newSync.property_id || !newSync.ical_url) {
      toast.error(lang === 'it' ? 'Compila tutti i campi' : 'Fill all fields');
      return;
    }
    try {
      await axios.post(`${API}/ical-sync`, newSync);
      toast.success(lang === 'it' ? 'Sincronizzazione creata' : 'Sync created');
      setNewSync({ property_id: '', platform: 'airbnb', ical_url: '' });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  const runSync = async (syncId) => {
    try {
      const res = await axios.post(`${API}/ical-sync/${syncId}/run`);
      if (res.data.error) {
        toast.error(`${lang === 'it' ? 'Errore' : 'Error'}: ${res.data.error}`);
      } else {
        toast.success(`${res.data.events_imported} ${lang === 'it' ? 'eventi importati' : 'events imported'}`);
      }
      fetchData();
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const deleteSync = async (syncId) => {
    if (!window.confirm(lang === 'it' ? 'Eliminare questa sincronizzazione?' : 'Delete this sync?')) return;
    try {
      await axios.delete(`${API}/ical-sync/${syncId}`);
      toast.success(lang === 'it' ? 'Eliminata' : 'Deleted');
      fetchData();
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const copyExportUrl = (propertyId) => {
    const url = `${BACKEND_URL}/api/ical-export/${propertyId}.ics`;
    navigator.clipboard.writeText(url);
    toast.success(lang === 'it' ? 'URL copiato' : 'URL copied');
  };

  const openBookingDocs = async (bookingId) => {
    setDocsBookingId(bookingId);
    try {
      const res = await axios.get(`${API}/bookings/${bookingId}/documents`);
      setBookingDocs(res.data);
    } catch (e) {
      setBookingDocs([]);
    }
  };

  const downloadDoc = async (docId, filename) => {
    try {
      const res = await axios.get(`${API}/admin/documents/${docId}/download`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.patch(`${API}/bookings/${bookingId}/status?status=${status}`);
      toast.success(lang === 'it' ? 'Stato aggiornato' : 'Status updated');
      fetchData();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const tabs = [
    { id: 'dashboard', label: t('admin.dashboard'), icon: LayoutDashboard },
    { id: 'properties', label: t('admin.properties'), icon: Building },
    { id: 'bookings', label: t('admin.bookings'), icon: Calendar },
    { id: 'contacts', label: t('admin.contacts'), icon: MessageSquare },
    { id: 'sync', label: lang === 'it' ? 'Sync iCal' : 'iCal Sync', icon: Link2 },
  ];

  return (
    <div className="min-h-screen pt-20" data-testid="admin-dashboard">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-5rem)] bg-card border-r border-border/40 p-6 flex flex-col" data-testid="admin-sidebar">
          <div className="mb-6">
            <h2 className="text-xl font-display font-medium">Admin</h2>
            {user?.full_name && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{user.full_name}</p>
            )}
          </div>
          <nav className="space-y-2 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Footer actions: torna al sito + esci */}
          <div className="pt-6 mt-6 border-t border-border/40 space-y-2">
            <Link
              to="/"
              className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              data-testid="admin-back-to-site"
            >
              <Home className="w-5 h-5" />
              {lang === 'it' ? 'Torna al sito' : 'Back to site'}
            </Link>
            <button
              onClick={handleAdminLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 transition-colors"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-5 h-5" />
              {lang === 'it' ? 'Esci' : 'Log out'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && dashboardData && (
            <div className="space-y-8" data-testid="dashboard-content">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display font-medium">{t('admin.dashboard')}</h1>
                <Button onClick={fetchData} variant="ghost" size="icon">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass p-6" data-testid="stat-properties">
                  <div className="flex items-center justify-between mb-4">
                    <Building className="w-8 h-8 text-primary" />
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-display font-medium">{dashboardData.total_properties}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.totalProperties')}</p>
                </div>

                <div className="glass p-6" data-testid="stat-bookings">
                  <div className="flex items-center justify-between mb-4">
                    <Calendar className="w-8 h-8 text-primary" />
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-display font-medium">{dashboardData.total_bookings}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.totalBookings')}</p>
                </div>

                <div className="glass p-6" data-testid="stat-pending">
                  <div className="flex items-center justify-between mb-4">
                    <Clock className="w-8 h-8 text-yellow-500" />
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-display font-medium">{dashboardData.pending_bookings}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.pendingBookings')}</p>
                </div>

                <div className="glass p-6" data-testid="stat-revenue">
                  <div className="flex items-center justify-between mb-4">
                    <Euro className="w-8 h-8 text-green-500" />
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-display font-medium">€{dashboardData.month_revenue}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.monthRevenue')}</p>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6">
                  <h3 className="text-lg font-display font-medium mb-4">{t('admin.upcomingCheckins')}</h3>
                  {dashboardData.upcoming_checkins.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.upcoming_checkins.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-card border border-border/40">
                          <div>
                            <p className="font-medium">{booking.guest_name}</p>
                            <p className="text-sm text-muted-foreground">{booking.check_in}</p>
                          </div>
                          <Badge variant="outline">{booking.guests} {t('properties.guests')}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{lang === 'it' ? 'Nessun check-in imminente' : 'No upcoming check-ins'}</p>
                  )}
                </div>

                <div className="glass p-6">
                  <h3 className="text-lg font-display font-medium mb-4">{t('admin.upcomingCheckouts')}</h3>
                  {dashboardData.upcoming_checkouts.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.upcoming_checkouts.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-card border border-border/40">
                          <div>
                            <p className="font-medium">{booking.guest_name}</p>
                            <p className="text-sm text-muted-foreground">{booking.check_out}</p>
                          </div>
                          <Badge variant="outline">{booking.guests} {t('properties.guests')}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{lang === 'it' ? 'Nessun check-out imminente' : 'No upcoming check-outs'}</p>
                  )}
                </div>
              </div>

              {/* Recent Contacts */}
              {dashboardData.recent_contacts.length > 0 && (
                <div className="glass p-6">
                  <h3 className="text-lg font-display font-medium mb-4">
                    {lang === 'it' ? 'Messaggi Recenti' : 'Recent Messages'}
                  </h3>
                  <div className="space-y-3">
                    {dashboardData.recent_contacts.map((contact) => (
                      <div key={contact.id} className="p-3 bg-card border border-border/40">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{contact.name}</p>
                          <span className="text-xs text-muted-foreground">{contact.email}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{contact.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === 'properties' && (
            <div className="space-y-6" data-testid="properties-content">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display font-medium">{t('admin.properties')}</h1>
                <div className="flex items-center gap-2">
                  <Button onClick={openNewProperty} className="btn-primary" data-testid="new-property-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    {lang === 'it' ? 'Nuova Proprietà' : 'New Property'}
                  </Button>
                  <Button onClick={fetchData} variant="ghost" size="icon">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="surface-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'it' ? 'Proprietà' : 'Property'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Città' : 'City'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Prezzo' : 'Price'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Rating' : 'Rating'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Stato' : 'Status'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Azioni' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => {
                      const translation = property.translations[lang] || property.translations['it'];
                      return (
                        <TableRow key={property.id} data-testid={`property-row-${property.slug}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={resolveImageUrl(property.images[0])}
                                alt={translation.title}
                                className="w-12 h-12 object-cover"
                              />
                              <div>
                                <p className="font-medium">{translation.title}</p>
                                <p className="text-xs text-muted-foreground">{property.slug}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{property.location.city}</TableCell>
                          <TableCell>€{property.pricing.base_price}</TableCell>
                          <TableCell>
                            {property.average_rating > 0 ? (
                              <span>{property.average_rating} ({property.total_reviews})</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={property.is_active ? 'default' : 'secondary'}>
                              {property.is_active ? (lang === 'it' ? 'Attivo' : 'Active') : (lang === 'it' ? 'Inattivo' : 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Link to={`/property/${property.slug}`} target="_blank">
                                <Button variant="ghost" size="icon" title={lang === 'it' ? 'Apri sito' : 'Open site'}>
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditProperty(property)}
                                title={lang === 'it' ? 'Modifica' : 'Edit'}
                                data-testid={`edit-property-${property.slug}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteProperty(property)}
                                className="text-destructive hover:text-destructive/80"
                                title={lang === 'it' ? 'Elimina' : 'Delete'}
                                data-testid={`delete-property-${property.slug}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {properties.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    {lang === 'it' ? 'Nessuna proprietà. Creane una.' : 'No properties yet. Create one.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-6" data-testid="bookings-content">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display font-medium">{t('admin.bookings')}</h1>
                <Button onClick={fetchData} variant="ghost" size="icon">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="glass overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'it' ? 'Ospite' : 'Guest'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Date' : 'Dates'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Totale' : 'Total'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Stato' : 'Status'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Pagamento' : 'Payment'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Fonte' : 'Source'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Azioni' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.guest_name}</p>
                            <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{booking.check_in}</p>
                            <p className="text-muted-foreground">{booking.check_out}</p>
                          </div>
                        </TableCell>
                        <TableCell>€{booking.total_price}</TableCell>
                        <TableCell>
                          <Badge variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'pending' ? 'secondary' :
                            booking.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            booking.payment_status === 'paid' ? 'default' :
                            booking.payment_status === 'partial' ? 'secondary' : 'outline'
                          }>
                            {booking.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{booking.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openBookingDocs(booking.id)}
                              className="text-muted-foreground hover:text-primary"
                              title={lang === 'it' ? 'Documenti' : 'Documents'}
                              data-testid={`view-docs-${booking.id}`}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            {booking.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                  className="text-green-500 hover:text-green-400"
                                  data-testid={`confirm-booking-${booking.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                  className="text-destructive hover:text-destructive/80"
                                  data-testid={`cancel-booking-${booking.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                className="text-primary hover:text-primary/80"
                                data-testid={`complete-booking-${booking.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {bookings.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {lang === 'it' ? 'Nessuna prenotazione' : 'No bookings'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-6" data-testid="contacts-content">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display font-medium">{t('admin.contacts')}</h1>
                <Button onClick={fetchData} variant="ghost" size="icon">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="glass p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{contact.name}</h3>
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                        {contact.phone && (
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={contact.status === 'new' ? 'default' : 'secondary'}>
                          {contact.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(contact.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <p className="text-foreground/80">{contact.message}</p>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="glass p-8 text-center text-muted-foreground">
                    {lang === 'it' ? 'Nessun messaggio' : 'No messages'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* iCal Sync Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-6" data-testid="sync-content">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display font-medium">
                  {lang === 'it' ? 'Sincronizzazione iCal' : 'iCal Synchronization'}
                </h1>
                <Button onClick={fetchData} variant="ghost" size="icon">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground max-w-3xl">
                {lang === 'it'
                  ? 'Aggiungi qui i feed iCal di Airbnb e Booking. Vengono aggiornati automaticamente ogni 30 minuti. Usa l\u2019URL di esportazione per pubblicare le tue prenotazioni dirette su Airbnb/Booking.'
                  : 'Add Airbnb / Booking iCal feeds here. They are pulled automatically every 30 minutes. Use the export URL to publish your direct bookings to Airbnb / Booking.'}
              </p>

              {/* Export URLs per property */}
              <div className="glass p-6">
                <h3 className="text-lg font-display font-medium mb-4">
                  {lang === 'it' ? 'URL di Esportazione (per Airbnb / Booking)' : 'Export URL (for Airbnb / Booking)'}
                </h3>
                <div className="space-y-2">
                  {properties.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-border/40 last:border-0">
                      <span className="font-medium truncate">
                        {p.translations?.[lang]?.title || p.translations?.it?.title || p.slug}
                      </span>
                      <code className="text-xs text-muted-foreground bg-background/40 px-2 py-1 truncate flex-1 max-w-md">
                        /api/ical-export/{p.id}.ics
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyExportUrl(p.id)}
                        data-testid={`copy-export-${p.id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add new sync */}
              <div className="glass p-6 space-y-4" data-testid="add-sync-form">
                <h3 className="text-lg font-display font-medium">
                  {lang === 'it' ? 'Aggiungi Feed iCal' : 'Add iCal Feed'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={newSync.property_id}
                    onChange={(e) => setNewSync({ ...newSync, property_id: e.target.value })}
                    className="bg-transparent border border-border/60 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    data-testid="sync-property-select"
                  >
                    <option value="" className="bg-card">
                      {lang === 'it' ? 'Seleziona proprietà' : 'Select property'}
                    </option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id} className="bg-card">
                        {p.translations?.[lang]?.title || p.translations?.it?.title || p.slug}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newSync.platform}
                    onChange={(e) => setNewSync({ ...newSync, platform: e.target.value })}
                    className="bg-transparent border border-border/60 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    data-testid="sync-platform-select"
                  >
                    <option value="airbnb" className="bg-card">Airbnb</option>
                    <option value="booking" className="bg-card">Booking.com</option>
                    <option value="vrbo" className="bg-card">Vrbo</option>
                    <option value="other" className="bg-card">{lang === 'it' ? 'Altro' : 'Other'}</option>
                  </select>
                  <Input
                    value={newSync.ical_url}
                    onChange={(e) => setNewSync({ ...newSync, ical_url: e.target.value })}
                    placeholder="https://..../calendar.ics"
                    className="md:col-span-2 bg-transparent border-border/60"
                    data-testid="sync-url-input"
                  />
                </div>
                <Button onClick={createSync} className="btn-primary" data-testid="add-sync-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  {lang === 'it' ? 'Aggiungi' : 'Add'}
                </Button>
              </div>

              {/* Existing syncs table */}
              <div className="glass overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'it' ? 'Proprietà' : 'Property'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Piattaforma' : 'Platform'}</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>{lang === 'it' ? 'Ultima Sync' : 'Last Sync'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Stato' : 'Status'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Azioni' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncs.map((s) => {
                      const prop = properties.find((p) => p.id === s.property_id);
                      const propTitle = prop?.translations?.[lang]?.title || prop?.translations?.it?.title || s.property_id;
                      return (
                        <TableRow key={s.id} data-testid={`sync-row-${s.id}`}>
                          <TableCell className="font-medium">{propTitle}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{s.platform}</Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground truncate block max-w-xs">
                              {s.ical_url}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.last_synced ? format(new Date(s.last_synced), 'dd/MM/yy HH:mm') : '—'}
                          </TableCell>
                          <TableCell>
                            {s.last_error ? (
                              <Badge variant="destructive" title={s.last_error}>
                                {lang === 'it' ? 'Errore' : 'Error'}
                              </Badge>
                            ) : s.last_synced ? (
                              <Badge>
                                {(s.last_event_count ?? 0)} {lang === 'it' ? 'eventi' : 'events'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {lang === 'it' ? 'In attesa' : 'Pending'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => runSync(s.id)}
                                title={lang === 'it' ? 'Sincronizza ora' : 'Sync now'}
                                data-testid={`run-sync-${s.id}`}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSync(s.id)}
                                className="text-destructive hover:text-destructive/80"
                                data-testid={`delete-sync-${s.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {syncs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {lang === 'it' ? 'Nessun feed iCal configurato' : 'No iCal feeds configured'}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Booking Documents Dialog */}
        <Dialog open={!!docsBookingId} onOpenChange={(open) => !open && setDocsBookingId(null)}>
          <DialogContent className="bg-card border-border/60 max-w-lg" data-testid="booking-docs-dialog">
            <DialogHeader>
              <DialogTitle className="font-display">
                {lang === 'it' ? 'Documenti Ospite' : 'Guest Documents'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {bookingDocs.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {lang === 'it' ? 'Nessun documento caricato' : 'No documents uploaded'}
                </p>
              )}
              {bookingDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 border border-border/60">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.document_type} · {(d.size / 1024).toFixed(0)} KB · {format(new Date(d.uploaded_at), 'dd/MM/yy HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadDoc(d.id, d.original_filename)}
                    data-testid={`download-doc-${d.id}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Property Create / Edit Form Dialog */}
        <PropertyFormDialog
          open={propertyFormOpen}
          onOpenChange={setPropertyFormOpen}
          property={editingProperty}
          onSaved={fetchData}
        />
      </div>
    </div>
  );
};
