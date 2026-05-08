import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { PaymentLinkPanel } from '../components/PaymentLinkPanel';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard, Building, Calendar, MessageSquare, Settings,
  Users, Euro, Clock, ArrowUpRight, Check, X, Edit, Trash2, Plus,
  RefreshCw, ExternalLink, Link2, FileText, Download, Copy, LogOut, Home, Bot, Search, Mail
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

  const downloadBackup = async () => {
    try {
      const res = await axios.get(`${API}/admin/backup`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `terracito-backup-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const counts = res.data?.counts || {};
      const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
      toast.success(t('common.error') === 'common.error'
        ? `Backup scaricato (${total} record)`
        : `Backup downloaded (${total} records)`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Backup failed');
    }
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
  // Chat conversations
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadPropertyFilter, setLeadPropertyFilter] = useState('all');
  const [editingLead, setEditingLead] = useState(null);
  const [leadDocsOpen, setLeadDocsOpen] = useState(null); // holds lead obj
  const [leadDocs, setLeadDocs] = useState([]);
  const [leadDocsSearch, setLeadDocsSearch] = useState('');
  const [aiRules, setAiRules] = useState('');
  const [aiRulesLoaded, setAiRulesLoaded] = useState(false);
  const [savingAiRules, setSavingAiRules] = useState(false);
  const [siteSettings, setSiteSettings] = useState({
    accept_stripe: true, accept_cash: false, accept_bank_transfer: false,
    iban: '', iban_holder: '', iban_bank: '', iban_notes: '',
    confirmation_email_enabled: true,
    confirmation_email_subject: '',
    confirmation_email_body: '',
    confirmation_email_contact_phone: '',
    confirmation_email_contact_email: '',
    confirmation_email_contact_address: '',
  });
  const [siteSettingsLoaded, setSiteSettingsLoaded] = useState(false);
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    return leads.filter((l) => {
      if (leadStatusFilter !== 'all' && (l.status || 'new') !== leadStatusFilter) return false;
      if (leadPropertyFilter !== 'all' && (l.property_slug || '') !== leadPropertyFilter) return false;
      if (!q) return true;
      return [l.guest_name, l.phone, l.email, l.origin_city, l.reason, l.dates, l.property_title, l.note]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [leads, leadSearch, leadStatusFilter, leadPropertyFilter]);

  const leadPropertyOptions = useMemo(() => {
    const seen = new Map();
    leads.forEach((l) => {
      if (l.property_slug && !seen.has(l.property_slug)) {
        seen.set(l.property_slug, l.property_title || l.property_slug);
      }
    });
    return Array.from(seen.entries()); // [[slug, title], ...]
  }, [leads]);

  const openConversation = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/admin/chat/conversations/${sessionId}`);
      setActiveConversation(res.data);
      setActiveTab('chat');
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const deleteConversation = async (sessionId) => {
    if (!window.confirm(lang === 'it'
      ? 'Eliminare questa conversazione? L\u2019azione \u00e8 irreversibile. Il lead associato verr\u00e0 rimosso ma i documenti caricati restano.'
      : 'Delete this conversation? Associated lead will be removed; uploaded documents stay.')) return;
    try {
      await axios.delete(`${API}/admin/chat/conversations/${sessionId}`);
      setConversations((prev) => prev.filter((c) => c.session_id !== sessionId));
      if (activeConversation?.session_id === sessionId) setActiveConversation(null);
      toast.success(lang === 'it' ? 'Conversazione eliminata' : 'Conversation deleted');
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  const deleteAllConversations = async () => {
    if (!window.confirm(lang === 'it'
      ? 'Eliminare TUTTE le conversazioni e i lead? Questa azione non pu\u00f2 essere annullata.'
      : 'Delete ALL conversations and leads? This cannot be undone.')) return;
    try {
      const res = await axios.delete(`${API}/admin/chat/conversations`);
      setConversations([]);
      setLeads([]);
      setActiveConversation(null);
      toast.success(lang === 'it'
        ? `Eliminate ${res.data?.deleted_conversations || 0} conversazioni`
        : `Deleted ${res.data?.deleted_conversations || 0} conversations`);
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  const updateLeadStatus = async (sessionId, status) => {
    try {
      await axios.patch(`${API}/admin/chat/leads/${sessionId}`, { status });
      setLeads((prev) => prev.map((l) => (l.session_id === sessionId ? { ...l, status } : l)));
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  const deleteLead = async (sessionId) => {
    if (!window.confirm(lang === 'it' ? 'Eliminare questo lead?' : 'Delete this lead?')) return;
    try {
      await axios.delete(`${API}/admin/chat/leads/${sessionId}`);
      setLeads((prev) => prev.filter((l) => l.session_id !== sessionId));
      toast.success(lang === 'it' ? 'Lead eliminato' : 'Lead deleted');
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  const openLeadDocs = async (lead) => {
    setLeadDocsOpen(lead);
    setLeadDocs([]);
    setLeadDocsSearch('');
    try {
      const res = await axios.get(`${API}/admin/chat/documents/${lead.session_id}`);
      setLeadDocs(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  const downloadLeadDoc = async (sessionId, doc) => {
    try {
      const res = await axios.get(`${API}/admin/chat/documents/${sessionId}/${doc.id}/download`, { responseType: 'blob' });
      const cd = res.headers['content-disposition'] || '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : (doc.filename || 'documento');
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

  const filteredLeadDocs = leadDocs.filter((d) => {
    const q = leadDocsSearch.trim().toLowerCase();
    if (!q) return true;
    return [d.filename, d.content_type, d.uploaded_at].some((v) => v && String(v).toLowerCase().includes(q));
  });


  const exportLeadsCsv = () => {
    if (leads.length === 0) {
      toast.error(lang === 'it' ? 'Nessun lead da esportare' : 'No leads to export');
      return;
    }
    const cols = ['guest_name', 'phone', 'email', 'origin_city', 'reason', 'dates', 'guests_count',
                  'property_title', 'property_slug', 'status', 'language', 'created_at', 'last_update', 'session_id'];
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const rows = [cols.join(',')];
    for (const l of filteredLeads) rows.push(cols.map((c) => escape(l[c])).join(','));
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    a.href = url;
    a.download = `terracito-leads-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(lang === 'it' ? `Esportati ${filteredLeads.length} lead` : `Exported ${filteredLeads.length} leads`);
  };

  const exportLeadsXlsx = () => {
    if (filteredLeads.length === 0) {
      toast.error(lang === 'it' ? 'Nessun lead da esportare' : 'No leads to export');
      return;
    }
    const data = filteredLeads.map((l) => ({
      Nome: l.guest_name || '',
      Telefono: l.phone || '',
      Email: l.email || '',
      Città: l.origin_city || '',
      Motivo: l.reason || '',
      Date: l.dates || '',
      Ospiti: l.guests_count || '',
      Casa: l.property_title || l.property_slug || '',
      Stato: l.status || '',
      Lingua: l.language || '',
      Note: l.note || '',
      'Creato il': l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm') : '',
      'Ultimo aggiornamento': l.last_update ? format(new Date(l.last_update), 'dd/MM/yyyy HH:mm') : '',
      'Session ID': l.session_id || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = Object.keys(data[0]).map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    XLSX.writeFile(wb, `terracito-leads-${ts}.xlsx`);
    toast.success(lang === 'it' ? `Esportati ${filteredLeads.length} lead (xlsx)` : `Exported ${filteredLeads.length} leads (xlsx)`);
  };

  const saveLeadEdit = async () => {
    if (!editingLead) return;
    try {
      const payload = {
        guest_name: editingLead.guest_name || '',
        phone: editingLead.phone || '',
        email: editingLead.email || '',
        origin_city: editingLead.origin_city || '',
        reason: editingLead.reason || '',
        dates: editingLead.dates || '',
        guests_count: editingLead.guests_count ? Number(editingLead.guests_count) : null,
        status: editingLead.status || 'new',
        note: editingLead.note || ''
      };
      await axios.patch(`${API}/admin/chat/leads/${editingLead.session_id}`, payload);
      setLeads((prev) => prev.map((l) => (l.session_id === editingLead.session_id ? { ...l, ...payload } : l)));
      setEditingLead(null);
      toast.success(lang === 'it' ? 'Lead aggiornato' : 'Lead updated');
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'));
    }
  };

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
      } else if (activeTab === 'chat') {
        const res = await axios.get(`${API}/admin/chat/conversations?limit=100`);
        setConversations(res.data);
      } else if (activeTab === 'leads') {
        const res = await axios.get(`${API}/admin/chat/leads?limit=500`);
        setLeads(res.data);
      } else if (activeTab === 'ai-settings') {
        const res = await axios.get(`${API}/admin/ai-settings`);
        setAiRules(res.data.custom_rules || '');
        setAiRulesLoaded(true);
      } else if (activeTab === 'payments') {
        const res = await axios.get(`${API}/admin/site-settings`);
        setSiteSettings({ ...siteSettings, ...res.data });
        setSiteSettingsLoaded(true);
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
    { id: 'chat', label: lang === 'it' ? 'Chat AI' : 'AI Chat', icon: Bot },
    { id: 'leads', label: lang === 'it' ? 'Lead Chat' : 'Chat Leads', icon: Users },
    { id: 'ai-settings', label: lang === 'it' ? 'Assistente AI' : 'AI Assistant', icon: Settings },
    { id: 'payments', label: lang === 'it' ? 'Pagamenti' : 'Payments', icon: Euro },
    { id: 'email', label: lang === 'it' ? 'Email Conferma' : 'Confirmation Email', icon: Mail },
    { id: 'paylink', label: lang === 'it' ? 'Link Pagamento' : 'Payment Link', icon: ExternalLink },
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

          {/* Footer actions: torna al sito + backup + esci */}
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
              onClick={downloadBackup}
              className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              data-testid="admin-backup-btn"
              title={lang === 'it' ? 'Scarica un backup JSON di tutti i dati' : 'Download a JSON backup of all data'}
            >
              <Download className="w-5 h-5" />
              {lang === 'it' ? 'Esporta backup' : 'Export backup'}
            </button>
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
                              {(() => {
                                if (property.is_active) return lang === 'it' ? 'Attivo' : 'Active';
                                return lang === 'it' ? 'Inattivo' : 'Inactive';
                              })()}
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

          {/* Chat AI Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-6" data-testid="chat-tab-content">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-display font-medium">
                    {lang === 'it' ? 'Conversazioni Chat AI' : 'AI Chat Conversations'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lang === 'it'
                      ? 'Tutte le conversazioni che gli ospiti hanno avuto con l\u2019assistente virtuale del sito.'
                      : 'All conversations guests have had with the website\u2019s virtual assistant.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={fetchData} variant="ghost" size="icon">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  {conversations.length > 0 && (
                    <Button
                      onClick={deleteAllConversations}
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      data-testid="delete-all-conversations-btn"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      {lang === 'it' ? 'Elimina tutte' : 'Delete all'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* List */}
                <div className="lg:col-span-1 surface-card overflow-hidden">
                  <div className="p-3 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? `Sessioni (${conversations.length})` : `Sessions (${conversations.length})`}
                  </div>
                  <ul className="divide-y divide-border/40 max-h-[70vh] overflow-y-auto">
                    {conversations.map((c) => {
                      const last = (c.messages && c.messages[0]) || {};
                      const isActive = activeConversation?.session_id === c.session_id;
                      return (
                        <li key={c.session_id} className="relative group">
                          <button
                            onClick={() => openConversation(c.session_id)}
                            className={`w-full text-left p-3 pr-10 hover:bg-muted/60 transition-colors ${isActive ? 'bg-muted' : ''}`}
                            data-testid={`chat-session-${c.session_id}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground truncate">
                                {c.session_id.slice(0, 8)}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {c.last_active_at ? format(new Date(c.last_active_at), 'dd/MM HH:mm') : ''}
                              </span>
                            </div>
                            <p className="text-xs text-foreground line-clamp-2 mb-1">
                              {last.content || (lang === 'it' ? '(vuota)' : '(empty)')}
                            </p>
                            <div className="flex items-center gap-2 text-[10px]">
                              <Badge variant="outline" className="text-[10px]">
                                {c.message_count} {lang === 'it' ? 'msg' : 'msg'}
                              </Badge>
                              {c.last_property_slug && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {c.last_property_slug}
                                </Badge>
                              )}
                              {c.sensitive_unlocked && (
                                <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                                  {lang === 'it' ? 'verificato' : 'verified'}
                                </Badge>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteConversation(c.session_id); }}
                            title={lang === 'it' ? 'Elimina conversazione' : 'Delete conversation'}
                            aria-label={lang === 'it' ? 'Elimina conversazione' : 'Delete conversation'}
                            className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            data-testid={`delete-conversation-${c.session_id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {conversations.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      {lang === 'it' ? 'Nessuna conversazione ancora' : 'No conversations yet'}
                    </div>
                  )}
                </div>

                {/* Transcript */}
                <div className="lg:col-span-2 surface-card p-5 max-h-[70vh] overflow-y-auto">
                  {!activeConversation ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-16">
                      <div className="text-center">
                        <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        {lang === 'it' ? 'Seleziona una conversazione per leggerla' : 'Select a conversation to read it'}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground">{activeConversation.session_id}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeConversation.started_at && format(new Date(activeConversation.started_at), 'dd/MM/yyyy HH:mm')}
                            {activeConversation.last_property_slug && ` · ${activeConversation.last_property_slug}`}
                            {activeConversation.last_language && ` · ${activeConversation.last_language.toUpperCase()}`}
                          </p>
                        </div>
                        <Button
                          onClick={() => deleteConversation(activeConversation.session_id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          data-testid="delete-active-conversation-btn"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          {lang === 'it' ? 'Elimina' : 'Delete'}
                        </Button>
                      </div>
                      {(activeConversation.messages || []).map((m, idx) => (
                        <div key={m.ts ? `${m.ts}-${m.role}` : `msg-${idx}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap ${
                            m.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}>
                            <p>{m.content}</p>
                            <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'opacity-80' : 'text-muted-foreground'}`}>
                              {m.ts && format(new Date(m.ts), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat Leads Tab */}
          {activeTab === 'leads' && (
            <div className="space-y-6" data-testid="leads-tab-content">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-3xl font-display font-medium">
                    {lang === 'it' ? 'Lead dalla Chat' : 'Chat Leads'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lang === 'it'
                      ? 'Contatti raccolti automaticamente dall\u2019assistente virtuale. Usali per follow-up o campagne promozionali.'
                      : 'Contacts automatically collected by the virtual assistant. Use them for follow-ups or promotions.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={exportLeadsCsv} data-testid="export-leads-csv">
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={exportLeadsXlsx} data-testid="export-leads-xlsx">
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button onClick={fetchData} variant="ghost" size="icon">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Search + filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder={lang === 'it' ? 'Cerca nome, email, telefono, città\u2026' : 'Search name, email, phone, city\u2026'}
                    className="pl-9"
                    data-testid="lead-search-input"
                  />
                </div>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="bg-card border border-border/60 px-3 py-2 text-sm"
                  data-testid="lead-status-filter"
                >
                  <option value="all">{lang === 'it' ? 'Tutti gli stati' : 'All statuses'}</option>
                  <option value="new">{lang === 'it' ? 'Nuovo' : 'New'}</option>
                  <option value="contacted">{lang === 'it' ? 'Contattato' : 'Contacted'}</option>
                  <option value="converted">{lang === 'it' ? 'Convertito' : 'Converted'}</option>
                  <option value="lost">{lang === 'it' ? 'Perso' : 'Lost'}</option>
                </select>
                <select
                  value={leadPropertyFilter}
                  onChange={(e) => setLeadPropertyFilter(e.target.value)}
                  className="bg-card border border-border/60 px-3 py-2 text-sm"
                  data-testid="lead-property-filter"
                >
                  <option value="all">{lang === 'it' ? 'Tutte le case' : 'All houses'}</option>
                  {leadPropertyOptions.map(([slug, title]) => (
                    <option key={slug} value={slug}>{title}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  {filteredLeads.length} / {leads.length}
                </span>
              </div>

              <div className="surface-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'it' ? 'Nome' : 'Name'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Telefono' : 'Phone'}</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>{lang === 'it' ? 'Città' : 'City'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Motivo' : 'Reason'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Date' : 'Dates'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Casa' : 'House'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Doc' : 'Docs'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Stato' : 'Status'}</TableHead>
                      <TableHead>{lang === 'it' ? 'Ultimo contatto' : 'Last update'}</TableHead>
                      <TableHead className="text-right">{lang === 'it' ? 'Azioni' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-10">
                          {lang === 'it'
                            ? 'Nessun lead trovato con i filtri attuali.'
                            : 'No leads match the current filters.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredLeads.map((l) => (
                      <TableRow key={l.session_id} data-testid={`lead-row-${l.session_id}`}>
                        <TableCell className="font-medium">{l.guest_name || '—'}</TableCell>
                        <TableCell>
                          {l.phone
                            ? <a href={`tel:${l.phone}`} className="text-primary hover:underline">{l.phone}</a>
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {l.email
                            ? <a href={`mailto:${l.email}`} className="text-primary hover:underline">{l.email}</a>
                            : '—'}
                        </TableCell>
                        <TableCell>{l.origin_city || '—'}</TableCell>
                        <TableCell className="text-xs">{l.reason || '—'}</TableCell>
                        <TableCell className="text-xs">{l.dates || '—'}</TableCell>
                        <TableCell>
                          {l.property_slug
                            ? <Badge variant="secondary" className="text-[10px]">{l.property_title || l.property_slug}</Badge>
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {l.has_documents ? (
                            <button
                              type="button"
                              onClick={() => openLeadDocs(l)}
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                              data-testid={`lead-docs-btn-${l.session_id}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {l.documents_count || 1}
                            </button>
                          ) : <span className="text-xs text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell>
                          <select
                            value={l.status || 'new'}
                            onChange={(e) => updateLeadStatus(l.session_id, e.target.value)}
                            className="bg-card border border-border/60 px-2 py-1 text-xs"
                            data-testid={`lead-status-${l.session_id}`}
                          >
                            <option value="new">{lang === 'it' ? 'Nuovo' : 'New'}</option>
                            <option value="contacted">{lang === 'it' ? 'Contattato' : 'Contacted'}</option>
                            <option value="converted">{lang === 'it' ? 'Convertito' : 'Converted'}</option>
                            <option value="lost">{lang === 'it' ? 'Perso' : 'Lost'}</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {l.last_update ? format(new Date(l.last_update), 'dd/MM HH:mm') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingLead({ ...l })}
                              title={lang === 'it' ? 'Modifica' : 'Edit'}
                              data-testid={`lead-edit-${l.session_id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openConversation(l.session_id)}
                              title={lang === 'it' ? 'Vedi conversazione' : 'View chat'}
                              data-testid={`lead-view-chat-${l.session_id}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteLead(l.session_id)}
                              title={lang === 'it' ? 'Elimina' : 'Delete'}
                              data-testid={`lead-delete-${l.session_id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* AI Assistant Settings Tab */}
          {activeTab === 'ai-settings' && (
            <div className="space-y-6 max-w-4xl" data-testid="ai-settings-tab">
              <div>
                <h1 className="text-3xl font-display font-medium">
                  {lang === 'it' ? 'Addestramento Assistente AI' : 'AI Assistant Training'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {lang === 'it'
                    ? 'Qui definisci le regole che l\u2019assistente virtuale deve seguire quando risponde agli ospiti. Scrivi in italiano, una regola per riga, in modo chiaro. Le modifiche sono attive entro 30 secondi (le sessioni chat in corso si aggiornano al prossimo messaggio).'
                    : 'Define the rules the virtual assistant must follow when replying to guests. Write them in plain language, one per line. Changes take effect within 30 seconds (ongoing sessions update on the next message).'}
                </p>
              </div>

              <div className="surface-card p-5 space-y-3">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {lang === 'it' ? 'Regole per l\u2019assistente' : 'Rules for the assistant'}
                </label>
                <textarea
                  value={aiRules}
                  onChange={(e) => setAiRules(e.target.value)}
                  disabled={!aiRulesLoaded}
                  rows={18}
                  className="w-full bg-card border border-border/60 p-4 text-sm font-mono leading-relaxed resize-vertical"
                  placeholder={lang === 'it'
                    ? '- Prima di dire libero o prenotato, controlla sempre il calendario...\n- Non fare domande inutili...\n- ...'
                    : '- Before saying available or booked, always check the calendar...'}
                  data-testid="ai-rules-textarea"
                />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-muted-foreground">
                    {lang === 'it'
                      ? 'Suggerimento: parti da frasi brevi e concrete. Evita regole contraddittorie.'
                      : 'Tip: keep rules short and concrete. Avoid contradictions.'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!window.confirm(lang === 'it'
                          ? 'Ripristinare le regole di default? Perderai le modifiche attuali.'
                          : 'Restore default rules? Current edits will be lost.')) return;
                        try {
                          await axios.put(`${API}/admin/ai-settings`, { custom_rules: '' });
                          const res = await axios.get(`${API}/admin/ai-settings`);
                          setAiRules(res.data.custom_rules || '');
                          toast.success(lang === 'it' ? 'Regole ripristinate' : 'Rules restored');
                        } catch (e) {
                          toast.error(e.response?.data?.detail || t('common.error'));
                        }
                      }}
                      data-testid="ai-rules-reset"
                    >
                      {lang === 'it' ? 'Ripristina default' : 'Restore defaults'}
                    </Button>
                    <Button
                      onClick={async () => {
                        setSavingAiRules(true);
                        try {
                          await axios.put(`${API}/admin/ai-settings`, { custom_rules: aiRules });
                          toast.success(lang === 'it' ? 'Regole salvate' : 'Rules saved');
                        } catch (e) {
                          toast.error(e.response?.data?.detail || t('common.error'));
                        } finally {
                          setSavingAiRules(false);
                        }
                      }}
                      disabled={savingAiRules || !aiRulesLoaded}
                      data-testid="ai-rules-save"
                    >
                      {savingAiRules
                        ? (lang === 'it' ? 'Salvataggio\u2026' : 'Saving\u2026')
                        : (lang === 'it' ? 'Salva regole' : 'Save rules')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4 py-2">
                {lang === 'it'
                  ? 'Ricorda: queste regole vanno SOPRA le regole base del sistema (tono WhatsApp, dati verificati, brevità). Le cose che NON puoi cambiare da qui sono: il nome del sito, il numero host, la struttura dei prezzi (quelli si modificano dalla scheda proprietà).'
                  : 'Note: these rules stack ON TOP of the built-in ones (WhatsApp tone, verified data, brevity). Things you CANNOT change here: site name, host number, price structure (edit those from the property form).'}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6 max-w-3xl" data-testid="payments-tab">
              <div>
                <h1 className="text-3xl font-display font-medium">
                  {lang === 'it' ? 'Metodi di pagamento' : 'Payment methods'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {lang === 'it'
                    ? 'Abilita i metodi di pagamento che accetti e inserisci i dati bancari (IBAN) per ricevere bonifici.'
                    : 'Enable the payment methods you accept and fill your IBAN details to receive transfers.'}
                </p>
              </div>

              <div className="surface-card p-5 space-y-4">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  {lang === 'it' ? 'Metodi abilitati' : 'Enabled methods'}
                </h2>

                {[
                  { key: 'accept_stripe', label: lang === 'it' ? 'Carta di credito (Stripe)' : 'Credit card (Stripe)' },
                  { key: 'accept_bank_transfer', label: lang === 'it' ? 'Bonifico bancario (IBAN)' : 'Bank transfer (IBAN)' },
                  { key: 'accept_cash', label: lang === 'it' ? 'Contanti al check-in' : 'Cash at check-in' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-b-0">
                    <span className="text-sm">{label}</span>
                    <input
                      type="checkbox"
                      checked={!!siteSettings[key]}
                      onChange={(e) => setSiteSettings({ ...siteSettings, [key]: e.target.checked })}
                      className="w-5 h-5 cursor-pointer"
                      data-testid={`toggle-${key}`}
                    />
                  </label>
                ))}
              </div>

              <div className="surface-card p-5 space-y-4">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  {lang === 'it' ? 'Dati bancari (IBAN)' : 'Bank details (IBAN)'}
                </h2>
                <p className="text-xs text-muted-foreground -mt-2">
                  {lang === 'it'
                    ? 'Mostrati all\u2019ospite nella pagina di conferma solo se il bonifico è abilitato.'
                    : 'Shown to the guest on the confirmation page only when bank transfer is enabled.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">IBAN</label>
                    <Input
                      value={siteSettings.iban || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, iban: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                      placeholder="IT60X0542811101000000123456"
                      className="font-mono tracking-wider"
                      data-testid="iban-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {lang === 'it' ? 'Intestatario' : 'Account holder'}
                    </label>
                    <Input
                      value={siteSettings.iban_holder || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, iban_holder: e.target.value })}
                      data-testid="iban-holder-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {lang === 'it' ? 'Banca' : 'Bank'}
                    </label>
                    <Input
                      value={siteSettings.iban_bank || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, iban_bank: e.target.value })}
                      data-testid="iban-bank-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {lang === 'it' ? 'Note per l\u2019ospite (opzionale)' : 'Notes for the guest (optional)'}
                    </label>
                    <textarea
                      rows={2}
                      value={siteSettings.iban_notes || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, iban_notes: e.target.value })}
                      className="w-full bg-card border border-border/60 px-3 py-2 text-sm resize-none"
                      placeholder={lang === 'it' ? 'Es. Indicare la causale "PREN-xxxx" nel bonifico' : 'E.g. Include reference "PREN-xxxx"'}
                      data-testid="iban-notes-input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    setSavingSiteSettings(true);
                    try {
                      const res = await axios.put(`${API}/admin/site-settings`, siteSettings);
                      setSiteSettings({ ...siteSettings, ...res.data });
                      toast.success(lang === 'it' ? 'Impostazioni salvate' : 'Settings saved');
                    } catch (e) {
                      toast.error(e.response?.data?.detail || t('common.error'));
                    } finally {
                      setSavingSiteSettings(false);
                    }
                  }}
                  disabled={!siteSettingsLoaded || savingSiteSettings}
                  data-testid="save-payments-settings"
                >
                  {savingSiteSettings
                    ? (lang === 'it' ? 'Salvataggio\u2026' : 'Saving\u2026')
                    : (lang === 'it' ? 'Salva impostazioni' : 'Save settings')}
                </Button>
              </div>
            </div>
          )}

          {/* Email Confirmation Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6" data-testid="email-tab-content">
              <div>
                <h1 className="text-3xl font-display font-medium">
                  {lang === 'it' ? 'Email di conferma prenotazione' : 'Booking confirmation email'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {lang === 'it'
                    ? 'Email automatica inviata all\u2019ospite quando una prenotazione viene confermata. Personalizza oggetto, testo e contatti della struttura.'
                    : 'Automatic email sent to the guest when a booking is confirmed. Edit subject, body and property contacts.'}
                </p>
              </div>

              <div className="surface-card p-6 space-y-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5"
                    checked={!!siteSettings.confirmation_email_enabled}
                    onChange={(e) => setSiteSettings({ ...siteSettings, confirmation_email_enabled: e.target.checked })}
                    data-testid="email-enabled-toggle"
                  />
                  <span className="text-sm font-medium">
                    {lang === 'it' ? 'Invio email automatica abilitato' : 'Automatic email enabled'}
                  </span>
                </label>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                    {lang === 'it' ? 'Oggetto' : 'Subject'}
                  </label>
                  <Input
                    value={siteSettings.confirmation_email_subject || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, confirmation_email_subject: e.target.value })}
                    placeholder="Prenotazione confermata — {{property_name}}"
                    data-testid="email-subject-input"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                    {lang === 'it' ? 'Corpo dell\u2019email' : 'Email body'}
                  </label>
                  <textarea
                    rows={18}
                    value={siteSettings.confirmation_email_body || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, confirmation_email_body: e.target.value })}
                    className="w-full bg-card border border-border/60 px-3 py-2 text-sm font-mono resize-y"
                    data-testid="email-body-textarea"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {lang === 'it' ? 'Variabili disponibili: ' : 'Available variables: '}
                    <code className="text-[10px]">{'{{guest_name}} {{property_name}} {{property_address}} {{check_in}} {{check_out}} {{check_in_time}} {{check_out_time}} {{nights}} {{guests}} {{total}} {{payment_method}} {{deposit_line}} {{contact_phone}} {{contact_email}}'}</code>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/40">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                      {lang === 'it' ? 'Telefono struttura' : 'Property phone'}
                    </label>
                    <Input
                      value={siteSettings.confirmation_email_contact_phone || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, confirmation_email_contact_phone: e.target.value })}
                      placeholder="+39 333 1234567"
                      data-testid="email-contact-phone"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                      {lang === 'it' ? 'Email struttura' : 'Property email'}
                    </label>
                    <Input
                      type="email"
                      value={siteSettings.confirmation_email_contact_email || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, confirmation_email_contact_email: e.target.value })}
                      placeholder="prenotazioni@terracito.it"
                      data-testid="email-contact-email"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                      {lang === 'it' ? 'Indirizzo (fallback)' : 'Address (fallback)'}
                    </label>
                    <Input
                      value={siteSettings.confirmation_email_contact_address || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, confirmation_email_contact_address: e.target.value })}
                      placeholder="Via Galvani, Reggio Calabria"
                      data-testid="email-contact-address"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-end pt-3 border-t border-border/40">
                  <Button
                    variant="outline"
                    disabled={!siteSettingsLoaded || sendingTestEmail}
                    onClick={async () => {
                      const to = window.prompt(
                        lang === 'it' ? 'Email destinatario per il test:' : 'Recipient email for the test:',
                        user?.email || ''
                      );
                      if (!to) return;
                      setSendingTestEmail(true);
                      try {
                        await axios.post(`${API}/admin/email/test`, { to });
                        toast.success(lang === 'it' ? `Email di prova inviata a ${to}` : `Test email sent to ${to}`);
                      } catch (e) {
                        toast.error(e.response?.data?.detail || t('common.error'));
                      } finally {
                        setSendingTestEmail(false);
                      }
                    }}
                    data-testid="send-test-email-btn"
                  >
                    <Mail className="w-4 h-4 mr-1.5" />
                    {sendingTestEmail
                      ? (lang === 'it' ? 'Invio\u2026' : 'Sending\u2026')
                      : (lang === 'it' ? 'Invia email di prova' : 'Send test email')}
                  </Button>

                  <Button
                    onClick={async () => {
                      setSavingSiteSettings(true);
                      try {
                        const res = await axios.put(`${API}/admin/site-settings`, siteSettings);
                        setSiteSettings({ ...siteSettings, ...res.data });
                        toast.success(lang === 'it' ? 'Email salvata' : 'Email saved');
                      } catch (e) {
                        toast.error(e.response?.data?.detail || t('common.error'));
                      } finally {
                        setSavingSiteSettings(false);
                      }
                    }}
                    disabled={!siteSettingsLoaded || savingSiteSettings}
                    data-testid="save-email-settings"
                  >
                    {savingSiteSettings
                      ? (lang === 'it' ? 'Salvataggio\u2026' : 'Saving\u2026')
                      : (lang === 'it' ? 'Salva email' : 'Save email')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Link Tab */}
          {activeTab === 'paylink' && <PaymentLinkPanel lang={lang} t={t} />}

        </main>

        {/* Lead Documents Dialog */}
        <Dialog open={!!leadDocsOpen} onOpenChange={(o) => !o && setLeadDocsOpen(null)}>
          <DialogContent className="bg-card border-border/60 max-w-2xl" data-testid="lead-docs-dialog">
            <DialogHeader>
              <DialogTitle className="font-display">
                {lang === 'it' ? 'Documenti ricevuti in chat' : 'Chat documents'}
                {leadDocsOpen?.guest_name && <span className="text-sm text-muted-foreground ml-2">— {leadDocsOpen.guest_name}</span>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                value={leadDocsSearch}
                onChange={(e) => setLeadDocsSearch(e.target.value)}
                placeholder={lang === 'it' ? 'Cerca per nome, tipo o data\u2026' : 'Search by name, type or date\u2026'}
                data-testid="lead-docs-search"
              />
              <div className="border border-border/60 divide-y divide-border/50 max-h-[60vh] overflow-y-auto">
                {filteredLeadDocs.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    {lang === 'it' ? 'Nessun documento trovato' : 'No documents found'}
                  </div>
                )}
                {filteredLeadDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{d.filename || d.id}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.content_type?.split('/')[1]?.toUpperCase() || '—'}
                          {' · '}
                          {d.size ? (d.size / 1024).toFixed(0) + ' KB' : '—'}
                          {' · '}
                          {d.uploaded_at ? format(new Date(d.uploaded_at), 'dd/MM/yyyy HH:mm') : '—'}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadLeadDoc(leadDocsOpen.session_id, d)}
                      data-testid={`download-doc-${d.id}`}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {lang === 'it' ? 'Scarica' : 'Download'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lead Edit Dialog */}
        <Dialog open={!!editingLead} onOpenChange={(o) => !o && setEditingLead(null)}>
          <DialogContent className="bg-card border-border/60 max-w-xl" data-testid="lead-edit-dialog">
            <DialogHeader>
              <DialogTitle className="font-display">
                {lang === 'it' ? 'Modifica Lead' : 'Edit Lead'}
              </DialogTitle>
            </DialogHeader>
            {editingLead && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Nome completo' : 'Full name'}
                  </label>
                  <Input
                    value={editingLead.guest_name || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, guest_name: e.target.value })}
                    data-testid="lead-edit-name"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Telefono' : 'Phone'}
                  </label>
                  <Input
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    data-testid="lead-edit-phone"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    data-testid="lead-edit-email"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Città di provenienza' : 'Origin city'}
                  </label>
                  <Input
                    value={editingLead.origin_city || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, origin_city: e.target.value })}
                    data-testid="lead-edit-city"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Motivo' : 'Reason'}
                  </label>
                  <Input
                    value={editingLead.reason || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, reason: e.target.value })}
                    data-testid="lead-edit-reason"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Date interessate' : 'Dates'}
                  </label>
                  <Input
                    value={editingLead.dates || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, dates: e.target.value })}
                    data-testid="lead-edit-dates"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Ospiti' : 'Guests'}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={editingLead.guests_count || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, guests_count: e.target.value })}
                    data-testid="lead-edit-guests"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Stato' : 'Status'}
                  </label>
                  <select
                    value={editingLead.status || 'new'}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                    className="w-full bg-card border border-border/60 px-3 py-2 text-sm"
                    data-testid="lead-edit-status"
                  >
                    <option value="new">{lang === 'it' ? 'Nuovo' : 'New'}</option>
                    <option value="contacted">{lang === 'it' ? 'Contattato' : 'Contacted'}</option>
                    <option value="converted">{lang === 'it' ? 'Convertito' : 'Converted'}</option>
                    <option value="lost">{lang === 'it' ? 'Perso' : 'Lost'}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === 'it' ? 'Note interne' : 'Internal note'}
                  </label>
                  <textarea
                    rows={3}
                    value={editingLead.note || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, note: e.target.value })}
                    className="w-full bg-card border border-border/60 px-3 py-2 text-sm resize-none"
                    data-testid="lead-edit-note"
                  />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditingLead(null)} data-testid="lead-edit-cancel">
                    {lang === 'it' ? 'Annulla' : 'Cancel'}
                  </Button>
                  <Button onClick={saveLeadEdit} data-testid="lead-edit-save">
                    {lang === 'it' ? 'Salva' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
