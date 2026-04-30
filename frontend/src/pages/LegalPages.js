import { useTranslation } from 'react-i18next';

export const PrivacyPage = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="min-h-screen pt-20" data-testid="privacy-page">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-display font-medium mb-8">
          {lang === 'it' ? 'Informativa sulla Privacy' : 'Privacy Policy'}
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8 text-foreground/80">
          {lang === 'it' ? (
            <>
              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">1. Titolare del Trattamento</h2>
                <p>Il Titolare del trattamento dei dati personali è TerracitoAppartments S.r.l., con sede legale in Via Roma 123, 00100 Roma, Italia.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">2. Dati Raccolti</h2>
                <p>Raccogliamo i seguenti dati personali:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Dati identificativi (nome, cognome, email, telefono)</li>
                  <li>Dati di pagamento (gestiti tramite provider terzi sicuri)</li>
                  <li>Dati di navigazione (cookie tecnici e analitici)</li>
                  <li>Documenti di identità (per la registrazione degli ospiti come richiesto dalla legge)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">3. Finalità del Trattamento</h2>
                <p>I dati sono trattati per:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Gestione delle prenotazioni</li>
                  <li>Comunicazioni relative al soggiorno</li>
                  <li>Adempimenti legali e fiscali</li>
                  <li>Marketing (previo consenso)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">4. Base Giuridica</h2>
                <p>Il trattamento è basato su: esecuzione contrattuale, obblighi legali, consenso dell'interessato e legittimo interesse del Titolare.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">5. Conservazione dei Dati</h2>
                <p>I dati sono conservati per il tempo necessario alle finalità indicate, e comunque non oltre i termini di legge (10 anni per dati fiscali, 5 anni per registrazione ospiti).</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">6. Diritti dell'Interessato</h2>
                <p>Ai sensi del GDPR, hai diritto di:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Accedere ai tuoi dati</li>
                  <li>Rettificare dati inesatti</li>
                  <li>Cancellare i dati (diritto all'oblio)</li>
                  <li>Limitare il trattamento</li>
                  <li>Portabilità dei dati</li>
                  <li>Opporti al trattamento</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">7. Contatti</h2>
                <p>Per esercitare i tuoi diritti o per informazioni, contattaci a: privacy@terracitoappartments.com</p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">1. Data Controller</h2>
                <p>The Data Controller is TerracitoAppartments S.r.l., with registered office at Via Roma 123, 00100 Rome, Italy.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">2. Data Collected</h2>
                <p>We collect the following personal data:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Identification data (name, surname, email, phone)</li>
                  <li>Payment data (managed through secure third-party providers)</li>
                  <li>Navigation data (technical and analytical cookies)</li>
                  <li>Identity documents (for guest registration as required by law)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">3. Processing Purposes</h2>
                <p>Data is processed for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Booking management</li>
                  <li>Communications regarding your stay</li>
                  <li>Legal and tax obligations</li>
                  <li>Marketing (with consent)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">4. Legal Basis</h2>
                <p>Processing is based on: contract execution, legal obligations, data subject consent, and legitimate interest of the Controller.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">5. Data Retention</h2>
                <p>Data is retained for the time necessary for the indicated purposes, and in any case no longer than legal terms (10 years for tax data, 5 years for guest registration).</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">6. Data Subject Rights</h2>
                <p>Under GDPR, you have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your data</li>
                  <li>Rectify inaccurate data</li>
                  <li>Erase data (right to be forgotten)</li>
                  <li>Restrict processing</li>
                  <li>Data portability</li>
                  <li>Object to processing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">7. Contact</h2>
                <p>To exercise your rights or for information, contact us at: privacy@terracitoappartments.com</p>
              </section>
            </>
          )}

          <p className="text-sm text-muted-foreground mt-12">
            {lang === 'it' ? 'Ultimo aggiornamento: Gennaio 2024' : 'Last updated: January 2024'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const TermsPage = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="min-h-screen pt-20" data-testid="terms-page">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-display font-medium mb-8">
          {lang === 'it' ? 'Termini e Condizioni' : 'Terms and Conditions'}
        </h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8 text-foreground/80">
          {lang === 'it' ? (
            <>
              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">1. Oggetto</h2>
                <p>I presenti Termini e Condizioni regolano l'utilizzo del sito web TerracitoAppartments e la prenotazione delle proprietà in esso presenti.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">2. Prenotazioni</h2>
                <p>La prenotazione si intende confermata solo dopo:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Ricezione della conferma via email</li>
                  <li>Pagamento del deposito o dell'intero importo</li>
                  <li>Accettazione delle presenti condizioni</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">3. Pagamenti</h2>
                <p>Accettiamo pagamenti tramite:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Carta di credito/debito (Stripe)</li>
                  <li>PayPal</li>
                  <li>Bonifico bancario</li>
                </ul>
                <p>Il deposito cauzionale viene restituito entro 7 giorni dal check-out, previa verifica dello stato della proprietà.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">4. Cancellazioni</h2>
                <p>Politica di cancellazione:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Più di 30 giorni prima: rimborso completo</li>
                  <li>15-30 giorni prima: rimborso 50%</li>
                  <li>Meno di 15 giorni: nessun rimborso</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">5. Check-in e Check-out</h2>
                <p>Gli orari standard sono:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Check-in: dalle 15:00</li>
                  <li>Check-out: entro le 10:00</li>
                </ul>
                <p>Orari diversi possono essere concordati in base alla disponibilità.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">6. Regole della Proprietà</h2>
                <p>Gli ospiti si impegnano a:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Rispettare il numero massimo di ospiti dichiarato</li>
                  <li>Non organizzare feste o eventi senza autorizzazione</li>
                  <li>Rispettare il vicinato e gli orari di silenzio</li>
                  <li>Lasciare la proprietà in condizioni ordinate</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">7. Responsabilità</h2>
                <p>TerracitoAppartments non è responsabile per danni causati da forza maggiore, interruzioni di servizi pubblici o eventi al di fuori del proprio controllo.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">8. Foro Competente</h2>
                <p>Per qualsiasi controversia sarà competente il Foro di Roma.</p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">1. Subject</h2>
                <p>These Terms and Conditions govern the use of the TerracitoAppartments website and the booking of properties listed therein.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">2. Bookings</h2>
                <p>A booking is considered confirmed only after:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Receipt of email confirmation</li>
                  <li>Payment of deposit or full amount</li>
                  <li>Acceptance of these conditions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">3. Payments</h2>
                <p>We accept payments via:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Credit/debit card (Stripe)</li>
                  <li>PayPal</li>
                  <li>Bank transfer</li>
                </ul>
                <p>The security deposit is refunded within 7 days of check-out, subject to property condition verification.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">4. Cancellations</h2>
                <p>Cancellation policy:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>More than 30 days before: full refund</li>
                  <li>15-30 days before: 50% refund</li>
                  <li>Less than 15 days: no refund</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">5. Check-in and Check-out</h2>
                <p>Standard times are:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Check-in: from 3:00 PM</li>
                  <li>Check-out: by 10:00 AM</li>
                </ul>
                <p>Different times may be arranged based on availability.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">6. Property Rules</h2>
                <p>Guests agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Respect the declared maximum number of guests</li>
                  <li>Not organize parties or events without authorization</li>
                  <li>Respect neighbors and quiet hours</li>
                  <li>Leave the property in orderly condition</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">7. Liability</h2>
                <p>TerracitoAppartments is not liable for damages caused by force majeure, public service interruptions, or events beyond its control.</p>
              </section>

              <section>
                <h2 className="text-2xl font-display font-medium text-foreground">8. Jurisdiction</h2>
                <p>For any dispute, the Court of Rome shall have jurisdiction.</p>
              </section>
            </>
          )}

          <p className="text-sm text-muted-foreground mt-12">
            {lang === 'it' ? 'Ultimo aggiornamento: Gennaio 2024' : 'Last updated: January 2024'}
          </p>
        </div>
      </div>
    </div>
  );
};
