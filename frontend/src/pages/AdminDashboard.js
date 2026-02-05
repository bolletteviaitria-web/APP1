import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import {
  LayoutDashboard, Building, Calendar, MessageSquare, Settings,
  Users, Euro, Clock, ArrowUpRight, Check, X, Edit, Trash2, Plus,
  RefreshCw, ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchData();
    }
  }, [authLoading, isAdmin, activeTab]);

  const fetchData = async () => {
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
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
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
  ];

  return (
    <div className="min-h-screen pt-20" data-testid="admin-dashboard">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-5rem)] bg-card border-r border-white/5 p-6" data-testid="admin-sidebar">
          <h2 className="text-xl font-display font-medium mb-6">Admin</h2>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
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
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-card border border-white/5">
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
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-card border border-white/5">
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
                      <div key={contact.id} className="p-3 bg-card border border-white/5">
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
                <Button onClick={fetchData} variant="ghost" size="icon">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="glass overflow-hidden">
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
                        <TableRow key={property.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={property.images[0]}
                                alt={translation.title}
                                className="w-12 h-12 object-cover"
                              />
                              <span className="font-medium">{translation.title}</span>
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
                            <div className="flex items-center gap-2">
                              <Link to={`/property/${property.slug}`} target="_blank">
                                <Button variant="ghost" size="icon">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
        </main>
      </div>
    </div>
  );
};
