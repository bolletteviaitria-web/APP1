import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DOC_TYPES = [
  { value: 'id_front', label_it: 'Documento (fronte)', label_en: 'ID (front)' },
  { value: 'id_back', label_it: 'Documento (retro)', label_en: 'ID (back)' },
  { value: 'passport', label_it: 'Passaporto', label_en: 'Passport' },
  { value: 'other', label_it: 'Altro', label_en: 'Other' },
];

export const DocumentUpload = ({ bookingId }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('id_front');
  const inputRef = useRef(null);

  const fetchDocs = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await axios.get(`${API}/bookings/${bookingId}/documents`);
      setDocs(res.data);
    } catch (err) {
      // 404 = booking not yet visible to the API; surface anything else.
      const status = err?.response?.status;
      if (status && status !== 404) {
        console.error('Failed to load uploaded documents:', err);
        toast.error(lang === 'it' ? 'Impossibile caricare i documenti' : 'Could not load uploaded documents');
      }
    }
  }, [bookingId, lang]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(lang === 'it' ? 'File troppo grande (max 10MB)' : 'File too large (max 10MB)');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await axios.post(
        `${API}/bookings/${bookingId}/documents?document_type=${docType}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success(lang === 'it' ? 'Documento caricato' : 'Document uploaded');
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || (lang === 'it' ? 'Caricamento fallito' : 'Upload failed'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (!bookingId) return null;

  return (
    <div className="glass p-6 space-y-4 text-left" data-testid="document-upload-card">
      <div>
        <h3 className="text-lg font-display font-medium flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {lang === 'it' ? 'Documenti d\u2019Identità' : 'Identity Documents'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'it'
            ? 'Carica un documento valido (carta d\u2019identità o passaporto). Richiesto per il check-in.'
            : 'Upload a valid ID document (national ID or passport). Required at check-in.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="flex-1 bg-transparent border border-border/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
          data-testid="doc-type-select"
        >
          {DOC_TYPES.map((d) => (
            <option key={d.value} value={d.value} className="bg-card text-foreground">
              {lang === 'it' ? d.label_it : d.label_en}
            </option>
          ))}
        </select>

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="doc-file-input"
        />

        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-primary"
          data-testid="doc-upload-btn"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{lang === 'it' ? 'Caricamento\u2026' : 'Uploading\u2026'}</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />{lang === 'it' ? 'Carica' : 'Upload'}</>
          )}
        </Button>
      </div>

      {docs.length > 0 && (
        <ul className="space-y-2 pt-2 border-t border-border/40" data-testid="doc-list">
          {docs.map((d) => {
            const typeLabel = DOC_TYPES.find((t) => t.value === d.document_type);
            return (
              <li key={d.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-foreground truncate">{d.original_filename}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {typeLabel ? (lang === 'it' ? typeLabel.label_it : typeLabel.label_en) : d.document_type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(d.size / 1024).toFixed(0)} KB
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DocumentUpload;
