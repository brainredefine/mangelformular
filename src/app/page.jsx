'use client';

import { useState, useRef } from 'react';

export default function MangelmanagementChecklistForm() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({
    mieter: '', ansprechpartner: '', telefonnummer: '', email: '',
    adresse: '', mieteinheit: '', vertragsnummer: '', titel: '',
    beschreibung: '', gebaeudeteil: '', etage: '', raumbezeichnung: '',
    zusatzlage: '', tgaCategories: new Set(), allgemeinCategories: new Set(),
    mietCategories: new Set(), sicherheitCategories: new Set(),
    sonstigesTGA: '', sonstigesAllgemein: '', sonstigesMiet: '',
    sonstigesSicherheit: '', dringlichkeit: 'Mittel', zugangErforderlich: false,
    timefenster: '', zutrittsregelungen: '', datenschutz: false
  });
  
  const [currentFiles, setCurrentFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const MAX_FILES = 5;

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const toggleCategory = (field, cat) => {
    setFormData((prev) => {
      const newSet = new Set(prev[field]);
      newSet.has(cat) ? newSet.delete(cat) : newSet.add(cat);
      return { ...prev, [field]: newSet };
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (currentFiles.length + files.length > MAX_FILES) {
      alert(`Max. ${MAX_FILES} Dateien. Aktuell: ${currentFiles.length}, Neu: ${files.length}`);
      return;
    }
    setCurrentFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => setCurrentFiles((prev) => prev.filter((_, i) => i !== index));

  const submitAll = async () => {
    const requiredFields = ['mieter', 'ansprechpartner', 'telefonnummer', 'email', 'adresse', 'titel', 'beschreibung', 'dringlichkeit', 'datenschutz'];
    if (requiredFields.some((field) => !formData[field])) {
      alert('Bitte alle erforderlichen Felder ausfüllen und Datenschutz akzeptieren.');
      return;
    }
    if (formData.zugangErforderlich && (!formData.timefenster || !formData.zutrittsregelungen)) {
      alert('Bitte Zeitfenster und Zutrittsregelungen angeben.');
      return;
    }

    setLoading(true);
    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value instanceof Set) {
        value.forEach((cat) => formDataToSend.append(`${key}[]`, cat));
      } else if (key.startsWith('sonstiges') && formData[key.replace('sonstiges', '').toLowerCase() + 'Categories']?.has(key.toLowerCase().replace('sonstiges', '-sonstiges'))) {
        formDataToSend.append(key, value);
      } else if (typeof value === 'boolean') {
        formDataToSend.append(key, value ? 'Ja' : 'Nein');
      } else {
        formDataToSend.append(key, value);
      }
    });
    currentFiles.forEach((file) => formDataToSend.append('files[]', file));

    try {
      const res = await fetch('/api/submit', { method: 'POST', body: formDataToSend });
      if (res.ok) setSubmitted(true);
      else alert('Fehler beim Senden des Formulars');
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}>
        <h2>Accès au formulaire</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Geben Sie das Passwort ein"
          style={{ padding: '0.5rem', marginBottom: '1rem', width: '100%' }}
        />
        <button onClick={() => password === process.env.NEXT_PUBLIC_PASSWORD ? setIsAuthenticated(true) : alert('Falsches Passwort')}>
          Valider
        </button>
      </div>
    );
  }

  if (submitted) return <div id="result" className="success">✔️ Formular gesendet!</div>;

  return (
    <>
      <h1>Eingangsformular zur Mangelmeldung (Gewerbemieter)</h1>
      <p>Wichtiger Hinweis: Pro Mangelmeldung einmalig ausfüllen. Mehrere Mängel einzeln melden. Alle Angaben vollständig und wahrheitsgemäß machen.</p>
      <div className="point-container" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
        <h2>1. Angaben zum meldenden Unternehmen</h2>
        {[
          { label: 'Mieter', key: 'mieter', type: 'text' },
          { label: 'Ansprechpartner', key: 'ansprechpartner', type: 'text' },
          { label: 'Telefonnummer', key: 'telefonnummer', type: 'tel' },
          { label: 'E-Mail-Adresse', key: 'email', type: 'email' }
        ].map(({ label, key, type }) => (
          <div key={key}>
            <p><strong>{label}</strong></p>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => updateField(key, e.target.value)}
              style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
          </div>
        ))}

        <h2>2. Objekt- & Vertragsinformationen</h2>
        {[
          { label: 'Adresse', key: 'adresse', type: 'text', placeholder: 'Straße, PLZ, Stadt' },
          { label: 'Mieteinheit / Fläche (optional)', key: 'mieteinheit', type: 'text' },
          { label: 'Vertragsnummer (optional)', key: 'vertragsnummer', type: 'text' }
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <p><strong>{label}</strong></p>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => updateField(key, e.target.value)}
              placeholder={placeholder}
              style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
          </div>
        ))}

        <h2>3. Beschreibung des Mangels</h2>
        <p><strong>Titel / Kurzerfassung</strong></p>
        <input
          type="text"
          value={formData.titel}
          onChange={(e) => updateField('titel', e.target.value)}
          placeholder="z. B. „Klimaanlage ausgefallen im Showroom“"
          style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '1rem' }}
        />
        <p><strong>Ausführliche Beschreibung</strong></p>
        <textarea
          value={formData.beschreibung}
          onChange={(e) => updateField('beschreibung', e.target.value)}
          placeholder="Bitte möglichst konkret: Was? Wo genau? Seit wann? Welche Auswirkungen?"
          style={{
            width: '100%', minHeight: '100px', marginTop: '0.5rem', padding: '0.8rem',
            border: '1px solid #1a2a44', borderRadius: '8px', background: '#ffffff',
            color: '#2c3e50', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.3s ease', boxSizing: 'border-box', resize: 'vertical'
          }}
        />

        <h2>4. Lage des Mangels</h2>
        {[
          { label: 'Gebäudeteil / Trakt', key: 'gebaeudeteil', type: 'text' },
          { label: 'Etage / Geschoss', key: 'etage', type: 'text' },
          { label: 'Raumbezeichnung / Nummer', key: 'raumbezeichnung', type: 'text' }
        ].map(({ label, key, type }) => (
          <div key={key}>
            <p><strong>{label}</strong></p>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => updateField(key, e.target.value)}
              style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
          </div>
        ))}
        <p><strong>Zusätzliche Lagebeschreibung</strong></p>
        <textarea
          value={formData.zusatzlage}
          onChange={(e) => updateField('zusatzlage', e.target.value)}
          placeholder="z. B. „rechter Wandbereich“, „unter der Decke“, „hinter dem Empfang“"
          style={{
            width: '100%', minHeight: '100px', marginTop: '0.5rem', padding: '0.8rem',
            border: '1px solid #1a2a44', borderRadius: '8px', background: '#ffffff',
            color: '#2c3e50', fontSize: '1rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.3s ease', boxSizing: 'border-box', resize: 'vertical'
          }}
        />

        <h2>5. Kategorie des Mangels – bitte auswählen (Mehrfachauswahl möglich)</h2>
        {[
          {
            title: 'A. Technische Gebäudeausrüstung (TGA)', key: 'tgaCategories', sonstigesKey: 'sonstigesTGA',
            options: [
              { value: 'tga-heizung', label: 'Heizung (z. B. Ausfall, Geräusche, Steuerung defekt)' },
              { value: 'tga-klima', label: 'Klima- / Lüftungsanlage (z. B. keine Kühlung, Ausfall)' },
              { value: 'tga-elektrik', label: 'Elektrik / Beleuchtung (z. B. Steckdosen, Sicherungen, Lichtausfall)' },
              { value: 'tga-aufzug', label: 'Aufzugsanlage (z. B. außer Betrieb, Fehlermeldung)' },
              { value: 'tga-sanitaer', label: 'Sanitär (z. B. Wasserleitung, WC, Spülung defekt, Verstopfung)' },
              { value: 'tga-sprinkler', label: 'Sprinkler / Brandschutz (z. B. Störung, Leckage, Alarm)' },
              { value: 'tga-notstrom', label: 'Notstromversorgung / USV' },
              { value: 'tga-sonstiges', label: 'Sonstiges TGA' }
            ]
          },
          {
            title: 'B. Allgemeinbereiche des Gebäudes', key: 'allgemeinCategories', sonstigesKey: 'sonstigesAllgemein',
            options: [
              { value: 'allgemein-eingang', label: 'Eingangsbereich / Foyer' },
              { value: 'allgemein-treppenhaus', label: 'Treppenhaus / Flure' },
              { value: 'allgemein-sanitaer', label: 'Gemeinschafts-Sanitärbereiche' },
              { value: 'allgemein-muell', label: 'Müllentsorgung / Müllplatz' },
              { value: 'allgemein-tiefgarage', label: 'Tiefgarage / Stellplätze' },
              { value: 'allgemein-aussenbeleuchtung', label: 'Außenbeleuchtung' },
              { value: 'allgemein-aussenanlagen', label: 'Außenanlagen (z. B. Pflasterung, Einfahrten)' },
              { value: 'allgemein-beschilderung', label: 'Beschilderung / Wegführung' },
              { value: 'allgemein-reinigung', label: 'Reinigung / Hygiene / Grünpflege' },
              { value: 'allgemein-fassade', label: 'Fassade' },
              { value: 'allgemein-dach', label: 'Dach' },
              { value: 'allgemein-sonstiges', label: 'Sonstiges Allgemeinbereich' }
            ]
          },
          {
            title: 'C. Mietfläche', key: 'mietCategories', sonstigesKey: 'sonstigesMiet',
            options: [
              { value: 'miet-waende', label: 'Wände / Decken (z. B. Risse, Feuchtigkeit, Putzschäden)' },
              { value: 'miet-boeden', label: 'Böden / Beläge (z. B. beschädigt, lose, abgenutzt)' },
              { value: 'miet-fenster', label: 'Fenster / Türen (z. B. Undichtigkeiten, Schließmechanismus)' },
              { value: 'miet-sonnenschutz', label: 'Sonnenschutz / Jalousien' },
              { value: 'miet-it', label: 'IT-Infrastruktur / Netzwerkverkabelung' },
              { value: 'miet-innenbeleuchtung', label: 'Innenbeleuchtung' },
              { value: 'miet-raumausstattung', label: 'Raumausstattung / Mobiliar (falls vom Vermieter gestellt)' },
              { value: 'miet-kueche', label: 'Kücheneinrichtungen / Teeküche' },
              { value: 'miet-sonstiges', label: 'Sonstiges Mietbereich' }
            ]
          },
          {
            title: 'D. Sicherheit & Gefahrenabwehr', key: 'sicherheitCategories', sonstigesKey: 'sonstigesSicherheit',
            options: [
              { value: 'sicherheit-einbruch', label: 'Einbruchschutz (z. B. Schlösser, Türsysteme defekt)' },
              { value: 'sicherheit-video', label: 'Videoüberwachung' },
              { value: 'sicherheit-brandmelde', label: 'Brandmeldeanlage / Rauchmelder' },
              { value: 'sicherheit-evakuierung', label: 'Evakuierungswege / Notausgänge' },
              { value: 'sicherheit-fluchtweg', label: 'Fluchtwegkennzeichnung / Notbeleuchtung' },
              { value: 'sicherheit-hinweise', label: 'Sicherheitsrelevante Hinweise der Behörden' },
              { value: 'sicherheit-sonstiges', label: 'Sonstiges Sicherheitsthema' }
            ]
          }
        ].map(({ title, key, sonstigesKey, options }) => (
          <div key={key} style={{ marginBottom: '1rem' }}>
            <p><strong>{title}</strong></p>
            {options.map(({ value, label }) => (
              <label key={value} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={formData[key].has(value)}
                  onChange={() => toggleCategory(key, value)}
                />
                {label}
              </label>
            ))}
            {formData[key].has(key.replace('Categories', '-sonstiges')) && (
              <>
                <p style={{ margin: '0.25rem 0', fontSize: '1rem' }}>Kommentar zu Sonstiges:</p>
                <input
                  type="text"
                  value={formData[sonstigesKey]}
                  onChange={(e) => updateField(sonstigesKey, e.target.value)}
                  style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '0.5rem', marginTop: '0.25rem' }}
                />
              </>
            )}
          </div>
        ))}

        <h2>6. Betriebsrelevanz / Dringlichkeit</h2>
        <select
          value={formData.dringlichkeit}
          onChange={(e) => updateField('dringlichkeit', e.target.value)}
          style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '1rem', padding: '0.8rem', border: '1px solid #1a2a44', borderRadius: '8px', background: '#ffffff', color: '#2c3e50' }}
        >
          <option value="Hoch">Hoch – Geschäftsbetrieb erheblich gestört oder Sicherheitsrisiko</option>
          <option value="Mittel">Mittel – Funktionseinschränkung, aber Betrieb möglich</option>
          <option value="Niedrig">Niedrig – optischer Mangel / kein Einfluss auf Betrieb</option>
        </select>
        <p style={{ margin: '0.25rem 0', fontSize: '1rem' }}>Die Bearbeitung erfolgt in jedem Fall sehr rasch.</p>

        <h2>7. Verfügbarkeit & Zugang</h2>
        <p><strong>Ist Zugang zur Mietfläche erforderlich?</strong></p>
        <label style={{ display: 'block' }}>
          <input
            type="checkbox"
            checked={formData.zugangErforderlich}
            onChange={(e) => updateField('zugangErforderlich', e.target.checked)}
          />
          Ja
        </label>
        {formData.zugangErforderlich && (
          <>
            <p><strong>Zeitfenster für Zugang</strong></p>
            <input
              type="text"
              value={formData.timefenster}
              onChange={(e) => updateField('timefenster', e.target.value)}
              style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
            <p><strong>Zutrittsregelungen / Ansprechpartner vor Ort</strong></p>
            <input
              type="text"
              value={formData.zutrittsregelungen}
              onChange={(e) => updateField('zutrittsregelungen', e.target.value)}
              style={{ maxWidth: '100%', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
          </>
        )}

        <h2>8. Anlagen / Uploads</h2>
        <p style={{ margin: '0.25rem 0', fontSize: '1rem' }}>
          Bitte aussagekräftige Fotos hochladen:
        </p>
        <ul>
          <li>Übersichtsfoto zur räumlichen Einordnung</li>
          <li>Detailfoto des Schadens</li>
          <li>Foto eines Typenschilds, falls vorhanden</li>
          <li>Displayanzeige / Fehlermeldung, falls relevant</li>
        </ul>
        <div style={{ marginTop: '1rem' }}>
          <label className="action-button" htmlFor="file-input">
            Dateien hinzufügen ({currentFiles.length}/{MAX_FILES})
            <input
              id="file-input"
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </label>
          {currentFiles.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p><strong>Ausgewählte Dateien:</strong></p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginTop: '0.5rem' }}>
                {currentFiles.map((file, index) => (
                  <div key={index} style={{ position: 'relative', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '10px', textAlign: 'center' }}>
                        {file.name}
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        position: 'absolute', top: '5px', right: '5px', background: 'rgba(255, 0, 0, 0.8)', color: 'white',
                        border: 'none', borderRadius: '50%', width: '25px', height: '25px', fontSize: '14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title="Datei entfernen"
                    >
                      ×
                    </button>
                    <p style={{ padding: '5px', margin: '0', fontSize: '12px', background: '#f5f5f5', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={formData.datenschutz}
              onChange={(e) => updateField('datenschutz', e.target.checked)}
            />
            ✅ Datenschutz & Bearbeitungseinverständnis: Ich bin berechtigt, diese Mangelmeldung im Namen des Unternehmens zu übermitteln.
          </label>
        </div>

        <button
          className="action-button"
          onClick={submitAll}
          disabled={loading}
          style={{ marginTop: '1rem', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Ladung... bitte warten' : 'Formular schicken'}
        </button>
      </div>
    </>
  );
}