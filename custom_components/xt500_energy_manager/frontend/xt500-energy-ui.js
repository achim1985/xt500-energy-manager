// XT500 Energy Manager – Bedienoberfläche.
// Lovelace-Karten (`custom:xt500-energy-card`, `custom:xt500-energy-mini-card`) plus
// Dashboard-Strategie (`custom:xt500-energy`). Wird von der Integration global
// geladen, eine Lovelace-Ressource ist nicht nötig. Alle Entitäten werden wie in der
// Integration über die Attribute `integration` und `xt500_key` gefunden;
// Quellwerte (PV, Netz, SoC) kommen aus den `source_*`-Attributen der
// Status-Entität. Es gibt keine fest eingetragenen Entitäts-IDs.

const DOMAIN = 'xt500_energy_manager';
const VERSION = '1.12.0';
const BLUEPRINT_PATH = 'xt500_energy_manager/dynamic_tariff_charging.yaml';

// ---------- Sprache ----------

let LANG = 'de';
let NUMLOC = 'de';

// Englische Fassung der eigenen Texte; Schlüssel ist der deutsche Text
const EN = {
  'Übersicht': 'Overview', 'Steuern': 'Control', 'Verlauf': 'History', 'Technik': 'Technical',
  'Energiemanager': 'Energy manager', 'Regelt': 'Active', 'Aus': 'Off', 'Störung': 'Fault', 'Pause': 'Paused',
  'Noch kein XT500 eingerichtet': 'No XT500 set up yet',
  'Richte zuerst „XT500 Energy Manager“ unter Einstellungen → Geräte & Dienste ein.': 'Set up “XT500 Energy Manager” under Settings → Devices & services first.',
  'Nur Anzeige – Änderungen sind Administratoren vorbehalten.': 'View only – changes are reserved for administrators.',
  'Nur Administratoren dürfen Einstellungen ändern.': 'Only administrators can change settings.',
  'Abbrechen': 'Cancel', 'OK': 'OK', 'Schließen': 'Close',
  // Zustandssatz
  'Energiemanager ist ausgeschaltet': 'Energy manager is switched off',
  'Der XT500 arbeitet mit seinen eigenen Einstellungen. Es werden keine Sollwerte geschrieben.': 'The XT500 runs on its own settings. No setpoints are written.',
  'Es fehlen Messwerte': 'Measurements are missing',
  'Mindestens ein Pflichtsensor liefert keinen gültigen Wert.': 'At least one required sensor has no valid value.',
  'Die Regelung pausiert, bis wieder alles gültig ist.': 'Control pauses until all inputs are valid again.',
  'Verbindung zum XT500 wird geprüft': 'Checking the connection to the XT500',
  'Der Speicher antwortet gerade nicht zuverlässig. Schreibvorgänge sind pausiert.': 'The battery is not responding reliably. Writes are paused.',
  'Regelung wurde gestoppt': 'Control has been stopped',
  'Ein Sollwert ließ sich nicht schreiben. Wiederherstellung: {r}.': 'A setpoint could not be written. Recovery: {r}.',
  'Startprüfung läuft': 'Start-up check running',
  'Der Energiemanager prüft Messwerte und Rückmeldungen, bevor er regelt.': 'The energy manager checks inputs and feedback before it starts controlling.',
  'Akku lädt mit {p} aus {src}': 'Battery charging at {p} from {src}',
  '{op} bis {soc} %': '{op} up to {soc} %', 'Ladegrenze {soc} %': 'Charge limit {soc} %',
  'Akku ist voll – PV geht ins Haus': 'Battery full – PV supplies the house',
  'Die direkt angeschlossene PV versorgt das Haus, Überschuss darf ins Netz.': 'The directly connected PV supplies the house, surplus may go to the grid.',
  'Akku versorgt das Haus mit {p}': 'Battery supplying the house with {p}',
  'Der Netzbezug wird auf {g} gehalten. Entladegrenze {m} %.': 'Grid import is held at {g}. Discharge limit {m} %.',
  'Akku hält die Notstrom-Reserve': 'Battery is keeping the backup reserve',
  'Unter {r} % wird nicht entladen. Freigabe wieder ab {f} %.': 'No discharge below {r} %. Released again from {f} %.',
  'Akku ist an der Entladegrenze': 'Battery is at the discharge limit',
  'Entladen ist gesperrt, bis {s} % erreicht sind.': 'Discharging is blocked until {s} % is reached.',
  '{op} wartet auf Sonne': '{op} is waiting for sun', 'Ladung': 'Charging',
  'Es ist noch nicht genug PV-Überschuss da. Ziel {soc} %.': 'There is not enough PV surplus yet. Target {soc} %.',
  'Ladeziel erreicht': 'Target reached', 'Der Akku steht bei {soc} %.': 'The battery is at {soc} %.',
  'Akku ruht': 'Battery idle', 'Haus und Netz sind ausgeglichen.': 'House and grid are balanced.',
  'lädt {p}': 'charging {p}', 'entlädt {p}': 'discharging {p}', 'Ruhe': 'idle',
  '≈ voll um {t} (in {d})': '≈ full at {t} (in {d})', '≈ Ziel um {t} (in {d})': '≈ target at {t} (in {d})',
  '≈ {lim} erreicht gegen {t} (in {d})': '≈ {lim} reached around {t} (in {d})', 'Reserve': 'Reserve', 'Entladegrenze': 'Discharge limit',
  'Geschätzt mit {c} Kapazität ({src}).': 'Estimated with {c} capacity ({src}).', 'aus dem Verlauf gelernt': 'learned from history',
  'aus der Kartenkonfiguration': 'from the card configuration', 'von der Integration': 'from the integration',
  'Quelle: {s}': 'Source: {s}', 'Modus: {m}': 'Mode: {m}', 'Entladefreigabe aktiv': 'Discharge release active',
  'Ladeziel': 'Target', 'Ladegrenze': 'Charge limit', 'Grenze': 'Limit',
  // Energiefluss
  'Energiefluss': 'Energy flow', 'PV': 'PV', 'Akku': 'Battery', 'Netz': 'Grid', 'Haus': 'House',
  'davon AC {p}': 'incl. AC {p}', 'XT500-PV': 'XT500 PV', 'gesperrt': 'blocked', 'Bezug': 'import', 'Einspeisung': 'export',
  'ausgeglichen': 'balanced', 'kein Zähler': 'no meter', 'Autarkie {p} %': 'Self-sufficiency {p} %',
  // Gesundheit & Check
  'Messwerte': 'Inputs', 'gültig': 'valid', 'ungültig': 'invalid', 'Regelung': 'Control', 'bereit': 'ready', 'nicht bereit': 'not ready',
  'aus': 'off', 'Verbindung': 'Connection', 'stabil': 'stable', 'Wiederherstellung': 'Recovery',
  'Einrichtungs-Check': 'Setup check', 'Alles eingerichtet': 'Everything set up',
  'Alle benötigten Sensoren liefern Werte und die Regelung ist bereit.': 'All required sensors deliver values and control is ready.',
  'Integration öffnen': 'Open integration',
  'Pflicht-Messwerte fehlen': 'Required inputs missing',
  'Sensor nicht verfügbar: {n}': 'Sensor unavailable: {n}',
  'Kein Netzzähler hinterlegt': 'No grid meter configured',
  'Ohne Netzleistung zeigt der Energiefluss das Netz nicht und die Regelung kann nicht auf 0 W regeln.': 'Without grid power the energy flow cannot show the grid and control cannot target 0 W.',
  'Keine Tageswerte hinterlegt': 'No daily energy sensors',
  'Die Tagesbilanz und die Langzeitstatistik bleiben leer.': 'The daily balance and long-term statistics stay empty.',
  'Abfrageintervall {s} s': 'Polling interval {s} s',
  'Für schnelle Rückmeldung empfiehlt die Integration 3 s (Einstellung in SunEnergyXT).': 'For fast feedback the integration recommends 3 s (set in SunEnergyXT).',
  'Energiemanager ist aus': 'Energy manager is off', 'Es werden keine Sollwerte geschrieben.': 'No setpoints are written.',
  'Automatische Wiederherstellung ist aus': 'Automatic recovery is off',
  'Nach einem Schreibfehler muss die Regelung manuell neu gestartet werden.': 'After a write error control has to be restarted manually.',
  'Wiederherstellung braucht Hilfe': 'Recovery needs attention',
  'Kommunikationspause': 'Communication pause', 'Der XT500 antwortet nicht zuverlässig.': 'The XT500 is not responding reliably.',
  '{n} Hinweis(e) zur Einrichtung': '{n} setup note(s)',
  // Vorrang
  'Wer steuert gerade?': 'Who is in control?', 'steuert': 'active',
  'Höhere Stufen haben Vorrang. Ist keine Ladung aktiv, gilt der Grundbetrieb.': 'Higher levels take priority. Without a charge job the base mode applies.',
  'Manuelle Zielladung': 'Manual target charge', 'Zyklusladung': 'Cycle charge', 'Tarifladung': 'Tariff charge', 'Grundbetrieb': 'Base mode',
  'Aktiv · {m} bis {s} %': 'Active · {m} up to {s} %', 'Läuft · {m} bis {s} %': 'Running · {m} up to {s} %',
  'Fällig · Start um {t}': 'Due · starts at {t}', 'Automatik aus': 'Automatic off', 'Nächste {t}': 'Next {t}',
  'Aktiv bis {t}': 'Active until {t}', 'Angefordert': 'Requested', 'Keine Anforderung': 'No request',
  // Heute & Zyklus
  'Heute': 'Today', 'PV-Erzeugung': 'PV generation', 'Ins Haus/Netz abgegeben': 'Delivered to house/grid', 'Netzladung': 'Grid charging', 'Off-Grid': 'Off-grid',
  '{i} Tage': '{i} days', 'läuft gerade': 'running now', 'nächste: {t}': 'next: {t}', 'Vollladung: {s}': 'Full charge: {s}',
  'Jetzt starten': 'Start now', 'Einstellungen': 'Settings', 'Tage auf 0': 'Reset days',
  'Zyklusladung jetzt starten?': 'Start cycle charge now?',
  'Der Akku wird mit „{m}“ auf {s} % geladen und die Vollladung bestätigt.': 'The battery is charged with “{m}” to {s} % and the full charge is confirmed.',
  'Starten': 'Start', 'Zyklustage zurücksetzen?': 'Reset cycle days?',
  'Der Zähler beginnt neu, als wäre der Akku gerade voll geladen worden.': 'The counter restarts as if the battery had just been fully charged.',
  'Zurücksetzen': 'Reset', 'Automatische Zyklusladung': 'Automatic cycle charge',
  'Lädt regelmäßig voll, damit der Akku seinen Ladestand kalibriert.': 'Charges fully at regular intervals so the battery recalibrates its state of charge.',
  'Abstand zwischen zwei Vollladungen.': 'Interval between two full charges.', 'Zu dieser Uhrzeit startet eine fällige Ladung.': 'A due charge starts at this time.',
  'Lademodus der Zyklusladung': 'Cycle charge mode',
  // Steuern
  'Akku-Grenzen': 'Battery limits', 'So weit darf der Akku entladen und geladen werden.': 'How far the battery may discharge and charge.',
  'Darunter entlädt der XT500 nie. Wirkt direkt am Gerät.': 'The XT500 never discharges below this. Applied directly on the device.',
  'Reserve für Stromausfall behalten': 'Keep reserve for power outages', 'Im Netzbetrieb wird zusätzlich nicht unter die Reserve entladen.': 'While on grid the battery also does not discharge below the reserve.',
  'Bleibt für Off-Grid übrig.': 'Kept for off-grid use.', 'Obergrenze, solange keine Zielladung läuft.': 'Upper limit while no target charge runs.',
  'Nach Erreichen der Grenze wird erst ab diesem Abstand wieder entladen.': 'After reaching the limit, discharging resumes only after this margin.',
  'Entladesperre einmal freigeben': 'Release discharge lock once', 'Entladesperre einmalig freigeben?': 'Release the discharge lock once?',
  'Der Akku darf einmalig unter die Wiederfreigabe-Schwelle entladen, bis die reguläre Entladegrenze erneut erreicht ist.': 'The battery may discharge below the release threshold once, until the regular discharge limit is reached again.',
  'Freigeben': 'Release', 'jetzt {s} %': 'now {s} %',
  'Zielladung': 'Target charge', 'Einmalig auf ein Ziel laden. Endet automatisch, wenn das Ziel erreicht ist.': 'Charge once to a target. Ends automatically when the target is reached.',
  'Bei „Netzladung“ der Netzanteil, bei „PV + Netz“ die Gesamtleistung.': 'For “Grid charge” the grid share, for “PV + grid” the total power.',
  'Zielladung beenden ({a} → {b} %)': 'Stop target charge ({a} → {b} %)', 'Auf {s} % laden': 'Charge to {s} %',
  'Für günstige Strompreise: Eine Automation fordert die Ladung an, sie läuft dann zeitlich begrenzt als reine Netzladung.': 'For cheap electricity: an automation requests the charge, which then runs for a limited time as pure grid charging.',
  'Tarifladung anfordern': 'Request tariff charge', 'Danach endet die Anforderung, wenn sie nicht erneuert wird.': 'After this the request ends unless renewed.',
  'Preis-Automation': 'Price automation', 'Keine Automation mit dem XT500-Tarif-Blueprint gefunden.': 'No automation using the XT500 tariff blueprint found.',
  'Automation anlegen': 'Create automation', 'Automation öffnen': 'Open automation', 'aktiv': 'enabled', 'deaktiviert': 'disabled',
  'In der Blueprint-Liste „XT500 – Laden bei günstigem Strompreis“ wählen und „Automation erstellen“ antippen.': 'In the blueprint list choose “XT500 – Laden bei günstigem Strompreis” and tap “Create automation”.',
  'Aus – XT500 regelt selbst': 'Off – XT500 controls itself', 'Grundbetrieb (ohne Ladeauftrag)': 'Base mode (without charge job)',
  'Welche PV soll berücksichtigt werden?': 'Which PV should be used?',
  'PV einspeisen, wenn der Akku voll ist': 'Export PV when the battery is full', 'XT500-PV versorgt dann das Haus, Überschuss darf ins Netz.': 'XT500 PV then supplies the house, surplus may go to the grid.',
  'Energiemanager ausschalten?': 'Switch off energy manager?',
  'Es werden keine Sollwerte mehr geschrieben. Der XT500 behält die zuletzt gesetzten Werte.': 'No more setpoints are written. The XT500 keeps the last values.',
  'Ausschalten': 'Switch off', 'Netz & Wechselrichter': 'Grid & inverter',
  'Auf diesen Wert regelt der Speicher den Netzanschluss (0 = Nulleinspeisung).': 'The battery regulates the grid connection to this value (0 = zero export).',
  'Höchstens so viel gibt der XT500 ins Hausnetz ab.': 'The XT500 delivers at most this much into the house.',
  '{l} – ausgelöst': '{l} – triggered', 'Nicht übernommen: {l}': 'Not applied: {l}', 'Fehler: {e}': 'Error: {e}',
  // Verlauf
  'Ladezustand': 'State of charge', 'Leistung': 'Power', 'lädt …': 'loading …', 'Verlauf konnte nicht geladen werden': 'History could not be loaded',
  ' (+ lädt)': ' (+ charging)', 'Was ist passiert?': 'What happened?', 'Keine Ereignisse im Zeitraum.': 'No events in this period.',
  'Mehr anzeigen': 'Show more', 'Energie': 'Energy', '7 Tage': '7 days', '30 Tage': '30 days', '12 Monate': '12 months',
  'Statistik konnte nicht geladen werden': 'Statistics could not be loaded', 'Vollladungen': 'Full charges',
  'Bestätigte Vollladungen, soweit HA sie im Logbuch aufbewahrt.': 'Confirmed full charges, as far as HA keeps them in the logbook.',
  'laut Zykluszähler (vor {d} Tagen)': 'per cycle counter ({d} days ago)',
  'Noch keine Vollladung im Zeitraum.': 'No full charge in this period yet.', 'Letzter manueller Start: {t}': 'Last manual start: {t}',
  // Ereignistexte
  'Energiemanager eingeschaltet': 'Energy manager switched on', 'Energiemanager ausgeschaltet': 'Energy manager switched off',
  'Entladesperre aktiv': 'Discharge lock active', 'Entladesperre aufgehoben': 'Discharge lock released',
  'Reserve hält Entladung an': 'Reserve stops discharging', 'Reserve wieder frei': 'Reserve released',
  'Messwerte ungültig': 'Inputs invalid', 'Messwerte wieder gültig': 'Inputs valid again',
  'PV-Ausgabe freigegeben': 'PV output released', 'PV-Ausgabe gesperrt': 'PV output blocked',
  'Tarifladung angefordert': 'Tariff charge requested', 'Tarifladung beendet': 'Tariff charge ended',
  'Zielladung gestartet': 'Target charge started', 'Zielladung beendet': 'Target charge ended',
  'Temporäre Entladefreigabe': 'Temporary discharge release', 'Entladefreigabe beendet': 'Discharge release ended',
  'Vorgang: {s}': 'Operation: {s}', 'Zyklus: {s}': 'Cycle: {s}', 'Vollladung: {s}.': 'Full charge: {s}.', 'Status: {s}': 'Status: {s}', 'Wiederherstellung: {s}': 'Recovery: {s}',
  // Technik
  'Regelung live': 'Live control', 'Regelabweichung': 'Control error', 'Regelabstand': 'Control interval', 'Max. Änderung': 'Max. step',
  'Hausverbrauch (geschätzt)': 'House load (estimated)', 'PV-Abregelung': 'PV curtailment', 'Aktive PV': 'Active PV', 'DC-PV-Freigabe': 'DC PV release', 'frei': 'released',
  'Sollwerte': 'Setpoints', 'Was der Energiemanager berechnet und was am Gerät tatsächlich steht.': 'What the energy manager calculates and what is actually set on the device.',
  'berechnet': 'calculated', 'am Gerät': 'on device', 'Netzanschluss': 'Grid connection', 'Wechselrichter-Obergrenze': 'Inverter limit',
  'System-Ladegrenze': 'System charge limit', 'System-Entladegrenze': 'System discharge limit',
  'Diagnose': 'Diagnostics', 'Status': 'Status', 'Kommunikation': 'Communication', 'Abfrageintervall': 'Polling interval',
  'Aktuelle Probleme': 'Current problems', 'Zuletzt behoben {t}': 'Last resolved {t}', 'Automatische Fehlerwiederherstellung': 'Automatic error recovery',
  'Versucht nach Schreibfehlern selbstständig neu zu starten.': 'Tries to restart automatically after write errors.', 'Jetzt neu berechnen': 'Recalculate now',
  'Akkukapazität': 'Battery capacity', 'unbekannt': 'unknown',
  'Feinabstimmung': 'Fine tuning', 'Nur ändern, wenn du weißt, was du tust. Die Standardwerte passen für die meisten Anlagen.': 'Only change these if you know what you are doing. The defaults suit most systems.',
  'Regelgeschwindigkeit': 'Control speed', 'Wie schnell und in welchen Schritten der Sollwert nachgeführt wird.': 'How fast and in which steps the setpoint follows.',
  'PV-Freigabe & Überschuss': 'PV release & surplus', 'Ab wann PV genutzt wird und wie ruhig der Überschussmodus regelt.': 'When PV is used and how calmly surplus mode regulates.',
  'Vollladung bestätigen': 'Confirm full charge', 'Wann eine 100-%-Ladung als abgeschlossen gilt.': 'When a 100 % charge counts as complete.',
  '{n} Werte': '{n} values', '{n} Wert': '{n} value',
  // Zeiten
  'heute {t}': 'today {t}', 'morgen {t}': 'tomorrow {t}', 'gestern {t}': 'yesterday {t}', 'Tag': 'day', 'Tage': 'days',
  // Kompaktkarte & Editor
  'XT500 Energiemanager': 'XT500 energy manager', 'Manager': 'Manager', 'Ziel beim Antippen (z. B. /xt500-neu)': 'Tap target (e.g. /xt500-neu)',
  'Kennzahlen anzeigen': 'Show figures', 'Nicht-Admins nur Anzeige': 'View only for non-admins', 'Akkukapazität in kWh (leer = automatisch)': 'Battery capacity in kWh (empty = automatic)',
  'Erster gefundener': 'First found',
  // Prognose
  'aus dem Energie-Dashboard': 'from the energy dashboard', 'Prognose': 'Forecast', 'Prognose: {x}': 'Forecast: {x}', '{lim} ≈ {t}': '{lim} ≈ {t}',
  'voll ≈ {t}': 'full ≈ {t}', 'Ziel ≈ {t}': 'target ≈ {t}', 'morgen höchstens ≈ {s} %': 'tomorrow at most ≈ {s} %',
  'PV-Prognose': 'PV forecast', 'Rest heute': 'Rest of today', 'Morgen': 'Tomorrow', 'gemessen': 'measured', 'jetzt': 'now',
  'PV-Leistung heute und morgen': 'PV power today and tomorrow',
  'Grob geschätzt aus der PV-Prognose des Energie-Dashboards und dem typischen Hausverbrauch der letzten 48 h.': 'Rough estimate from the energy dashboard’s PV forecast and the typical house load of the last 48 h.',
  'Mittel aus {n} Prognosen.': 'Average of {n} forecasts.',
  'Die Sonne reicht voraussichtlich: ≈ {s} kWh Überschuss, nötig ≈ {n} kWh.': 'Sun should be enough: ≈ {s} kWh surplus, ≈ {n} kWh needed.',
  'Die Sonne reicht voraussichtlich nicht (≈ {s} von {n} kWh).': 'Sun is probably not enough (≈ {s} of {n} kWh).',
  'Mit „PV + Netz“ wäre die Vollladung sicher.': 'With “PV + grid” the full charge would be certain.',
  'Könnte knapp werden: ≈ {s} kWh Überschuss, nötig ≈ {n} kWh.': 'Could be tight: ≈ {s} kWh surplus, ≈ {n} kWh needed.',
};

const t = (s, v) => {
  let r = LANG === 'en' ? (EN[s] ?? s) : s;
  if (v) r = r.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ''));
  return r;
};

// Fallback-Texte für Zustände, falls hass.formatEntityState fehlt (ältere HA-Versionen)
const T = {
  status: {
    invalid_data: 'Eingangsdaten ungültig', communication_pause: 'Kommunikationspause', disabled: 'Energiemanager aus', starting: 'Startprüfung läuft',
    control_error: 'Regelung gestoppt', target_reached: 'Ladeziel erreicht', minimum_soc_hold: 'Entladung gesperrt (Mindest-SoC)', normal: 'Normalbetrieb',
    pv_surplus: 'PV-Überschuss', full_battery_pv_bypass: 'Akku voll – PV-Einspeisung', tariff_grid_charge: 'Tarifladung – Netzladung',
  },
  recovery_status: { ready: 'Bereit', disabled: 'Aus', manual_required: 'Manueller Reset nötig', waiting_inputs: 'Wartet auf Eingangsdaten', waiting_feedback: 'Wartet auf Rückmeldung', waiting_stable: 'Stabilitätswartezeit', attempting: 'Schreibtest läuft', exhausted: 'Versuche ausgeschöpft' },
  mode: { normal: 'Normalbetrieb', grid_charge: 'Netzladung', pv_surplus: 'PV-Überschuss', pv_priority: 'PV-Vorrang', pv_and_grid: 'PV + Netz' },
  active_operation: { normal: 'Normalbetrieb', manual: 'Manuelle Zielladung', cycle_manual: 'Zyklusladung manuell', cycle_automatic: 'Zyklusladung automatisch', tariff: 'Tarifladung' },
  mode_state: { normal: 'Normalbetrieb', charging: 'Lädt', waiting_for_pv: 'Wartet auf PV', target_reached: 'Ziel erreicht', minimum_soc_hold: 'Entladung gesperrt' },
  active_energy_source: { none: 'Keine Ladung', pv: 'PV', grid: 'Netz', pv_and_grid: 'PV + Netz' },
  active_coupling_mode: { none: 'Keine', dc: 'XT500-PV', ac: 'Externe AC-PV', hybrid: 'XT500-PV + externe AC-PV' },
  control_band: { small: 'Fein', medium: 'Mittel', large: 'Schnell' },
  full_charge_confirmation: { idle: 'Inaktiv', holding: '100 % werden gehalten', waiting_taper: 'Wartet auf Ladeende', confirmed: 'Durch Ladeende bestätigt', timeout: 'Nach Zeitlimit beendet' },
  cycle_state: { monitoring_disabled: 'Automatische Überwachung aus', monitoring: 'Automatische Überwachung aktiv', due_waiting: 'Fällig – wartet auf tägliche Prüfzeit', manual_active: 'Zyklusladung läuft – manuell', automatic_active: 'Zyklusladung läuft – automatisch', confirming_full: '100-%-Vollladung wird bestätigt', paused: 'Zyklusladung angehalten' },
};
const FALLBACK_GROUP = { selected_mode: 'mode', active_mode: 'mode', manual_mode: 'mode', automatic_mode: 'mode', base_mode: 'mode' };

const CHARGE_MODES = [
  { v: 'pv_surplus', icon: 'mdi:solar-power-variant-outline', label: ['PV-Überschuss', 'PV surplus'], desc: ['Nur was die PV übrig hat. Wartet notfalls mehrere Tage auf Sonne.', 'Only what PV has left over. Waits for sun for days if needed.'] },
  { v: 'pv_priority', icon: 'mdi:white-balance-sunny', label: ['PV-Vorrang', 'PV priority'], desc: ['Nur PV, der Akku entlädt solange nicht. Kein Netzbezug.', 'PV only, the battery does not discharge meanwhile. No grid import.'] },
  { v: 'pv_and_grid', icon: 'mdi:solar-power', label: ['PV + Netz', 'PV + grid'], desc: ['Feste Gesamtleistung. Was die PV nicht schafft, kommt aus dem Netz.', 'Fixed total power. Whatever PV cannot deliver comes from the grid.'] },
  { v: 'grid_charge', icon: 'mdi:transmission-tower-import', label: ['Netzladung', 'Grid charge'], desc: ['Feste Leistung aus dem Netz. AC-PV-Überschuss kommt obendrauf.', 'Fixed power from the grid. AC PV surplus is added on top.'] },
];
const BASE_MODES = [
  { v: 'normal', icon: 'mdi:home-lightning-bolt-outline', label: ['Normalbetrieb', 'Normal'], desc: ['Akku deckt den Hausverbrauch und hält das Netz am Zielwert.', 'Battery covers the house load and keeps the grid at its target.'] },
  { v: 'pv_surplus', icon: 'mdi:solar-power-variant-outline', label: ['PV-Überschuss', 'PV surplus'], desc: ['Akku speichert nur PV-Überschuss und entlädt nicht ins Haus.', 'Battery only stores PV surplus and does not discharge into the house.'] },
];
const COUPLING_MODES = [
  { v: 'automatic', icon: 'mdi:solar-panel-large', label: ['Hybrid', 'Hybrid'], desc: ['XT500-PV und AC-PV-Überschuss (empfohlen).', 'XT500 PV and AC PV surplus (recommended).'] },
  { v: 'dc', icon: 'mdi:solar-panel', label: ['Nur XT500-PV', 'XT500 PV only'], desc: ['Nur die direkt am XT500 angeschlossenen Module.', 'Only modules connected directly to the XT500.'] },
  { v: 'ac', icon: 'mdi:solar-power-variant', label: ['Nur AC-PV', 'AC PV only'], desc: ['Nur der am Netzanschluss erkannte AC-PV-Überschuss.', 'Only the AC PV surplus detected at the grid connection.'] },
];
const L2 = (pair) => pair[LANG === 'en' ? 1 : 0];

const LABELS = {
  target_soc: ['Ladeziel', 'Target'], charge_power: ['Ladeleistung', 'Charge power'], automatic_target_soc: ['Ladeziel der Vollladung', 'Full charge target'],
  cycle_interval_days: ['Vollladung alle', 'Full charge every'], cycle_check_time: ['Tägliche Prüfzeit', 'Daily check time'], tariff_target_soc: ['Ladeziel', 'Target'],
  tariff_charge_power: ['Netzleistung', 'Grid power'], tariff_request_duration: ['Gültigkeit je Anforderung', 'Validity per request'], minimum_soc: ['Entladegrenze', 'Discharge limit'],
  reserve_soc: ['Reserve für Stromausfall', 'Backup reserve'], normal_charge_limit: ['Ladelimit im Normalbetrieb', 'Normal charge limit'], soc_hysteresis: ['Wiederfreigabe nach Entladegrenze', 'Release margin after discharge limit'],
  target_grid_power: ['Zielwert am Netz', 'Grid target'], maximum_grid_output: ['Max. Leistung ins Hausnetz', 'Max. output to house'], maximum_inverter_output: ['Max. Wechselrichterleistung', 'Max. inverter power'],
  control_small_error: ['Grenze fein → mittel', 'Threshold fine → medium'], control_large_error: ['Grenze mittel → schnell', 'Threshold medium → fast'], control_slow_interval: ['Abstand fein', 'Interval fine'],
  control_medium_interval: ['Abstand mittel', 'Interval medium'], control_fast_interval: ['Abstand schnell', 'Interval fast'], control_small_max_step: ['Max. Schritt fein', 'Max. step fine'],
  control_medium_max_step: ['Max. Schritt mittel', 'Max. step medium'], control_large_max_step: ['Max. Schritt schnell', 'Max. step fast'], feedback_settle_time: ['Wartezeit auf Rückmeldung', 'Feedback settle time'],
  pv_start_power: ['PV-Startleistung', 'PV start power'], pv_stop_power: ['PV-Abschaltschwelle', 'PV stop threshold'], pv_start_delay: ['Verzögerung der PV-Freigabe', 'PV release delay'],
  pv_surplus_deadband: ['Totzone Einspeisung', 'Export deadband'], pv_surplus_charge_reserve: ['Bevorzugte Akkuladung', 'Preferred battery charge'],
  full_charge_min_hold_minutes: ['Haltezeit bei 100 %', 'Hold time at 100 %'], full_charge_taper_power: ['Ladeende-Schwelle', 'Taper threshold'], full_charge_taper_minutes: ['Bestätigung unter Schwelle', 'Confirmation below threshold'],
  full_charge_timeout_minutes: ['Max. Bestätigungszeit', 'Max. confirmation time'], full_charge_top_off_power: ['Max. Nachladeleistung bei 100 %', 'Max. top-off power at 100 %'], charge_soc_hysteresis: ['Lade-Hysterese am Gerät', 'Device charge hysteresis'],
  recovery_stability_time: ['Stabilitätszeit vor Wiederherstellung', 'Stability time before recovery'],
  regulation_enabled: ['Energiemanager', 'Energy manager'], manual_active: ['Zielladung', 'Target charge'], manual_mode: ['Lademodus', 'Charge mode'], automatic_mode: ['Lademodus der Zyklusladung', 'Cycle charge mode'],
  base_mode: ['Grundbetrieb', 'Base mode'], coupling_mode: ['PV-Berücksichtigung', 'PV source'], reserve_enabled: ['Reserve', 'Reserve'], tariff_active: ['Tarifladung', 'Tariff charge'],
  automatic_enabled: ['Automatische Zyklusladung', 'Automatic cycle charge'], full_battery_pv_export: ['PV-Einspeisung bei vollem Akku', 'PV export when full'], automatic_recovery_enabled: ['Automatische Wiederherstellung', 'Automatic recovery'],
};

// Ausführliche Erklärungen hinter den (?)-Knöpfen
const HELP = {
  minimum_soc: ['Die Entladegrenze ist die originale System-Entladegrenze des XT500. Änderungen hier und in SunEnergyXT sind identisch. Ist sie erreicht, bleibt das Entladen gesperrt, bis die Grenze plus Wiederfreigabe überschritten ist.', 'This is the XT500’s own system discharge limit; changing it here or in SunEnergyXT is the same. Once reached, discharging stays blocked until limit plus release margin is exceeded.'],
  reserve_soc: ['Die Reserve hält im Netzbetrieb zusätzliche Energie für einen Stromausfall zurück. Eine höhere Reserve startet keine zusätzliche Netzladung.', 'The reserve keeps extra energy for a power outage while on grid. A higher reserve does not start extra grid charging.'],
  reserve_enabled: ['Ist der Schalter an, entlädt der Akku im Netzbetrieb nicht unter die Reserve. Im Off-Grid-Fall steht der Rest dann zur Verfügung.', 'When on, the battery does not discharge below the reserve while on grid; the remainder is available off-grid.'],
  normal_charge_limit: ['Das Ladelimit wird mit der System-Ladegrenze des Geräts synchronisiert. Während einer Ziel-, Zyklus- oder Tarifladung nutzt der Energiemanager die Gerätegrenze vorübergehend selbst und stellt das Limit danach wieder her.', 'The limit is synchronised with the device’s system charge limit. During a target, cycle or tariff charge the manager uses the device limit itself and restores this value afterwards.'],
  soc_hysteresis: ['Verhindert ständiges Ein- und Ausschalten an der Entladegrenze: Erst wenn der Ladestand um diesen Wert über der Grenze liegt, wird wieder entladen.', 'Prevents toggling at the discharge limit: discharging resumes only once the state of charge is this much above the limit.'],
  target_soc: ['Bis zu diesem Ladestand lädt die manuelle Zielladung. Danach endet sie automatisch.', 'The manual target charge charges up to this level and then ends automatically.'],
  charge_power: ['Bei „Netzladung“ ist das der gewünschte Anteil aus dem Netz, AC-PV kann zusätzlich laden. Bei „PV + Netz“ ist es die gesamte Ladeleistung; nur der fehlende Teil kommt aus dem Netz.', 'For “Grid charge” this is the desired grid share; AC PV may add to it. For “PV + grid” it is the total charge power; only the missing part comes from the grid.'],
  cycle_interval_days: ['Nach so vielen Tagen ohne Vollladung wird eine Zyklusladung fällig. Eine regelmäßige Vollladung hält die Ladestandsanzeige des Akkus genau.', 'After this many days without a full charge, a cycle charge becomes due. Regular full charges keep the battery’s state of charge accurate.'],
  automatic_target_soc: ['Ziel der automatischen Zyklusladung. Bei 100 % bestätigt der Energiemanager die Vollladung über Haltezeit und Ladeende-Schwelle.', 'Target of the automatic cycle charge. At 100 % the manager confirms the full charge via hold time and taper threshold.'],
  tariff_active: ['Eine Automation (z. B. aus dem mitgelieferten Blueprint) schaltet diese Anforderung bei günstigem Preis ein. Die Tarifladung ist reine Netzladung und läuft nur für die eingestellte Gültigkeitsdauer.', 'An automation (e.g. from the bundled blueprint) switches this request on at low prices. Tariff charging is pure grid charging and only lasts for the configured validity.'],
  tariff_request_duration: ['Wird die Anforderung innerhalb dieser Zeit nicht erneuert, endet sie automatisch. So bleibt keine Netzladung hängen, wenn die Automation ausfällt.', 'If the request is not renewed within this time it ends automatically, so grid charging cannot get stuck if the automation fails.'],
  target_grid_power: ['Der Speicher regelt den Netzanschluss auf diesen Wert. 0 W bedeutet Nulleinspeisung; ein kleiner positiver Wert sorgt für etwas Sicherheitsbezug.', 'The battery regulates the grid connection to this value. 0 W means zero export; a small positive value keeps a little safety import.'],
  maximum_grid_output: ['Begrenzt, wie viel der XT500 ins Hausnetz abgibt. Die Netzladung wird dadurch nicht begrenzt.', 'Limits how much the XT500 delivers into the house. Grid charging is not limited by this.'],
  full_battery_pv_export: ['Ist der Akku an der Ladegrenze, folgt der XT500 der PV-Erzeugung: Das Haus wird versorgt, Überschuss darf ins Netz. Reicht die PV nicht, gilt wieder der Grundbetrieb.', 'When the battery is at its charge limit, the XT500 follows PV generation: the house is supplied and surplus may go to the grid. If PV is not enough, base mode applies again.'],
  pv_surplus_deadband: ['Beruhigt kleine Schwankungen am Netzanschluss im PV-Überschussmodus. Für gemessene Akkuentladung gilt keine Totzone.', 'Damps small fluctuations at the grid connection in PV surplus mode. Measured battery discharge has no deadband.'],
  pv_surplus_charge_reserve: ['Gewünschte Netto-Ladeleistung im PV-Überschussmodus. Damit wird Laden gegenüber Entladen bevorzugt und Pendeln um 0 W vermieden.', 'Desired net charge power in PV surplus mode. It favours charging over discharging and avoids oscillating around 0 W.'],
  cycle_check_time: ['Ist eine Zyklusladung fällig, startet sie täglich zu dieser Uhrzeit.', 'If a cycle charge is due, it starts at this time each day.'],
};

// ---------- Helfer ----------

const h = (tag, props, ...kids) => {
  const [tg, ...cls] = tag.split('.');
  const el = document.createElement(tg || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
};
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
const icon = (name) => { const i = document.createElement('ha-icon'); i.icon = name; i.setAttribute('icon', name); return i; };
const BAD = new Set(['unknown', 'unavailable', '', undefined, null]);
const num = (so) => { if (!so || BAD.has(so.state)) return null; const v = parseFloat(so.state); return Number.isFinite(v) ? v : null; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (v, d = 0) => (v == null ? '—' : new Intl.NumberFormat(NUMLOC, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v));
const fmtW = (w) => (w == null ? '—' : Math.abs(w) >= 1000 ? fmt(w / 1000, 2) + '\u00a0kW' : fmt(w, 0) + '\u00a0W');
const fmtKWh = (v) => (v == null ? '—' : fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : 2) + '\u00a0kWh');
const fmtUnit = (v, unit, step) => {
  if (v == null) return '—';
  const d = step && step < 1 ? String(step).split('.')[1].length : 0;
  if (unit === 'W') return fmtW(v);
  const u = unit === 'd' ? t(v === 1 ? 'Tag' : 'Tage') : unit ?? '';
  return fmt(v, d) + (u ? '\u00a0' + u : '');
};
const fmtTime = (d) => d.toLocaleTimeString(NUMLOC, { hour: '2-digit', minute: '2-digit' });
const fmtDateTime = (iso) => {
  if (!iso || BAD.has(iso)) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d)) return '—';
  const day = (o) => { const x = new Date(); x.setDate(x.getDate() + o); return x.toDateString(); };
  if (d.toDateString() === day(0)) return t('heute {t}', { t: fmtTime(d) });
  if (d.toDateString() === day(1)) return t('morgen {t}', { t: fmtTime(d) });
  if (d.toDateString() === day(-1)) return t('gestern {t}', { t: fmtTime(d) });
  return d.toLocaleDateString(NUMLOC, { weekday: 'short', day: 'numeric', month: 'numeric' }) + ' ' + fmtTime(d);
};
const fmtDur = (min) => (min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)}:${String(Math.round(min % 60) % 60).padStart(2, '0')} h`);
const shortTime = (s) => (s && !BAD.has(s) ? s.slice(0, 5) : '—');
const navigate = (path) => { window.history.pushState(null, '', path); window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } })); };
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privater Modus */ } },
};
// Achsen mit runden Werten
const niceStep = (span, n = 4) => {
  const raw = span / n, mag = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
};

// ---------- Kontext ----------

function findManagers(hass) {
  const managers = new Map();
  for (const [id, so] of Object.entries(hass.states)) {
    if (so.attributes.integration !== DOMAIN) continue;
    const m = so.attributes.xt500_manager_id || 'default';
    if (!managers.has(m)) managers.set(m, {});
    managers.get(m)[so.attributes.xt500_key] = id;
  }
  return managers;
}

const managerName = (hass, ids, fallback) => (hass.states[ids.status]?.attributes?.friendly_name || fallback).replace(/\s*(Energiemanager|energy manager).*$/i, '').trim() || fallback;

function makeCtx(card) {
  const ctx = {
    get hass() { return card._hass; },
    get ro() { return card._ro; },
    get config() { return card._config || {}; },
    get managerId() { return card._manager; },
    id: (key) => card._ids[key],
    has: (key) => !!card._ids[key] && !!card._hass.states[card._ids[key]],
    s: (key) => card._hass.states[card._ids[key]],
    st: (key) => card._hass.states[card._ids[key]]?.state,
    n: (key) => num(card._hass.states[card._ids[key]]),
    on: (key) => card._hass.states[card._ids[key]]?.state === 'on',
    attr: (key, a) => card._hass.states[card._ids[key]]?.attributes?.[a],
    srcId: (name) => card._hass.states[card._ids.status]?.attributes?.[`source_${name}_entity`] || null,
    src: (name) => { const id = ctx.srcId(name); return id ? card._hass.states[id] : undefined; },
    hasSrc: (name) => !!ctx.srcId(name),
    srcN: (name) => num(ctx.src(name)),
    label: (key) => (LABELS[key] ? L2(LABELS[key]) : (ctx.attr(key, 'friendly_name') || key).replace(/^.*?(Energiemanager|energy manager)\s+/i, '')),
    // Zustand in Klartext – bevorzugt mit den Übersetzungen der Integration aus HA
    sl: (key, value) => {
      const so = ctx.s(key);
      const v = value ?? so?.state;
      if (v == null || BAD.has(v)) return '—';
      if (so && card._hass.formatEntityState) { try { return card._hass.formatEntityState(so, v); } catch { /* Fallback */ } }
      return T[FALLBACK_GROUP[key] || key]?.[v] ?? v;
    },
    call: (domain, service, data) => card._call(domain, service, data),
    set: (key, value) => card._set(key, value),
    moreInfo: (entityId) => card._moreInfo(entityId),
    toast: (msg, bad) => card._toast(msg, bad),
    confirm: (opts) => card._confirm(opts),
    help: (key, title) => card._help(key, title),
    go: (tab) => card._setTab?.(tab),
    watch: (fn) => { card._updaters.push(fn); try { fn(); } catch (e) { console.error(e); } },
    cleanup: (f) => card._cleanups.push(f),
    kick: () => card._update(),
    cache: card._cache,
  };
  return ctx;
}

// Leistungswerte: + Bezug / Entladung, − Einspeisung / Ladung
function powers(ctx) {
  const dc = ctx.hasSrc('pv_power') ? Math.max(0, ctx.srcN('pv_power') ?? 0) : null;
  const ac = ctx.st('selected_coupling_mode') !== 'dc' && ctx.has('ac_pv_power') ? Math.max(0, ctx.n('ac_pv_power') ?? 0) : 0;
  const charge = ctx.n('battery_charge_power') ?? 0;
  const discharge = ctx.n('battery_discharge_power') ?? 0;
  const grid = ctx.hasSrc('public_grid_power') ? ctx.srcN('public_grid_power') : null;
  const solar = dc == null && !ac ? null : (dc ?? 0) + ac;
  const home = ctx.n('estimated_home_load') ?? Math.max(0, (solar ?? 0) + (grid ?? 0) + discharge - charge);
  return { dc, ac, solar, charge, discharge, batt: discharge - charge, grid, home, soc: ctx.srcN('soc') };
}

function targetInfo(ctx) {
  const active = ctx.n('active_target_soc');
  if (active != null) return { soc: active, label: t('Ladeziel') };
  return { soc: ctx.n('desired_charge_limit') ?? ctx.n('normal_charge_limit') ?? 100, label: t('Ladegrenze') };
}

const floorInfo = (ctx) => {
  const min = ctx.n('minimum_soc') ?? 0;
  if (ctx.on('reserve_enabled') && (ctx.n('reserve_soc') ?? 0) > min) return { soc: ctx.n('reserve_soc'), label: t('Reserve'), reserve: true };
  return { soc: min, label: t('Entladegrenze'), reserve: false };
};

// ---------- Akkukapazität ----------

// Reihenfolge: Kartenkonfiguration → Attribut der Integration → aus dem Verlauf gelernt
function capacity(ctx) {
  if (ctx.config.capacity_kwh) return { kwh: Number(ctx.config.capacity_kwh), src: t('aus der Kartenkonfiguration') };
  const a = ctx.s('status')?.attributes || {};
  if (a.battery_capacity_kwh) return { kwh: Number(a.battery_capacity_kwh), src: t('von der Integration') };
  if (a.battery_capacity_wh) return { kwh: Number(a.battery_capacity_wh) / 1000, src: t('von der Integration') };
  if (ctx.cache.prefsCap) return { kwh: ctx.cache.prefsCap, src: t('aus dem Energie-Dashboard') };
  const c = store.get(`xt500-energy-cap-${ctx.managerId}`);
  return c?.kwh ? { kwh: c.kwh, src: t('aus dem Verlauf gelernt') } : null;
}

// Kapazität aus geladener/entladener Energie je SoC-Änderung der letzten 36 h
async function learnCapacity(ctx) {
  const key = `xt500-energy-cap-${ctx.managerId}`;
  const c = store.get(key);
  if (ctx.config.capacity_kwh || (c && Date.now() - c.at < 12 * 3600e3) || ctx.cache.capBusy) return;
  const socId = ctx.srcId('soc'), pId = ctx.srcId('battery_power');
  if (!socId || !pId || !ctx.hass.callWS) return;
  ctx.cache.capBusy = true;
  try {
    const end = new Date(), start = new Date(end - 36 * 3600e3);
    const res = await ctx.hass.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: [socId, pId], minimal_response: true, no_attributes: true, significant_changes_only: false });
    const pts = (id) => (res[id] || []).map((p) => [(p.lu ?? p.lc) * 1000, parseFloat(p.s)]).filter((p) => Number.isFinite(p[1]));
    const soc = pts(socId), pw = pts(pId);
    if (soc.length < 3 || pw.length < 3) return;
    // Energie zwischen zwei Zeitpunkten in Wh (Gerätesensor: + Laden)
    const energy = (a, b) => {
      let e = 0;
      for (let i = 0; i < pw.length; i++) {
        const t0 = Math.max(a, pw[i][0]), t1 = Math.min(b, pw[i + 1]?.[0] ?? b);
        if (t1 > t0) e += pw[i][1] * (t1 - t0) / 3600e3;
      }
      return e;
    };
    const ratios = [];
    let anchor = soc[0];
    for (const p of soc) {
      const d = p[1] - anchor[1];
      if (Math.abs(d) >= 8) {
        const r = energy(anchor[0], p[0]) / (d / 100) / 1000;
        if (r > 0.3 && r < 40) ratios.push(r);
        anchor = p;
      }
    }
    if (ratios.length) {
      ratios.sort((x, y) => x - y);
      store.set(key, { kwh: Math.round(ratios[Math.floor(ratios.length / 2)] * 100) / 100, at: Date.now(), n: ratios.length });
      ctx.kick();
    }
  } catch (e) { console.warn('xt500-energy: Kapazität nicht ermittelbar', e); }
  finally { ctx.cache.capBusy = false; }
}

function eta(ctx) {
  const cap = capacity(ctx);
  const p = powers(ctx);
  if (!cap || p.soc == null) return null;
  if (p.charge > 50) {
    const tg = targetInfo(ctx);
    const kwh = ((tg.soc - p.soc) / 100) * cap.kwh;
    const min = (kwh * 1000 / p.charge) * 60;
    if (kwh <= 0 || min > 12 * 60) return null;
    return { text: t(tg.soc >= 100 ? '≈ voll um {t} (in {d})' : '≈ Ziel um {t} (in {d})', { t: fmtTime(new Date(Date.now() + min * 60e3)), d: fmtDur(min) }), cap };
  }
  if (p.discharge > 50) {
    const fl = floorInfo(ctx);
    const kwh = ((p.soc - fl.soc) / 100) * cap.kwh;
    const min = (kwh * 1000 / p.discharge) * 60;
    if (kwh <= 0 || min > 12 * 60) return null;
    return { text: t('≈ {lim} erreicht gegen {t} (in {d})', { lim: fl.label, t: fmtTime(new Date(Date.now() + min * 60e3)), d: fmtDur(min) }), cap };
  }
  return null;
}

// ---------- Prognose (aus dem Energie-Dashboard von HA) ----------

// Akkukapazität und PV-Prognose-Dienste stehen in den Energie-Einstellungen
function energyPrefs(ctx) {
  if (!ctx.cache.prefs) {
    ctx.cache.prefs = ctx.hass.callWS({ type: 'energy/get_prefs' }).then((prefs) => {
      const bats = (prefs?.energy_sources || []).filter((s) => s.type === 'battery' && Number(s.capacity) > 0);
      const bat = bats.find((s) => s.stat_soc === ctx.srcId('soc')) || (bats.length === 1 ? bats[0] : null);
      if (bat) ctx.cache.prefsCap = Number(bat.capacity);
      return prefs;
    }).catch(() => null);
  }
  return ctx.cache.prefs;
}

const dayStart = (offset = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return +d; };

// Lädt Prognose und typischen Hausverbrauch; Ergebnis bleibt 30 min im Speicher
function loadForecast(ctx) {
  const c = ctx.cache;
  if (c.fc && Date.now() - c.fc.at < 30 * 60e3) return Promise.resolve(c.fc);
  if (c.fcBusy) return c.fcBusy;
  c.fcBusy = (async () => {
    const prefs = await energyPrefs(ctx);
    const sources = (prefs?.energy_sources || []).filter((s) => s.type === 'solar' && s.config_entry_solar_forecast?.length);
    if (!sources.length) return (c.fc = { at: Date.now(), none: true });
    const raw = await ctx.hass.callWS({ type: 'energy/solar_forecast' });
    const wh = new Map();
    let used = 0;
    // Mehrere Prognosen für dieselbe Anlage werden gemittelt, verschiedene Anlagen addiert
    for (const s of sources) {
      const ids = s.config_entry_solar_forecast.filter((id) => raw?.[id]?.wh_hours && Object.keys(raw[id].wh_hours).length);
      used += ids.length;
      for (const id of ids) for (const [iso, v] of Object.entries(raw[id].wh_hours)) {
        const tm = +new Date(iso);
        wh.set(tm, (wh.get(tm) || 0) + v / ids.length);
      }
    }
    if (!wh.size) return (c.fc = { at: Date.now(), none: true });
    const starts = [...wh.keys()].sort((a, b) => a - b);
    const periods = starts.map((s, i) => { const e = starts[i + 1] ?? s + 3600e3; return { s, e: Math.min(e, s + 3600e3 * 3), wh: wh.get(s), w: wh.get(s) / ((Math.min(e, s + 3600e3 * 3) - s) / 3600e3) }; });
    // Typischer Hausverbrauch je Stunde aus den letzten 48 h
    const profile = new Array(24).fill(null);
    const homeId = ctx.id('estimated_home_load');
    if (homeId) {
      try {
        const end = new Date(), start = new Date(end - 48 * 3600e3);
        const res = await ctx.hass.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: [homeId], minimal_response: true, no_attributes: true, significant_changes_only: false });
        const sum = new Array(24).fill(0), cnt = new Array(24).fill(0);
        for (const p of res[homeId] || []) { const v = parseFloat(p.s); if (!Number.isFinite(v)) continue; const hr = new Date((p.lu ?? p.lc) * 1000).getHours(); sum[hr] += v; cnt[hr]++; }
        sum.forEach((s, i) => { if (cnt[i]) profile[i] = s / cnt[i]; });
      } catch { /* ohne Profil wird der aktuelle Verbrauch genutzt */ }
    }
    return (c.fc = { at: Date.now(), periods, used, profile });
  })().catch((e) => { console.warn('xt500-energy: Prognose nicht verfügbar', e); return (c.fc = { at: Date.now(), none: true }); })
    .finally(() => { c.fcBusy = null; });
  return c.fcBusy;
}

const pvAt = (fc, tm) => fc.periods.find((p) => tm >= p.s && tm < p.e)?.w ?? 0;
const fcEnergy = (fc, a, b) => fc.periods.reduce((sum, p) => sum + p.wh * Math.max(0, Math.min(b, p.e) - Math.max(a, p.s)) / (p.e - p.s), 0) / 1000;

// Grobe Vorausrechnung des Ladestands bis morgen Abend in 15-min-Schritten
function simulate(ctx) {
  const fc = ctx.cache.fc;
  const cap = capacity(ctx);
  const p = powers(ctx);
  if (!fc || fc.none || !cap || p.soc == null) return null;
  const floor = floorInfo(ctx), ceil = targetInfo(ctx).soc;
  const noDischarge = ctx.st('base_mode') === 'pv_surplus' || !ctx.on('regulation_enabled');
  const maxOut = ctx.n('maximum_grid_output') ?? 800, maxIn = Math.max(ctx.n('charge_power') ?? 1500, 1500), eff = 0.92;
  const step = 15 * 60e3, end = dayStart(2);
  let soc = p.soc, tm = Date.now();
  const pts = [[tm, soc]];
  let floorAt = null, fullAt = null, maxSoc = soc, maxAt = tm;
  while (tm < end) {
    const load = fc.profile[new Date(tm).getHours()] ?? p.home ?? 300;
    const net = pvAt(fc, tm) - load;
    let e = 0; // Wh in den Akku (+) oder heraus (−)
    if (net > 0 && soc < ceil) e = Math.min(net, maxIn) * eff * (step / 3600e3);
    else if (net < 0 && !noDischarge && soc > floor.soc) e = -Math.min(-net, maxOut) / eff * (step / 3600e3);
    soc = clamp(soc + (e / 1000 / cap.kwh) * 100, Math.min(floor.soc, soc), Math.max(ceil, soc));
    tm += step;
    pts.push([tm, soc]);
    if (!floorAt && e < 0 && soc <= floor.soc + 0.5) floorAt = tm;
    if (!fullAt && e > 0 && soc >= ceil - 0.5) fullAt = tm;
    if (tm > dayStart(1) && soc > maxSoc) { maxSoc = soc; maxAt = tm; }
  }
  return { pts, floorAt, fullAt, maxSoc, maxAt, floor, ceil, cap };
}

function forecastSummary(ctx) {
  const sim = simulate(ctx);
  if (!sim) return null;
  const at = (tm) => fmtDateTime(new Date(tm));
  const parts = [];
  if (sim.floorAt && (!sim.fullAt || sim.floorAt < sim.fullAt)) parts.push(t('{lim} ≈ {t}', { lim: sim.floor.label, t: at(sim.floorAt) }));
  if (sim.fullAt) parts.push(t(sim.ceil >= 100 ? 'voll ≈ {t}' : 'Ziel ≈ {t}', { t: at(sim.fullAt) }));
  else parts.push(t('morgen höchstens ≈ {s} %', { s: fmt(sim.maxSoc) }));
  return { text: t('Prognose: {x}', { x: parts.join(' · ') }), sim };
}

// Reicht die Sonne für die nächste Zyklusladung?
function cycleOutlook(ctx) {
  const fc = ctx.cache.fc, cap = capacity(ctx);
  if (!fc || fc.none || !cap || !ctx.has('cycle_state')) return null;
  const mode = ctx.st('automatic_mode');
  if (mode === 'grid_charge') return null;
  const running = ctx.on('cycle_charge_active');
  const next = new Date(ctx.st('next_cycle_at'));
  const startT = running ? Date.now() : ctx.on('cycle_due') || isNaN(next) ? null : +next;
  let from = startT;
  if (!from && ctx.on('cycle_due')) {
    const [hh, mm] = (ctx.st('cycle_check_time') || '09:00').split(':').map(Number);
    const d = new Date(); d.setHours(hh, mm, 0, 0); if (+d < Date.now()) d.setDate(d.getDate() + 1);
    from = +d;
  }
  if (!from || from - Date.now() > 36 * 3600e3) return null;
  const until = new Date(from); until.setHours(23, 59, 0, 0);
  const sim = simulate(ctx);
  const socAt = running ? powers(ctx).soc : sim?.pts.find(([tm]) => tm >= from)?.[1] ?? powers(ctx).soc;
  const need = Math.max(0, ((ctx.n('automatic_target_soc') ?? 100) - socAt) / 100) * cap.kwh;
  let surplus = 0;
  for (let tm = from; tm < +until; tm += 15 * 60e3) surplus += Math.max(0, pvAt(fc, tm) - (fc.profile[new Date(tm).getHours()] ?? 300)) * 0.25 / 1000;
  const v = { s: fmt(surplus, 1), n: fmt(need, 1) };
  const hint = mode !== 'pv_and_grid' ? ' ' + t('Mit „PV + Netz“ wäre die Vollladung sicher.') : '';
  if (surplus >= need * 1.2) return { ok: true, text: t('Die Sonne reicht voraussichtlich: ≈ {s} kWh Überschuss, nötig ≈ {n} kWh.', v) };
  if (surplus >= need * 0.8) return { ok: false, text: t('Könnte knapp werden: ≈ {s} kWh Überschuss, nötig ≈ {n} kWh.', v) + hint };
  return { ok: false, text: t('Die Sonne reicht voraussichtlich nicht (≈ {s} von {n} kWh).', v) + hint };
}

// Ein Satz, der erklärt, was gerade passiert
function describe(ctx) {
  const status = ctx.st('status');
  const p = powers(ctx);
  const sa = ctx.s('status')?.attributes || {};
  const target = targetInfo(ctx);
  if (status === 'disabled' || (ctx.has('regulation_enabled') && !ctx.on('regulation_enabled'))) return { tone: 'muted', title: t('Energiemanager ist ausgeschaltet'), text: t('Der XT500 arbeitet mit seinen eigenen Einstellungen. Es werden keine Sollwerte geschrieben.') };
  if (status === 'invalid_data') {
    const errs = (sa.current_input_errors || []).map((e) => `${e.input}: ${e.reason}.`).join(' ');
    return { tone: 'danger', title: t('Es fehlen Messwerte'), text: (errs || t('Mindestens ein Pflichtsensor liefert keinen gültigen Wert.')) + ' ' + t('Die Regelung pausiert, bis wieder alles gültig ist.') };
  }
  if (status === 'communication_pause') return { tone: 'warn', title: t('Verbindung zum XT500 wird geprüft'), text: sa.communication_pause_message || t('Der Speicher antwortet gerade nicht zuverlässig. Schreibvorgänge sind pausiert.') };
  if (status === 'control_error') return { tone: 'danger', title: t('Regelung wurde gestoppt'), text: t('Ein Sollwert ließ sich nicht schreiben. Wiederherstellung: {r}.', { r: ctx.sl('recovery_status') }) };
  if (status === 'starting') return { tone: 'info', title: t('Startprüfung läuft'), text: t('Der Energiemanager prüft Messwerte und Rückmeldungen, bevor er regelt.') };

  const op = ctx.st('active_operation');
  const opText = op && op !== 'normal' ? ctx.sl('active_operation') : null;
  if (p.charge > 15) {
    const srcKey = ctx.st('active_energy_source');
    const src = srcKey && srcKey !== 'none' && !BAD.has(srcKey) ? ctx.sl('active_energy_source') : t('PV');
    const why = opText ? t('{op} bis {soc} %', { op: opText, soc: fmt(target.soc) }) : t('Ladegrenze {soc} %', { soc: fmt(target.soc) });
    return { tone: 'ok', title: t('Akku lädt mit {p} aus {src}', { p: fmtW(p.charge), src }), text: `${why}. ${ctx.sl('status')}.` };
  }
  if (status === 'full_battery_pv_bypass') return { tone: 'ok', title: t('Akku ist voll – PV geht ins Haus'), text: t('Die direkt angeschlossene PV versorgt das Haus, Überschuss darf ins Netz.') };
  if (p.discharge > 15) return { tone: 'ok', title: t('Akku versorgt das Haus mit {p}', { p: fmtW(p.discharge) }), text: t('Der Netzbezug wird auf {g} gehalten. Entladegrenze {m} %.', { g: fmtW(ctx.n('target_grid_power') ?? 0), m: fmt(ctx.n('minimum_soc')) }) };
  if (ctx.on('reserve_hold')) return { tone: 'info', title: t('Akku hält die Notstrom-Reserve'), text: t('Unter {r} % wird nicht entladen. Freigabe wieder ab {f} %.', { r: fmt(ctx.n('reserve_soc')), f: fmt(ctx.n('reserve_release_soc')) }) };
  if (ctx.on('discharge_hold') || status === 'minimum_soc_hold') return { tone: 'info', title: t('Akku ist an der Entladegrenze'), text: t('Entladen ist gesperrt, bis {s} % erreicht sind.', { s: fmt((ctx.n('minimum_soc') ?? 0) + (ctx.n('soc_hysteresis') ?? 0)) }) };
  if (ctx.st('mode_state') === 'waiting_for_pv') return { tone: 'info', title: t('{op} wartet auf Sonne', { op: opText || t('Ladung') }), text: t('Es ist noch nicht genug PV-Überschuss da. Ziel {soc} %.', { soc: fmt(target.soc) }) };
  if (status === 'target_reached' || ctx.st('mode_state') === 'target_reached') return { tone: 'ok', title: t('Ladeziel erreicht'), text: t('Der Akku steht bei {soc} %.', { soc: fmt(p.soc) }) };
  return { tone: 'ok', title: t('Akku ruht'), text: `${ctx.sl('status')}. ${t('Haus und Netz sind ausgeglichen.')}` };
}

// Einrichtungs-Check: nur aus dem, was die Integration liefert
function setupIssues(ctx) {
  const out = [];
  const a = ctx.s('status')?.attributes || {};
  const add = (level, title, text) => out.push({ level, title, text });
  if (ctx.st('status') === 'invalid_data' || (ctx.has('data_valid') && !ctx.on('data_valid'))) {
    const errs = (a.current_input_errors || []).map((e) => `${e.input}: ${e.reason}`).join(' · ');
    add('danger', t('Pflicht-Messwerte fehlen'), errs || t('Mindestens ein Pflichtsensor liefert keinen gültigen Wert.'));
  }
  if (['manual_required', 'exhausted'].includes(ctx.st('recovery_status'))) add('danger', t('Wiederherstellung braucht Hilfe'), ctx.sl('recovery_status'));
  if (a.communication_pause) add('warn', t('Kommunikationspause'), a.communication_pause_message || t('Der XT500 antwortet nicht zuverlässig.'));
  const seen = new Set();
  for (const [k, id] of Object.entries(a)) {
    if (!k.startsWith('source_') || !k.endsWith('_entity') || !id || seen.has(id)) continue;
    seen.add(id);
    const so = ctx.hass.states[id];
    if (!so || BAD.has(so.state)) add('warn', t('Sensor nicht verfügbar: {n}', { n: so?.attributes?.friendly_name || id }), id);
  }
  if (!ctx.hasSrc('public_grid_power')) add('info', t('Kein Netzzähler hinterlegt'), t('Ohne Netzleistung zeigt der Energiefluss das Netz nicht und die Regelung kann nicht auf 0 W regeln.'));
  if (!['pv_daily_energy', 'grid_charge_daily_energy', 'grid_export_daily_energy'].some((s) => ctx.hasSrc(s))) add('info', t('Keine Tageswerte hinterlegt'), t('Die Tagesbilanz und die Langzeitstatistik bleiben leer.'));
  const poll = Number(a.source_polling_interval_seconds);
  if (poll > 5) add('warn', t('Abfrageintervall {s} s', { s: fmt(poll) }), t('Für schnelle Rückmeldung empfiehlt die Integration 3 s (Einstellung in SunEnergyXT).'));
  if (ctx.has('regulation_enabled') && !ctx.on('regulation_enabled')) add('info', t('Energiemanager ist aus'), t('Es werden keine Sollwerte geschrieben.'));
  if (ctx.has('automatic_recovery_enabled') && !ctx.on('automatic_recovery_enabled')) add('info', t('Automatische Wiederherstellung ist aus'), t('Nach einem Schreibfehler muss die Regelung manuell neu gestartet werden.'));
  return out;
}

// ---------- Bausteine ----------

function card(title, iconName, ...body) {
  return h('section.card', null,
    title ? h('header.card-h', null, iconName ? icon(iconName) : null, h('h3', null, title)) : null,
    ...body);
}

const helpBtn = (ctx, key, title) => (HELP[key] ? h('button.help', { 'aria-label': '?', title: '?', onclick: (e) => { e.stopPropagation(); ctx.help(key, title); } }, icon('mdi:help-circle-outline')) : null);
const rowTitle = (ctx, key, label, help) => h('div.row-t', null, h('b', null, label, helpBtn(ctx, key, label)), help ? h('small', null, help) : null);

function toggle(ctx, key, onChange) {
  const el = h('button.switch.ctl', { role: 'switch', 'data-pk': key, 'aria-label': ctx.label(key), onclick: (e) => {
    e.stopPropagation();
    const next = !ctx.on(key);
    if (onChange) onChange(next); else ctx.set(key, next);
  } }, h('span.knob'));
  ctx.watch(() => { const on = ctx.on(key); el.classList.toggle('on', on); el.setAttribute('aria-checked', on); });
  return el;
}

function toggleRow(ctx, key, label, help, iconName) {
  if (!ctx.has(key)) return null;
  return h('div.row', { 'data-pk': key }, iconName ? h('span.row-ic', null, icon(iconName)) : null, rowTitle(ctx, key, label, help), toggle(ctx, key));
}

// Schieberegler für number-Entitäten; schreibt erst beim Loslassen
function rangeRow(ctx, key, opts = {}) {
  if (!ctx.has(key)) return null;
  const a = ctx.s(key).attributes;
  const min = opts.min ?? a.min ?? 0, max = opts.max ?? a.max ?? 100, step = a.step ?? 1;
  const out = h('output.rv');
  const input = h('input.ctl', { type: 'range', min, max, step, 'aria-label': opts.label || ctx.label(key) });
  let dragging = false;
  const paint = (v) => {
    out.textContent = fmtUnit(Number(v), a.unit_of_measurement, step);
    input.style.setProperty('--p', ((v - min) / (max - min)) * 100 + '%');
  };
  input.addEventListener('pointerdown', () => { dragging = true; });
  input.addEventListener('input', () => paint(input.value));
  input.addEventListener('change', () => { dragging = false; ctx.set(key, Number(input.value)); });
  ctx.watch(() => { if (dragging) return; const v = ctx.n(key); if (v != null) { input.value = v; paint(v); } });
  return h('div.row.range' + (opts.tone ? '.' + opts.tone : ''), { 'data-pk': key }, rowTitle(ctx, key, opts.label || ctx.label(key), opts.help), out, input);
}

// Plus/Minus für Feinwerte, schreibt nach kurzer Pause
function stepRow(ctx, key, help) {
  if (!ctx.has(key)) return null;
  const a = ctx.s(key).attributes;
  const step = a.step ?? 1;
  const val = h('output.sv');
  let pending = null, timer = null;
  const show = () => { val.textContent = fmtUnit(pending ?? ctx.n(key), a.unit_of_measurement, step); };
  const bump = (dir) => {
    if (ctx.ro) return ctx.toast(t('Nur Administratoren dürfen Einstellungen ändern.'), true);
    const base = pending ?? ctx.n(key) ?? 0;
    pending = clamp(Math.round((base + dir * step) / step) * step, a.min ?? -Infinity, a.max ?? Infinity);
    show();
    clearTimeout(timer);
    timer = setTimeout(() => { ctx.set(key, pending); pending = null; }, 700);
  };
  ctx.watch(show);
  return h('div.row', { 'data-pk': key }, rowTitle(ctx, key, ctx.label(key), help),
    h('div.stepper.ctl', null,
      h('button', { 'aria-label': '−', onclick: () => bump(-1) }, icon('mdi:minus')), val,
      h('button', { 'aria-label': '+', onclick: () => bump(1) }, icon('mdi:plus'))));
}

function timeRow(ctx, key, help) {
  if (!ctx.has(key)) return null;
  const input = h('input.time.ctl', { type: 'time', 'aria-label': ctx.label(key), onchange: () => ctx.set(key, input.value + ':00') });
  ctx.watch(() => { if (input.getRootNode().activeElement !== input) input.value = shortTime(ctx.st(key)); });
  return h('div.row', { 'data-pk': key }, rowTitle(ctx, key, ctx.label(key), help), input);
}

// Auswahl als Karten mit Erklärung
function choice(ctx, key, options, { compact = false } = {}) {
  if (!ctx.has(key)) return null;
  const allowed = new Set(ctx.attr(key, 'options') || options.map((o) => o.v));
  const btns = options.filter((o) => allowed.has(o.v)).map((o) => h('button.opt', { 'data-v': o.v, role: 'radio', onclick: () => ctx.set(key, o.v) },
    h('span.opt-ic', null, icon(o.icon)),
    h('span.opt-t', null, h('b', null, L2(o.label)), compact ? null : h('small', null, L2(o.desc)))));
  const el = h('div.choice.ctl' + (compact ? '.compact' : ''), { role: 'radiogroup', 'data-pk': key }, btns);
  ctx.watch(() => { const v = ctx.st(key); btns.forEach((b) => { b.classList.toggle('sel', b.dataset.v === v); b.setAttribute('aria-checked', b.dataset.v === v); }); });
  return el;
}

function actionBtn(ctx, key, label, iconName, confirmOpts, tone = '') {
  if (!ctx.has(key)) return null;
  return h('button.btn.ctl' + (tone ? '.' + tone : ''), { onclick: async () => {
    if (ctx.ro) return ctx.toast(t('Nur Administratoren dürfen Einstellungen ändern.'), true);
    if (confirmOpts && !(await ctx.confirm(confirmOpts))) return;
    ctx.set(key); ctx.toast(t('{l} – ausgelöst', { l: label }));
  } }, icon(iconName), label);
}

const chip = (text, tone, iconName) => h('span.chip' + (tone ? '.' + tone : ''), null, iconName ? icon(iconName) : null, text);
const kvs = (pairs) => pairs.filter(Boolean).map(([k, v]) => h('div.kv-r', null, h('span', null, k), h('b', null, v)));

// ---------- Übersicht ----------

function ring(size = 176) {
  const R = 84, C = 2 * Math.PI * R;
  const el = h('div.ring', { style: { width: size + 'px', height: size + 'px' }, html: `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle class="trk" cx="100" cy="100" r="${R}"/>
      <circle class="zone min" cx="100" cy="100" r="${R}"/>
      <circle class="zone res" cx="100" cy="100" r="${R}"/>
      <circle class="val" cx="100" cy="100" r="${R}" stroke-dasharray="0 ${C}"/>
      <g class="ticks"></g>
    </svg>` });
  const big = h('div.ring-v'), small = h('div.ring-s');
  el.append(h('div.ring-c', null, big, small));
  const arc = (sel, from, to) => {
    const c = el.querySelector(sel);
    c.setAttribute('stroke-dasharray', `${Math.max(0, (to - from) / 100) * C} ${C}`);
    c.setAttribute('stroke-dashoffset', -(from / 100) * C);
  };
  const tick = (pct, cls) => {
    const a = (pct / 100) * 2 * Math.PI; // SVG ist bereits um -90° gedreht
    const x = (r) => 100 + Math.cos(a) * r, y = (r) => 100 + Math.sin(a) * r;
    return `<line class="${cls}" x1="${x(R - 13)}" y1="${y(R - 13)}" x2="${x(R + 13)}" y2="${y(R + 13)}"/>`;
  };
  const update = (ctx) => {
    const p = powers(ctx);
    const min = ctx.n('minimum_soc') ?? 0;
    const reserveOn = ctx.on('reserve_enabled');
    const res = reserveOn ? ctx.n('reserve_soc') ?? min : min;
    const tg = targetInfo(ctx);
    arc('.val', 0, p.soc ?? 0);
    arc('.zone.min', 0, min);
    arc('.zone.res', min, Math.max(min, res));
    el.querySelector('.ticks').innerHTML = tick(tg.soc, 'tg') + (reserveOn ? tick(res, 'rs') : '') + tick(min, 'mn');
    big.innerHTML = `${fmt(p.soc)}<span>%</span>`;
    small.textContent = p.charge > 15 ? t('lädt {p}', { p: fmtW(p.charge) }) : p.discharge > 15 ? t('entlädt {p}', { p: fmtW(p.discharge) }) : t('Ruhe');
    return { p, min, res, reserveOn, tg };
  };
  return { el, update };
}

function heroCard(ctx) {
  const r = ring();
  const eyebrow = h('div.eyebrow'), title = h('h2'), text = h('p'), etaEl = h('div.eta'), fcEl = h('div.eta.fcl');
  const chips = h('div.chips'), legend = h('div.legend');
  const el = h('section.card.hero', null, h('div.hero-ring', null, r.el, legend), h('div.hero-t', null, eyebrow, title, text, etaEl, fcEl, chips));
  learnCapacity(ctx);
  ctx.watch(() => {
    const { p, min, res, reserveOn, tg } = r.update(ctx);
    el.dataset.flow = p.charge > 15 ? 'charge' : p.discharge > 15 ? 'discharge' : '';
    const d = describe(ctx);
    el.dataset.tone = d.tone;
    eyebrow.textContent = ctx.sl('status');
    title.textContent = d.title;
    text.textContent = d.text;
    const f = d.tone === 'ok' || d.tone === 'info' ? forecastSummary(ctx) : null;
    const e = d.tone === 'ok' && !f ? eta(ctx) : null;
    fill(etaEl, e ? [icon('mdi:clock-outline'), h('span', null, e.text), h('button.help', { 'aria-label': t('Akkukapazität'), onclick: () => ctx.confirm({ title: t('Akkukapazität'), text: t('Geschätzt mit {c} Kapazität ({src}).', { c: fmtKWh(e.cap.kwh), src: e.cap.src }), ok: t('OK'), noCancel: true }) }, icon('mdi:information-outline'))] : null);
    fill(fcEl, f ? [icon('mdi:weather-partly-cloudy'), h('span', null, f.text), h('button.help', { 'aria-label': t('Prognose'), onclick: () => ctx.go('verlauf') }, icon('mdi:chevron-right'))] : null);
    const op = ctx.st('active_operation');
    const src = ctx.st('active_energy_source');
    fill(chips,
      op && op !== 'normal' && !BAD.has(op) ? chip(ctx.sl('active_operation'), 'accent', 'mdi:steering') : null,
      ctx.has('active_mode') ? chip(t('Modus: {m}', { m: ctx.sl('active_mode') }), null, 'mdi:battery-charging-medium') : null,
      src && src !== 'none' && !BAD.has(src) ? chip(t('Quelle: {s}', { s: ctx.sl('active_energy_source') }), 'energy', 'mdi:lightning-bolt') : null,
      ctx.on('discharge_override_active') ? chip(t('Entladefreigabe aktiv'), 'warn', 'mdi:battery-lock-open') : null);
    fill(legend,
      h('span.lg.tg', null, `${tg.label} ${fmt(tg.soc)} %`),
      reserveOn ? h('span.lg.rs', null, `${t('Reserve')} ${fmt(res)} %`) : null,
      h('span.lg.mn', null, `${t('Grenze')} ${fmt(min)} %`));
  });
  return el;
}

function flowCard(ctx) {
  const nodes = {
    solar: { label: t('PV'), icon: 'mdi:solar-power-variant', tone: 'amber' },
    battery: { label: t('Akku'), icon: 'mdi:home-battery-outline', tone: 'energy' },
    grid: { label: t('Netz'), icon: 'mdi:transmission-tower', tone: 'cool' },
    home: { label: t('Haus'), icon: 'mdi:home-outline', tone: 'text' },
  };
  const target = { solar: () => ctx.srcId('pv_power'), battery: () => ctx.srcId('soc'), grid: () => ctx.srcId('public_grid_power'), home: () => ctx.id('estimated_home_load') };
  const ns = {};
  const mk = (k) => {
    const v = h('div.fl-val'), s = h('div.fl-sub');
    const ic = h('span.fl-ic', null, icon(nodes[k].icon));
    const n = h('button.fl-node.' + k, { 'data-tone': nodes[k].tone, onclick: () => ctx.moreInfo(target[k]()) }, ic, v, h('div.fl-label', null, nodes[k].label), s);
    ns[k] = { n, v, s, ic };
    return n;
  };
  const uid = 'f' + Math.random().toString(36).slice(2, 7);
  const keys = ['solar-home', 'solar-battery', 'solar-grid', 'battery-home', 'grid-home', 'grid-battery'];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = document.createElementNS(NS, 'svg');
  svgEl.setAttribute('class', 'fl-lines');
  for (const k of keys) { const p = document.createElementNS(NS, 'path'); p.id = `${uid}-${k}`; p.dataset.k = k; svgEl.append(p); }
  const stage = h('div.fl-stage', null, svgEl, mk('solar'), mk('battery'), mk('grid'), mk('home'));
  const el = card(t('Energiefluss'), 'mdi:transit-connection-variant', stage);
  el.classList.add('flow');
  let laid = false;
  const layout = () => {
    const sr = stage.getBoundingClientRect();
    if (!sr.width) return;
    const c = (k) => { const r = ns[k].ic.getBoundingClientRect(); return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, r: r.width / 2 }; };
    const S0 = c('solar'), B = c('battery'), G = c('grid'), H = c('home');
    svgEl.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    const p = {
      'solar-home': `M${S0.x},${S0.y + S0.r} L${H.x},${H.y - H.r}`,
      'solar-battery': `M${S0.x - S0.r * 0.7},${S0.y + S0.r * 0.7} Q${B.x},${S0.y + S0.r} ${B.x + B.r * 0.7},${B.y - B.r * 0.7}`,
      'solar-grid': `M${S0.x + S0.r * 0.7},${S0.y + S0.r * 0.7} Q${G.x},${S0.y + S0.r} ${G.x - G.r * 0.7},${G.y - G.r * 0.7}`,
      'battery-home': `M${B.x + B.r * 0.7},${B.y + B.r * 0.7} Q${B.x},${H.y} ${H.x - H.r},${H.y}`,
      'grid-home': `M${G.x - G.r * 0.7},${G.y + G.r * 0.7} Q${G.x},${H.y} ${H.x + H.r},${H.y}`,
      'grid-battery': `M${G.x - G.r},${G.y} L${B.x + B.r},${B.y}`,
    };
    for (const k of keys) svgEl.querySelector(`[data-k="${k}"]`).setAttribute('d', p[k]);
    if (!laid) { laid = true; ctx.kick(); }
  };
  const ro = new ResizeObserver(layout);
  ro.observe(stage);
  ctx.cleanup(() => ro.disconnect());

  const dots = {};
  const setFlow = (key, watts) => {
    const path = svgEl.querySelector(`[data-k="${key}"]`);
    const active = laid && watts > 15;
    path.classList.toggle('active', active);
    if (!dots[key]) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', 3.4);
      c.setAttribute('class', 'fl-dot ' + key.split('-')[0]);
      const m = document.createElementNS(NS, 'animateMotion');
      m.setAttribute('repeatCount', 'indefinite');
      const mp = document.createElementNS(NS, 'mpath');
      mp.setAttribute('href', `#${uid}-${key}`);
      m.append(mp); c.append(m); svgEl.append(c);
      dots[key] = { c, m };
    }
    dots[key].c.style.display = active ? '' : 'none';
    if (active) dots[key].m.setAttribute('dur', clamp(4 - Math.log10(Math.max(watts, 1)) * 0.9, 0.9, 4).toFixed(2) + 's');
  };

  ctx.watch(() => {
    const p = powers(ctx);
    ns.solar.v.textContent = fmtW(p.solar);
    ns.solar.s.textContent = p.ac > 15 ? t('davon AC {p}', { p: fmtW(p.ac) }) : p.dc == null ? '' : ctx.on('pv_release_active') ? t('XT500-PV') : t('gesperrt');
    ns.grid.v.textContent = p.grid == null ? '—' : fmtW(Math.abs(p.grid));
    ns.grid.s.textContent = p.grid == null ? t('kein Zähler') : p.grid > 15 ? t('Bezug') : p.grid < -15 ? t('Einspeisung') : t('ausgeglichen');
    ns.battery.v.textContent = p.soc != null ? fmt(p.soc) + ' %' : '—';
    ns.battery.s.textContent = p.charge > 15 ? t('lädt {p}', { p: fmtW(p.charge) }) : p.discharge > 15 ? t('entlädt {p}', { p: fmtW(p.discharge) }) : t('Ruhe');
    ns.battery.ic.style.setProperty('--soc', (p.soc ?? 0) + '%');
    ns.home.v.textContent = fmtW(p.home);
    ns.home.s.textContent = p.home > 0 && p.grid != null ? t('Autarkie {p} %', { p: fmt(clamp(Math.round((1 - Math.max(0, p.grid) / p.home) * 100), 0, 100)) }) : '';
    const solar = p.solar ?? 0, grid = p.grid ?? 0;
    const imp = Math.max(0, grid), exp = Math.max(0, -grid);
    const solarToBatt = Math.min(solar, p.charge);
    const solarToGrid = Math.min(Math.max(0, solar - solarToBatt), exp);
    const solarToHome = Math.max(0, solar - solarToBatt - solarToGrid);
    const gridToBatt = Math.max(0, p.charge - solarToBatt);
    setFlow('solar-home', solarToHome);
    setFlow('solar-battery', solarToBatt);
    setFlow('solar-grid', solarToGrid);
    setFlow('battery-home', p.discharge);
    setFlow('grid-home', Math.max(0, imp - gridToBatt));
    setFlow('grid-battery', gridToBatt);
    el.dataset.sun = solar > 15 ? '1' : '';
    ns.grid.n.classList.toggle('na', p.grid == null);
    ns.solar.n.classList.toggle('na', p.solar == null);
  });
  return el;
}

// Wer steuert gerade? – die Vorrangliste der Integration als Treppe
function priorityCard(ctx) {
  const levels = [
    { op: ['manual'], key: 'manual_active', icon: 'mdi:target', name: t('Manuelle Zielladung'), state: () => (ctx.on('manual_active')
      ? t('Aktiv · {m} bis {s} %', { m: ctx.sl('manual_mode'), s: fmt(ctx.n('target_soc')) }) : t('Aus')) },
    { op: ['cycle_manual', 'cycle_automatic'], key: 'cycle_state', icon: 'mdi:battery-sync-outline', name: t('Zyklusladung'), state: () => (ctx.on('cycle_charge_active')
      ? t('Läuft · {m} bis {s} %', { m: ctx.sl('automatic_mode'), s: fmt(ctx.n('automatic_target_soc')) })
      : ctx.on('cycle_due') ? t('Fällig · Start um {t}', { t: shortTime(ctx.st('cycle_check_time')) }) : !ctx.on('automatic_enabled') ? t('Automatik aus') : t('Nächste {t}', { t: fmtDateTime(ctx.st('next_cycle_at')) })) },
    { op: ['tariff'], key: 'tariff_active', icon: 'mdi:currency-eur', name: t('Tarifladung'), state: () => (ctx.on('tariff_request')
      ? t('Aktiv bis {t}', { t: fmtDateTime(ctx.st('tariff_expires_at')) }) : ctx.on('tariff_active') ? t('Angefordert') : t('Keine Anforderung')) },
    { op: ['normal'], key: 'base_mode', icon: 'mdi:home-lightning-bolt-outline', name: t('Grundbetrieb'), state: () => (ctx.has('base_mode') ? ctx.sl('base_mode') : ctx.sl('active_mode')) },
  ].filter((l) => ctx.has(l.key) || l.op[0] === 'normal');
  const rows = levels.map((l, i) => {
    const st = h('small');
    const row = h('div.lvl', null, h('span.lvl-n', null, String(i + 1)), h('span.lvl-ic', null, icon(l.icon)), h('div.lvl-t', null, h('b', null, l.name), st), h('span.lvl-badge', null, t('steuert')));
    return { l, row, st };
  });
  const el = card(t('Wer steuert gerade?'), 'mdi:stairs', h('div.ladder', null, rows.map((r) => r.row)),
    h('p.hint', null, t('Höhere Stufen haben Vorrang. Ist keine Ladung aktiv, gilt der Grundbetrieb.')));
  ctx.watch(() => {
    const op = ctx.st('active_operation') || 'normal';
    const off = ctx.st('status') === 'disabled';
    for (const r of rows) {
      r.st.textContent = r.l.state();
      r.row.classList.toggle('act', !off && r.l.op.includes(op));
      r.row.classList.toggle('pending', r.l.op[0] === 'cycle_manual' && ctx.on('cycle_due') && !ctx.on('cycle_charge_active'));
    }
  });
  return el;
}

function healthCard(ctx) {
  const items = [
    { name: t('Messwerte'), icon: 'mdi:gauge', ok: () => !ctx.has('data_valid') || ctx.on('data_valid'), text: () => (!ctx.has('data_valid') || ctx.on('data_valid') ? t('gültig') : t('ungültig')) },
    { name: t('Regelung'), icon: 'mdi:tune-variant', ok: () => ctx.on('control_ready') && ctx.on('regulation_enabled'), text: () => (!ctx.on('regulation_enabled') ? t('aus') : ctx.on('control_ready') ? t('bereit') : t('nicht bereit')) },
    { name: t('Verbindung'), icon: 'mdi:lan-connect', ok: () => !ctx.attr('status', 'communication_pause'), text: () => (ctx.attr('status', 'communication_pause') ? t('Pause') : t('stabil')) },
    { name: t('Wiederherstellung'), icon: 'mdi:backup-restore', ok: () => !ctx.has('recovery_status') || ['ready', 'disabled'].includes(ctx.st('recovery_status')), text: () => ctx.sl('recovery_status') },
  ];
  const els = items.map((it) => {
    const tx = h('small'); const b = h('button.hl', { onclick: () => ctx.go('technik') }, h('span.dot'), h('span.hl-ic', null, icon(it.icon)), h('span.hl-t', null, h('b', null, it.name), tx));
    return { it, b, tx };
  });
  const el = h('section.card.health', null, els.map((e) => e.b));
  ctx.watch(() => els.forEach(({ it, b, tx }) => { b.classList.toggle('bad', !it.ok()); tx.textContent = it.text(); }));
  return el;
}

// Hinweis-Leiste, wenn der Einrichtungs-Check etwas findet
function issueBanner(ctx) {
  const el = h('button.banner', { onclick: () => ctx.go('technik') });
  ctx.watch(() => {
    const list = setupIssues(ctx).filter((i) => i.level !== 'info');
    el.hidden = !list.length;
    el.dataset.level = list.some((i) => i.level === 'danger') ? 'danger' : 'warn';
    fill(el, icon('mdi:alert-circle-outline'), h('span', null, h('b', null, list[0]?.title || ''), list.length > 1 ? ' · ' + t('{n} Hinweis(e) zur Einrichtung', { n: list.length }) : ''), icon('mdi:chevron-right'));
  });
  return el;
}

function todayCard(ctx) {
  const items = [
    { src: 'pv_daily_energy', label: t('PV-Erzeugung'), icon: 'mdi:solar-power-variant', tone: 'amber' },
    { src: 'grid_export_daily_energy', label: t('Ins Haus/Netz abgegeben'), icon: 'mdi:transmission-tower-export', tone: 'cool' },
    { src: 'grid_charge_daily_energy', label: t('Netzladung'), icon: 'mdi:battery-charging', tone: 'energy' },
    { src: 'offgrid_daily_energy', label: t('Off-Grid'), icon: 'mdi:power-plug-battery-outline', tone: 'media' },
  ].filter((i) => ctx.src(i.src));
  const rows = items.map((i) => {
    const v = h('b.tv'), bar = h('span.tb-f');
    return { i, v, bar, el: h('button.today-r', { 'data-tone': i.tone, onclick: () => ctx.moreInfo(ctx.srcId(i.src)) }, h('span.today-ic', null, icon(i.icon)), h('span.today-l', null, i.label), v, h('span.tb', null, bar)) };
  });
  const fcBox = h('button.fc-today', { onclick: () => ctx.go('verlauf') });
  const el = card(t('Heute'), 'mdi:calendar-today', h('div.today', null, rows.map((r) => r.el)), fcBox);
  ctx.watch(() => {
    const vals = rows.map((r) => ctx.srcN(r.i.src) ?? 0);
    const max = Math.max(0.1, ...vals);
    rows.forEach((r, k) => { r.v.textContent = fmtKWh(vals[k]); r.bar.style.width = (vals[k] / max) * 100 + '%'; });
    const fc = ctx.cache.fc;
    fcBox.hidden = !fc || fc.none;
    el.hidden = !items.length && fcBox.hidden;
    if (fcBox.hidden) return;
    fill(fcBox, h('div.fct-h', null, icon('mdi:weather-partly-cloudy'), t('PV-Prognose')),
      h('div.fct', null, h('span', null, t('Rest heute')), h('b', null, '≈ ' + fmtKWh(fcEnergy(fc, Date.now(), dayStart(1))))),
      h('div.fct', null, h('span', null, t('Morgen')), h('b', null, '≈ ' + fmtKWh(fcEnergy(fc, dayStart(1), dayStart(2))))));
  });
  return el;
}

function cycleCard(ctx, withSettings = false) {
  if (!ctx.has('cycle_state')) return null;
  const days = h('div.cy-days'), state = h('small'), fillEl = h('span.cy-f'), next = h('div.cy-next'), conf = h('div.cy-conf'), outlook = h('div.cy-fc');
  const el = card(t('Zyklusladung'), 'mdi:battery-sync-outline',
    h('div.cy-top', null, days, h('div.cy-st', null, state, next)),
    h('div.cy-bar', null, fillEl),
    conf, outlook,
    h('div.btns', null,
      actionBtn(ctx, 'cycle_start', t('Jetzt starten'), 'mdi:play', { title: t('Zyklusladung jetzt starten?'), text: t('Der Akku wird mit „{m}“ auf {s} % geladen und die Vollladung bestätigt.', { m: ctx.sl('automatic_mode'), s: fmt(ctx.n('automatic_target_soc')) }), ok: t('Starten') }),
      withSettings ? actionBtn(ctx, 'cycle_reset', t('Tage auf 0'), 'mdi:restore', { title: t('Zyklustage zurücksetzen?'), text: t('Der Zähler beginnt neu, als wäre der Akku gerade voll geladen worden.'), ok: t('Zurücksetzen'), tone: 'danger' }, 'ghost')
        : h('button.btn.ghost', { onclick: () => ctx.go('steuern') }, icon('mdi:cog-outline'), t('Einstellungen'))),
    withSettings ? h('div.rows', null,
      toggleRow(ctx, 'automatic_enabled', t('Automatische Zyklusladung'), t('Lädt regelmäßig voll, damit der Akku seinen Ladestand kalibriert.')),
      rangeRow(ctx, 'cycle_interval_days', { help: t('Abstand zwischen zwei Vollladungen.') }),
      timeRow(ctx, 'cycle_check_time', t('Zu dieser Uhrzeit startet eine fällige Ladung.')),
      ctx.has('automatic_mode') ? h('div.sub-h', null, t('Lademodus der Zyklusladung')) : null,
      choice(ctx, 'automatic_mode', CHARGE_MODES, { compact: true }),
      rangeRow(ctx, 'automatic_target_soc', { tone: 'energy' })) : null);
  ctx.watch(() => {
    const d = ctx.n('days_since_full') ?? 0, iv = ctx.n('cycle_interval_days') ?? 14;
    fill(days, h('b', null, fmt(Math.floor(d))), h('span', null, ' / ' + t('{i} Tage', { i: fmt(iv) })));
    state.textContent = ctx.sl('cycle_state');
    next.textContent = ctx.on('cycle_charge_active') ? t('läuft gerade') : t('nächste: {t}', { t: fmtDateTime(ctx.st('next_cycle_at')) });
    fillEl.style.width = clamp((d / iv) * 100, 0, 100) + '%';
    el.dataset.due = ctx.on('cycle_due') ? '1' : '';
    el.dataset.run = ctx.on('cycle_charge_active') ? '1' : '';
    const fc = ctx.st('full_charge_confirmation');
    conf.textContent = fc && fc !== 'idle' && !BAD.has(fc) ? t('Vollladung: {s}', { s: ctx.sl('full_charge_confirmation') }) : '';
    const o = cycleOutlook(ctx);
    outlook.dataset.ok = o?.ok ? '1' : '';
    fill(outlook, o ? [icon(o.ok ? 'mdi:weather-sunny' : 'mdi:weather-cloudy-alert'), h('span', null, o.text)] : null);
  });
  return el;
}

function overview(ctx) {
  return h('div.grid', null,
    h('div.span-12', null, issueBanner(ctx)),
    h('div.span-7', null, heroCard(ctx)),
    h('div.span-5', null, flowCard(ctx)),
    h('div.span-12', null, healthCard(ctx)),
    h('div.span-4', null, priorityCard(ctx)),
    h('div.span-4', null, cycleCard(ctx)),
    h('div.span-4', null, todayCard(ctx)));
}

// ---------- Steuern ----------

function limitsCard(ctx) {
  if (!ctx.has('minimum_soc') && !ctx.has('normal_charge_limit')) return null;
  const bar = h('div.lim-bar', null, h('span.lim-z.min'), h('span.lim-z.res'), h('span.lim-soc'), h('span.lim-cap'), h('span.lim-now'));
  const scale = h('div.lim-scale');
  const el = card(t('Akku-Grenzen'), 'mdi:battery-heart-variant',
    h('p.hint', null, t('So weit darf der Akku entladen und geladen werden.')),
    h('div.lim', null, bar, scale),
    h('div.rows', null,
      rangeRow(ctx, 'minimum_soc', { tone: 'danger', help: t('Darunter entlädt der XT500 nie. Wirkt direkt am Gerät.') }),
      toggleRow(ctx, 'reserve_enabled', t('Reserve für Stromausfall behalten'), t('Im Netzbetrieb wird zusätzlich nicht unter die Reserve entladen.')),
      rangeRow(ctx, 'reserve_soc', { tone: 'warn', help: t('Bleibt für Off-Grid übrig.') }),
      rangeRow(ctx, 'normal_charge_limit', { tone: 'energy', help: t('Obergrenze, solange keine Zielladung läuft.') }),
      stepRow(ctx, 'soc_hysteresis', t('Nach Erreichen der Grenze wird erst ab diesem Abstand wieder entladen.'))),
    h('div.btns', null, actionBtn(ctx, 'discharge_release', t('Entladesperre einmal freigeben'), 'mdi:battery-lock-open', { title: t('Entladesperre einmalig freigeben?'), text: t('Der Akku darf einmalig unter die Wiederfreigabe-Schwelle entladen, bis die reguläre Entladegrenze erneut erreicht ist.'), ok: t('Freigeben') }, 'ghost')));
  ctx.watch(() => {
    const soc = ctx.srcN('soc') ?? 0, min = ctx.n('minimum_soc') ?? 0, cap = ctx.n('normal_charge_limit') ?? 100;
    const resOn = ctx.on('reserve_enabled'), res = resOn ? ctx.n('reserve_soc') ?? min : min;
    bar.style.setProperty('--min', min + '%');
    bar.style.setProperty('--res', Math.max(min, res) + '%');
    bar.style.setProperty('--soc', soc + '%');
    bar.style.setProperty('--cap', cap + '%');
    fill(scale,
      h('span.mn', { style: { left: min + '%' } }, `${fmt(min)} %`),
      resOn && res > min ? h('span.rs', { style: { left: res + '%' } }, `${fmt(res)} %`) : null,
      h('span.now', { style: { left: soc + '%' } }, t('jetzt {s} %', { s: fmt(soc) })),
      h('span.cp', { style: { left: cap + '%' } }, `${fmt(cap)} %`));
    el.querySelector('.range.warn')?.classList.toggle('disabled', !resOn);
  });
  return el;
}

function manualCard(ctx) {
  if (!ctx.has('manual_active')) return null;
  const big = h('button.big-toggle.ctl', { 'data-pk': 'manual_active', onclick: () => ctx.set('manual_active', !ctx.on('manual_active')) });
  const el = card(t('Zielladung'), 'mdi:target',
    h('p.hint', null, t('Einmalig auf ein Ziel laden. Endet automatisch, wenn das Ziel erreicht ist.')),
    choice(ctx, 'manual_mode', CHARGE_MODES),
    h('div.rows', null,
      rangeRow(ctx, 'target_soc', { tone: 'energy' }),
      rangeRow(ctx, 'charge_power', { help: t('Bei „Netzladung“ der Netzanteil, bei „PV + Netz“ die Gesamtleistung.') })),
    big);
  ctx.watch(() => {
    const on = ctx.on('manual_active');
    big.classList.toggle('on', on);
    fill(big, icon(on ? 'mdi:stop' : 'mdi:play'), on ? t('Zielladung beenden ({a} → {b} %)', { a: fmt(ctx.srcN('soc')), b: fmt(ctx.n('target_soc')) }) : t('Auf {s} % laden', { s: fmt(ctx.n('target_soc')) }));
    el.dataset.active = on ? '1' : '';
  });
  return el;
}

// Gibt es schon eine Automation aus dem mitgelieferten Blueprint?
function blueprintBox(ctx) {
  if (ctx.ro || !ctx.hass.callWS) return null;
  const box = h('div.bp');
  const render = (autos) => {
    if (autos == null) return fill(box);
    if (!autos.length) {
      return fill(box, h('div.bp-t', null, h('b', null, t('Preis-Automation')), h('small', null, t('Keine Automation mit dem XT500-Tarif-Blueprint gefunden.'))),
        h('button.btn.ghost', { onclick: async () => { await ctx.confirm({ title: t('Automation anlegen'), text: t('In der Blueprint-Liste „XT500 – Laden bei günstigem Strompreis“ wählen und „Automation erstellen“ antippen.'), ok: t('OK'), noCancel: true }); navigate('/config/blueprint/dashboard'); } }, icon('mdi:robot-outline'), t('Automation anlegen')));
    }
    return fill(box, autos.map((id) => {
      const so = ctx.hass.states[id];
      return h('div.bp-r', null, h('span.bp-ic', null, icon('mdi:robot-outline')),
        h('div.bp-t', null, h('b', null, so?.attributes?.friendly_name || id), h('small', null, `${t('Preis-Automation')} · ${so?.state === 'on' ? t('aktiv') : t('deaktiviert')}`)),
        so?.attributes?.id ? h('button.btn.ghost', { onclick: () => navigate(`/config/automation/edit/${so.attributes.id}`) }, t('Automation öffnen')) : null);
    }));
  };
  if (ctx.cache.blueprint) render(ctx.cache.blueprint);
  else ctx.hass.callWS({ type: 'search/related', item_type: 'automation_blueprint', item_id: BLUEPRINT_PATH })
    .then((r) => { ctx.cache.blueprint = r?.automation || []; render(ctx.cache.blueprint); })
    .catch(() => render(null));
  return box;
}

function tariffCard(ctx) {
  if (!ctx.has('tariff_active')) return null;
  const exp = h('small.exp');
  const el = card(t('Tarifladung'), 'mdi:currency-eur',
    h('p.hint', null, t('Für günstige Strompreise: Eine Automation fordert die Ladung an, sie läuft dann zeitlich begrenzt als reine Netzladung.')),
    blueprintBox(ctx),
    h('div.rows', null,
      toggleRow(ctx, 'tariff_active', t('Tarifladung anfordern'), null, 'mdi:hand-coin-outline'),
      exp,
      rangeRow(ctx, 'tariff_target_soc', { tone: 'energy' }),
      rangeRow(ctx, 'tariff_charge_power'),
      rangeRow(ctx, 'tariff_request_duration', { help: t('Danach endet die Anforderung, wenn sie nicht erneuert wird.') })));
  ctx.watch(() => { exp.textContent = ctx.on('tariff_request') ? t('Aktiv bis {t}', { t: fmtDateTime(ctx.st('tariff_expires_at')) }) : ''; });
  return el;
}

function mainCard(ctx) {
  const state = h('small');
  const el = card(null, null,
    h('div.main-row', null,
      h('span.main-ic', null, icon('mdi:brain')),
      h('div.row-t', null, h('b', null, t('Energiemanager')), state),
      ctx.has('regulation_enabled') ? toggle(ctx, 'regulation_enabled', async (next) => {
        if (ctx.ro) return ctx.toast(t('Nur Administratoren dürfen Einstellungen ändern.'), true);
        if (!next && !(await ctx.confirm({ title: t('Energiemanager ausschalten?'), text: t('Es werden keine Sollwerte mehr geschrieben. Der XT500 behält die zuletzt gesetzten Werte.'), ok: t('Ausschalten'), tone: 'danger' }))) return;
        ctx.set('regulation_enabled', next);
      }) : null),
    ctx.has('base_mode') ? h('div.sub-h', null, t('Grundbetrieb (ohne Ladeauftrag)')) : null,
    choice(ctx, 'base_mode', BASE_MODES),
    ctx.has('coupling_mode') ? h('div.sub-h', null, t('Welche PV soll berücksichtigt werden?')) : null,
    choice(ctx, 'coupling_mode', COUPLING_MODES, { compact: true }),
    h('div.rows', null, toggleRow(ctx, 'full_battery_pv_export', t('PV einspeisen, wenn der Akku voll ist'), t('XT500-PV versorgt dann das Haus, Überschuss darf ins Netz.'), 'mdi:transmission-tower-export')));
  el.classList.add('main');
  ctx.watch(() => { state.textContent = ctx.on('regulation_enabled') ? ctx.sl('status') : t('Aus – XT500 regelt selbst'); el.dataset.off = ctx.on('regulation_enabled') ? '' : '1'; });
  return el;
}

function gridCard(ctx) {
  const rows = [
    rangeRow(ctx, 'target_grid_power', { min: Math.max(ctx.attr('target_grid_power', 'min') ?? -200, -200), max: Math.min(ctx.attr('target_grid_power', 'max') ?? 200, 200), help: t('Auf diesen Wert regelt der Speicher den Netzanschluss (0 = Nulleinspeisung).') }),
    rangeRow(ctx, 'maximum_grid_output', { help: t('Höchstens so viel gibt der XT500 ins Hausnetz ab.') }),
    rangeRow(ctx, 'maximum_inverter_output'),
  ].filter(Boolean);
  return rows.length ? card(t('Netz & Wechselrichter'), 'mdi:transmission-tower', h('div.rows', null, rows)) : null;
}

function controls(ctx) {
  return h('div.grid', null,
    ctx.ro ? h('div.span-12', null, h('div.banner.info', null, icon('mdi:eye-outline'), h('span', null, t('Nur Anzeige – Änderungen sind Administratoren vorbehalten.')))) : null,
    h('div.span-6.stack', null, mainCard(ctx), manualCard(ctx), tariffCard(ctx)),
    h('div.span-6.stack', null, limitsCard(ctx), cycleCard(ctx, true), gridCard(ctx)));
}

// ---------- Verlauf ----------

const SERIES = [
  { key: 'soc', src: 'soc', label: 'Ladezustand', color: 'var(--energy)', unit: '%' },
  { key: 'pv', src: 'pv_power', label: 'PV', color: 'var(--amber)', unit: 'W' },
  { key: 'grid', src: 'public_grid_power', label: 'Netz', color: 'var(--cool)', unit: 'W' },
  { key: 'batt', src: 'battery_power', label: 'Akku', color: 'var(--media)', unit: 'W', note: ' (+ lädt)' }, // Gerätesensor: + Laden, − Entladen
  { key: 'home', id: 'estimated_home_load', label: 'Haus', color: 'var(--muted)', unit: 'W' },
];
const seriesId = (ctx, s) => (s.src ? ctx.srcId(s.src) : ctx.id(s.id));

async function loadHistory(ctx, hours) {
  const end = new Date(), start = new Date(end - hours * 3600e3);
  const ids = SERIES.map((s) => seriesId(ctx, s)).filter(Boolean);
  const res = await ctx.hass.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
    entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
  const out = { start: +start, end: +end };
  for (const s of SERIES) {
    const id = seriesId(ctx, s);
    out[s.key] = (res[id] || []).map((p) => [(p.lu ?? p.lc) * 1000, parseFloat(p.s)]).filter((p) => Number.isFinite(p[1]));
  }
  return out;
}

// Gleichmäßige Stützstellen (letzter Wert gilt bis zur nächsten Änderung)
// Vor dem ersten und deutlich nach dem letzten Punkt bleibt die Linie leer
function resample(points, start, end, n) {
  const out = []; let j = 0, last = points.length ? points[0][1] : null;
  const firstT = points[0]?.[0], lastT = points[points.length - 1]?.[0];
  for (let i = 0; i < n; i++) {
    const tA = start + ((end - start) * i) / (n - 1);
    const tB = start + ((end - start) * (i + 1)) / (n - 1);
    let sum = 0, cnt = 0;
    while (j < points.length && points[j][0] <= tB) { if (points[j][0] >= tA) { sum += points[j][1]; cnt++; } last = points[j][1]; j++; }
    const outside = firstT == null || tB < firstT || tA > lastT + (tB - tA) * 2;
    out.push(cnt ? sum / cnt : outside ? null : last);
  }
  return out;
}

function lineChart(ctx, { series, height = 190, yFmt, area, bands = [], now = false }) {
  const wrap = h('div.chart', { style: { height: height + 'px' } });
  const tip = h('div.tip');
  let data = null;
  const draw = () => {
    const W = wrap.clientWidth; if (!W || !data) return;
    const H = height, padL = 42, padR = 10, padT = 10, padB = 22;
    const n = Math.max(60, Math.min(300, Math.round(W / 3)));
    const rs = series.map((s) => ({ ...s, v: resample(data[s.key] || [], data.start, data.end, n) }));
    let lo = Infinity, hi = -Infinity;
    for (const s of rs) for (const v of s.v) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    let step;
    if (series[0].unit === '%') { lo = 0; hi = 100; step = 25; }
    else {
      if (!Number.isFinite(lo)) { lo = 0; hi = 100; }
      lo = Math.min(0, lo); hi = Math.max(hi, 50);
      step = niceStep(hi - lo); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    }
    const x = (i) => padL + ((W - padL - padR) * i) / (n - 1);
    const y = (v) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo || 1));
    const grid = [];
    for (let v = lo; v <= hi + 1e-6; v += step) grid.push(`<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text x="${padL - 6}" y="${y(v) + 3}" text-anchor="end">${yFmt(v)}</text>`);
    const hrs = (data.end - data.start) / 3600e3, stepH = hrs > 24 ? 12 : hrs > 8 ? 4 : 1, xt = [];
    const first = new Date(data.start); first.setMinutes(0, 0, 0);
    for (let tt = +first + 3600e3; tt < data.end; tt += 3600e3) {
      const d = new Date(tt); if (d.getHours() % stepH) continue;
      const px = padL + ((W - padL - padR) * (tt - data.start)) / (data.end - data.start);
      xt.push(`<text x="${px}" y="${H - 6}" text-anchor="middle">${String(d.getHours()).padStart(2, '0')}:00</text>`);
    }
    const bandSvg = bands.filter((b) => b.v != null).map((b) => `<line class="band ${b.cls}" x1="${padL}" x2="${W - padR}" y1="${y(b.v)}" y2="${y(b.v)}"/><text class="band-t ${b.cls}" x="${W - padR}" y="${y(b.v) - 4}" text-anchor="end">${b.label}</text>`).join('');
    const paths = rs.map((s) => {
      let d = '', first = null, lastI = null, pen = false;
      s.v.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pen = true; first ??= i; lastI = i; });
      if (!d) return '';
      const fillP = area ? `<path class="ar" style="fill:${s.color}" d="${d}L${x(lastI)},${y(Math.max(lo, 0))}L${x(first)},${y(Math.max(lo, 0))}Z"/>` : '';
      return fillP + `<path class="ln${s.dash ? ' dash' : ''}" style="stroke:${s.color}" d="${d}"/>`;
    }).join('');
    const nowX = padL + ((W - padL - padR) * (Date.now() - data.start)) / (data.end - data.start);
    const nowSvg = now && Date.now() > data.start && Date.now() < data.end ? `<line class="now" x1="${nowX}" x2="${nowX}" y1="${padT}" y2="${H - padB}"/><text class="now-t" x="${nowX + 4}" y="${padT + 9}">${t('jetzt')}</text>` : '';
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g class="grid">${grid.join('')}${xt.join('')}</g>${bandSvg}${lo < 0 ? `<line class="zero" x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}"/>` : ''}${nowSvg}${paths}<line class="cross" y1="${padT}" y2="${H - padB}"/></svg>`;
    wrap.append(tip);
    const cross = wrap.querySelector('.cross');
    wrap.onpointermove = (e) => {
      const r = wrap.getBoundingClientRect();
      const i = clamp(Math.round(((e.clientX - r.left - padL) / (W - padL - padR)) * (n - 1)), 0, n - 1);
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.opacity = 1;
      const tm = new Date(data.start + ((data.end - data.start) * i) / (n - 1));
      tip.innerHTML = `<b>${hrs > 24 ? fmtDateTime(tm) : fmtTime(tm)}</b>` + rs.map((s) => `<span><i style="background:${s.color}"></i>${t(s.label)} ${s.v[i] == null ? '—' : s.unit === '%' ? fmt(s.v[i]) + ' %' : fmtW(s.v[i])}</span>`).join('');
      tip.style.opacity = 1; tip.style.left = clamp(x(i) + 12, 0, W - 150) + 'px';
    };
    wrap.onpointerleave = () => { cross.style.opacity = 0; tip.style.opacity = 0; };
  };
  const ro = new ResizeObserver(draw); ro.observe(wrap); ctx.cleanup(() => ro.disconnect());
  return { el: wrap, setData: (d) => { data = d; draw(); } };
}

// Gruppierte Balken für die Langzeitstatistik
function barChart(ctx, { height = 200 }) {
  const wrap = h('div.chart', { style: { height: height + 'px' } });
  const tip = h('div.tip');
  let data = null;
  const draw = () => {
    const W = wrap.clientWidth; if (!W || !data) return;
    const H = height, padL = 42, padR = 8, padT = 10, padB = 22;
    const n = data.labels.length, ser = data.series;
    let hi = 0; for (const s of ser) for (const v of s.values) hi = Math.max(hi, v ?? 0);
    const step = niceStep(hi || 1); hi = Math.ceil((hi || 1) / step) * step;
    const y = (v) => padT + (H - padT - padB) * (1 - v / hi);
    const gw = (W - padL - padR) / n, bw = Math.max(2, Math.min(14, (gw * 0.8) / ser.length));
    const grid = [];
    for (let v = 0; v <= hi + 1e-6; v += step) grid.push(`<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text x="${padL - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v, step < 1 ? 1 : 0)}</text>`);
    const every = Math.ceil(n / Math.max(1, Math.floor((W - padL) / 46)));
    const bars = [], xl = [];
    data.labels.forEach((lb, i) => {
      const gx = padL + gw * i + (gw - bw * ser.length) / 2;
      ser.forEach((s, k) => { const v = s.values[i] ?? 0; bars.push(`<rect x="${gx + k * bw}" y="${y(v)}" width="${Math.max(1, bw - 1)}" height="${Math.max(0, y(0) - y(v))}" rx="2" style="fill:${s.color}"/>`); });
      if (i % every === 0) xl.push(`<text x="${padL + gw * i + gw / 2}" y="${H - 6}" text-anchor="middle">${lb}</text>`);
    });
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g class="grid">${grid.join('')}${xl.join('')}</g><rect class="hov" y="${padT}" height="${H - padT - padB}" width="${gw}"/>${bars.join('')}</svg>`;
    wrap.append(tip);
    const hov = wrap.querySelector('.hov');
    wrap.onpointermove = (e) => {
      const r = wrap.getBoundingClientRect();
      const i = clamp(Math.floor((e.clientX - r.left - padL) / gw), 0, n - 1);
      hov.setAttribute('x', padL + gw * i); hov.style.opacity = 1;
      tip.innerHTML = `<b>${data.full[i]}</b>` + ser.map((s) => `<span><i style="background:${s.color}"></i>${s.label} ${fmtKWh(s.values[i])}</span>`).join('');
      tip.style.opacity = 1; tip.style.left = clamp(padL + gw * i + gw + 8, 0, W - 170) + 'px';
    };
    wrap.onpointerleave = () => { hov.style.opacity = 0; tip.style.opacity = 0; };
  };
  const ro = new ResizeObserver(draw); ro.observe(wrap); ctx.cleanup(() => ro.disconnect());
  return { el: wrap, setData: (d) => { data = d; draw(); } };
}

const STAT_SERIES = [
  { src: 'pv_daily_energy', label: 'PV-Erzeugung', color: 'var(--amber)' },
  { src: 'grid_export_daily_energy', label: 'Ins Haus/Netz abgegeben', color: 'var(--cool)' },
  { src: 'grid_charge_daily_energy', label: 'Netzladung', color: 'var(--energy)' },
  { src: 'offgrid_daily_energy', label: 'Off-Grid', color: 'var(--media)' },
];

function statsCard(ctx) {
  const ser = STAT_SERIES.filter((s) => ctx.hasSrc(s.src));
  if (!ser.length || !ctx.hass.callWS) return null;
  let mode = store.get('xt500-energy-stat') || 'week';
  const chart = barChart(ctx, { height: 210 });
  const totals = h('div.totals'), status = h('small.load');
  const modes = [['week', '7 Tage'], ['month', '30 Tage'], ['year', '12 Monate']];
  const btns = modes.map(([m, l]) => h('button' + (m === mode ? '.sel' : ''), { onclick: () => { mode = m; store.set('xt500-energy-stat', m); btns.forEach((b, i) => b.classList.toggle('sel', modes[i][0] === m)); load(); } }, t(l)));
  const load = async () => {
    status.textContent = t('lädt …');
    const end = new Date(); const start = new Date(end);
    if (mode === 'year') { start.setMonth(start.getMonth() - 11, 1); start.setHours(0, 0, 0, 0); }
    else { start.setDate(start.getDate() - (mode === 'week' ? 6 : 29)); start.setHours(0, 0, 0, 0); }
    try {
      const res = await ctx.hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
        statistic_ids: ser.map((s) => ctx.srcId(s.src)), period: mode === 'year' ? 'month' : 'day', types: ['change'] });
      const buckets = [];
      for (const d = new Date(start); d <= end;) { buckets.push(new Date(d)); if (mode === 'year') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 1); }
      const keyOf = (d) => (mode === 'year' ? `${d.getFullYear()}-${d.getMonth()}` : d.toDateString());
      const idx = new Map(buckets.map((b, i) => [keyOf(b), i]));
      const series = ser.map((s) => {
        const values = buckets.map(() => 0);
        for (const r of res[ctx.srcId(s.src)] || []) { const i = idx.get(keyOf(new Date(r.start))); if (i != null) values[i] += Math.max(0, r.change ?? 0); }
        return { label: t(s.label), color: s.color, values };
      });
      const labels = buckets.map((b) => (mode === 'year' ? b.toLocaleDateString(NUMLOC, { month: 'short' }) : mode === 'week' ? b.toLocaleDateString(NUMLOC, { weekday: 'short' }) : String(b.getDate())));
      const full = buckets.map((b) => (mode === 'year' ? b.toLocaleDateString(NUMLOC, { month: 'long', year: 'numeric' }) : b.toLocaleDateString(NUMLOC, { weekday: 'short', day: 'numeric', month: 'numeric' })));
      chart.setData({ labels, full, series });
      fill(totals, series.map((s) => h('div.tot', null, h('i', { style: { background: s.color } }), h('span', null, s.label), h('b', null, fmtKWh(s.values.reduce((a, b) => a + b, 0))))));
      status.textContent = '';
    } catch (e) { console.error(e); status.textContent = t('Statistik konnte nicht geladen werden'); }
  };
  load();
  return card(t('Energie'), 'mdi:chart-bar', h('div.card-tools', null, h('div.seg', null, btns), status), chart.el, totals);
}

// Logbuch der Integration als lesbare Zeitleiste
const EVENT_KEYS = ['regulation_enabled', 'active_operation', 'cycle_state', 'full_charge_confirmation', 'discharge_hold', 'reserve_hold', 'data_valid',
  'pv_release_active', 'tariff_request', 'manual_active', 'discharge_override_active', 'recovery_status', 'status'];
const BIN_TEXT = {
  regulation_enabled: ['Energiemanager eingeschaltet', 'Energiemanager ausgeschaltet', 'mdi:brain'],
  discharge_hold: ['Entladesperre aktiv', 'Entladesperre aufgehoben', 'mdi:battery-lock'],
  reserve_hold: ['Reserve hält Entladung an', 'Reserve wieder frei', 'mdi:shield-home-outline'],
  data_valid: ['Messwerte wieder gültig', 'Messwerte ungültig', 'mdi:gauge'],
  pv_release_active: ['PV-Ausgabe freigegeben', 'PV-Ausgabe gesperrt', 'mdi:solar-power-variant'],
  tariff_request: ['Tarifladung angefordert', 'Tarifladung beendet', 'mdi:currency-eur'],
  manual_active: ['Zielladung gestartet', 'Zielladung beendet', 'mdi:target'],
  discharge_override_active: ['Temporäre Entladefreigabe', 'Entladefreigabe beendet', 'mdi:battery-lock-open'],
};
const ENUM_TEXT = {
  active_operation: ['Vorgang: {s}', 'mdi:steering'], cycle_state: ['Zyklus: {s}', 'mdi:battery-sync-outline'],
  full_charge_confirmation: ['Vollladung: {s}.', 'mdi:battery-check-outline'], recovery_status: ['Wiederherstellung: {s}', 'mdi:backup-restore'], status: ['Status: {s}', 'mdi:information-outline'],
};

async function loadEvents(ctx, hours, keys = EVENT_KEYS) {
  const byId = new Map(keys.filter((k) => ctx.id(k)).map((k) => [ctx.id(k), k]));
  if (!byId.size) return [];
  const end = new Date(), start = new Date(end - hours * 3600e3);
  const res = await ctx.hass.callWS({ type: 'logbook/get_events', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: [...byId.keys()] });
  const out = [];
  const last = {};
  for (const e of res || []) {
    const key = byId.get(e.entity_id);
    if (!key || e.state == null || BAD.has(e.state) || last[key] === e.state) continue;
    last[key] = e.state;
    let text, ic, tone = '';
    if (BIN_TEXT[key]) {
      const on = e.state === 'on';
      text = t(on ? BIN_TEXT[key][0] : BIN_TEXT[key][1]); ic = BIN_TEXT[key][2];
      const warn = key === 'data_valid' ? !on : ['discharge_hold', 'reserve_hold'].includes(key) ? on : false;
      tone = warn ? 'warn' : on ? 'ok' : '';
    } else if (ENUM_TEXT[key]) {
      if (key === 'full_charge_confirmation' && e.state === 'idle') continue;
      text = t(ENUM_TEXT[key][0], { s: ctx.sl(key, e.state) }); ic = ENUM_TEXT[key][1];
      tone = ['invalid_data', 'control_error', 'manual_required', 'exhausted', 'timeout'].includes(e.state) ? 'danger' : e.state === 'confirmed' ? 'ok' : '';
    } else continue;
    out.push({ when: new Date(e.when * 1000), key, state: e.state, text, icon: ic, tone });
  }
  // Statuswechsel weglassen, wenn im selben Moment ein aussagekräftigeres Ereignis steht
  const busy = (e) => out.some((o) => o !== e && o.key !== 'status' && Math.abs(o.when - e.when) < 5000);
  return out.filter((e) => e.key !== 'status' || e.tone === 'danger' || !busy(e)).reverse();
}

function eventsCard(ctx) {
  if (!ctx.hass.callWS) return null;
  const list = h('div.events'), status = h('small.load');
  let limit = 12, items = [];
  const more = h('button.btn.ghost.more', { onclick: () => { limit += 20; render(); } }, t('Mehr anzeigen'));
  const render = () => {
    fill(list, items.length ? items.slice(0, limit).map((e) => h('div.ev' + (e.tone ? '.' + e.tone : ''), null,
      h('span.ev-time', null, e.when.toDateString() === new Date().toDateString() ? fmtTime(e.when) : e.when.toLocaleDateString(NUMLOC, { day: 'numeric', month: 'numeric' })),
      h('span.ev-dot', null, icon(e.icon)), h('span.ev-t', null, e.text))) : h('p.hint', null, t('Keine Ereignisse im Zeitraum.')));
    more.hidden = items.length <= limit;
  };
  const load = async (hours) => {
    status.textContent = t('lädt …');
    try { items = await loadEvents(ctx, hours); render(); status.textContent = ''; }
    catch (e) { console.error(e); status.textContent = t('Verlauf konnte nicht geladen werden'); }
  };
  ctx.cache.loadEvents = load;
  return card(t('Was ist passiert?'), 'mdi:timeline-clock-outline', status, list, more);
}

function fullChargeCard(ctx) {
  if (!ctx.has('full_charge_confirmation') || !ctx.hass.callWS) return null;
  const list = h('div.fc'), last = h('p.hint.last');
  ctx.watch(() => { const s = ctx.st('cycle_start'); last.textContent = s && !BAD.has(s) ? t('Letzter manueller Start: {t}', { t: fmtDateTime(s) }) : ''; });
  // Aus dem Zykluszähler, falls das Logbuch (Recorder) ältere Einträge schon gelöscht hat
  const fromCounter = () => {
    const d = ctx.n('days_since_full');
    if (d == null) return null;
    const when = new Date(Date.now() - d * 864e5);
    return h('div.fc-r', null, icon('mdi:battery-check'), h('span', null, when.toLocaleDateString(NUMLOC, { weekday: 'short', day: 'numeric', month: 'long' })),
      h('small', null, t('laut Zykluszähler (vor {d} Tagen)', { d: fmt(Math.floor(d)) })));
  };
  const render = (done) => fill(list, done.length ? done.slice(0, 8).map((e) => h('div.fc-r', null, icon(e.state === 'confirmed' ? 'mdi:battery-check' : 'mdi:battery-clock-outline'),
    h('span', null, e.when.toLocaleDateString(NUMLOC, { weekday: 'short', day: 'numeric', month: 'long' })), h('small', null, ctx.sl('full_charge_confirmation', e.state))))
    : fromCounter() || h('p.hint', null, t('Noch keine Vollladung im Zeitraum.')));
  render([]);
  loadEvents(ctx, 120 * 24, ['full_charge_confirmation'])
    .then((ev) => render(ev.filter((e) => ['confirmed', 'timeout'].includes(e.state))))
    .catch(() => render([]));
  return card(t('Vollladungen'), 'mdi:battery-check-outline', h('p.hint', null, t('Bestätigte Vollladungen, soweit HA sie im Logbuch aufbewahrt.')), list, last);
}

// Heute und morgen: PV-Prognose gegen echte Leistung, Ladestand vorausgerechnet
function forecastCard(ctx) {
  if (!ctx.hass.callWS) return null;
  const kfmt = (v) => (Math.abs(v) >= 1000 ? fmt(v / 1000, 1) + 'k' : fmt(v));
  const fl = floorInfo(ctx);
  const pvChart = lineChart(ctx, { height: 180, yFmt: kfmt, now: true, series: [
    { key: 'pv', label: 'PV', color: 'var(--amber)', unit: 'W' },
    { key: 'fc', label: 'PV-Prognose', color: 'var(--amber)', unit: 'W', dash: true }] });
  const socChart = lineChart(ctx, { height: 160, yFmt: (v) => fmt(v) + '%', now: true, series: [
    { key: 'soc', label: 'Ladezustand', color: 'var(--energy)', unit: '%' },
    { key: 'sim', label: 'Prognose', color: 'var(--energy)', unit: '%', dash: true }],
  bands: [{ v: ctx.n('minimum_soc'), cls: 'mn', label: t('Entladegrenze') }, ...(fl.reserve ? [{ v: fl.soc, cls: 'rs', label: t('Reserve') }] : [])] });
  const info = h('div.fc-info'), status = h('small.load', null, t('lädt …'));
  const legend = h('div.legend.series', null, h('span', null, h('i', { style: { background: 'var(--amber)' } }), t('gemessen')), h('span.dashed', null, h('i'), t('Prognose')));
  const el = card(t('Prognose'), 'mdi:weather-partly-cloudy', status,
    h('div.sub-h', null, t('PV-Leistung heute und morgen')), pvChart.el,
    h('div.sub-h', null, t('Ladezustand')), socChart.el, legend, info);
  el.hidden = true;
  (async () => {
    const fc = await loadForecast(ctx);
    if (!fc || fc.none) return;
    el.hidden = false;
    const ids = [ctx.srcId('pv_power'), ctx.srcId('soc')].filter(Boolean);
    let hist = {};
    try {
      hist = await ctx.hass.callWS({ type: 'history/history_during_period', start_time: new Date(dayStart(0)).toISOString(), end_time: new Date().toISOString(),
        entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
    } catch { /* Prognose geht auch ohne Verlauf */ }
    const pts = (id) => (hist[id] || []).map((p) => [(p.lu ?? p.lc) * 1000, parseFloat(p.s)]).filter((p) => Number.isFinite(p[1]));
    const sim = simulate(ctx);
    const data = {
      start: dayStart(0), end: dayStart(2),
      pv: pts(ctx.srcId('pv_power')), soc: pts(ctx.srcId('soc')),
      fc: fc.periods.filter((p) => p.e > dayStart(0) && p.s < dayStart(2)).flatMap((p) => [[p.s, p.w], [p.e - 1, p.w]]),
      sim: sim ? sim.pts : [],
    };
    pvChart.setData(data);
    socChart.setData(data);
    const sum = forecastSummary(ctx);
    fill(info,
      h('div.kv', null, kvs([
        [t('Rest heute'), '≈ ' + fmtKWh(fcEnergy(fc, Date.now(), dayStart(1)))], [t('Morgen'), '≈ ' + fmtKWh(fcEnergy(fc, dayStart(1), dayStart(2)))],
        sum ? [t('Ladezustand'), sum.text.replace(/^[^:]+:\s*/, '')] : null, [t('Akkukapazität'), sim ? `${fmtKWh(sim.cap.kwh)} · ${sim.cap.src}` : t('unbekannt')],
      ])),
      h('p.hint', null, t('Grob geschätzt aus der PV-Prognose des Energie-Dashboards und dem typischen Hausverbrauch der letzten 48 h.') + (fc.used > 1 ? ' ' + t('Mittel aus {n} Prognosen.', { n: fc.used }) : '')));
    status.textContent = '';
  })().catch((e) => { console.error(e); status.textContent = t('Verlauf konnte nicht geladen werden'); });
  return el;
}

function historyView(ctx) {
  let hours = 24;
  const fl = floorInfo(ctx);
  const socChart = lineChart(ctx, { series: [SERIES[0]], area: true, height: 170, yFmt: (v) => fmt(v) + '%',
    bands: [{ v: ctx.n('minimum_soc'), cls: 'mn', label: t('Entladegrenze') }, ...(fl.reserve ? [{ v: fl.soc, cls: 'rs', label: t('Reserve') }] : [])] });
  const pw = SERIES.slice(1).filter((s) => seriesId(ctx, s));
  const pwChart = lineChart(ctx, { series: pw, height: 230, yFmt: (v) => (Math.abs(v) >= 1000 ? fmt(v / 1000, 1) + 'k' : fmt(v)) });
  const legend = h('div.legend.series', null, pw.map((s) => h('span', null, h('i', { style: { background: s.color } }), t(s.label) + (s.note ? t(s.note) : ''))));
  const status = h('small.load');
  const ev = eventsCard(ctx);
  const ranges = [6, 24, 48].map((hh) => h('button' + (hh === hours ? '.sel' : ''), { onclick: (e) => { hours = hh; ranges.forEach((b) => b.classList.toggle('sel', b === e.currentTarget)); load(); } }, hh + ' h'));
  const load = async () => {
    status.textContent = t('lädt …');
    ctx.cache.loadEvents?.(hours);
    try { const d = await loadHistory(ctx, hours); socChart.setData(d); pwChart.setData(d); status.textContent = ''; }
    catch (e) { console.error(e); status.textContent = t('Verlauf konnte nicht geladen werden'); }
  };
  load();
  return h('div.grid', null,
    h('div.span-12', null, h('div.seg.range-sel', null, ranges), status),
    h('div.span-8.stack', null, card(t('Ladezustand'), 'mdi:battery-medium', socChart.el), card(t('Leistung'), 'mdi:chart-bell-curve-cumulative', pwChart.el, legend)),
    h('div.span-4', null, ev),
    h('div.span-12', null, forecastCard(ctx)),
    h('div.span-8', null, statsCard(ctx)),
    h('div.span-4', null, fullChargeCard(ctx)));
}

// ---------- Technik ----------

function checkCard(ctx) {
  const list = h('div.checks');
  const entry = ctx.managerId && ctx.managerId !== 'default' ? `#config_entry=${ctx.managerId}` : '';
  const el = card(t('Einrichtungs-Check'), 'mdi:clipboard-check-outline', list,
    ctx.ro ? null : h('div.btns', null, h('button.btn.ghost', { onclick: () => navigate(`/config/integrations/integration/${DOMAIN}${entry}`) }, icon('mdi:cog-outline'), t('Integration öffnen'))));
  ctx.watch(() => {
    const issues = setupIssues(ctx);
    el.dataset.level = issues.some((i) => i.level === 'danger') ? 'danger' : issues.some((i) => i.level === 'warn') ? 'warn' : '';
    fill(list, issues.length ? issues.map((i) => h('div.chk.' + i.level, null, icon(i.level === 'info' ? 'mdi:information-outline' : 'mdi:alert-circle-outline'), h('div', null, h('b', null, i.title), h('small', null, i.text))))
      : h('div.chk.ok', null, icon('mdi:check-circle-outline'), h('div', null, h('b', null, t('Alles eingerichtet')), h('small', null, t('Alle benötigten Sensoren liefern Werte und die Regelung ist bereit.')))));
  });
  return el;
}

function regulationCard(ctx) {
  if (!ctx.has('control_band')) return null;
  const steps = ['small', 'medium', 'large'].map((b) => h('span.band-s', { 'data-b': b }, ctx.sl('control_band', b)));
  const err = h('b.err-v'), errBar = h('span.err-f'), meta = h('div.kv');
  const el = card(t('Regelung live'), 'mdi:pulse',
    h('div.bands', null, steps),
    h('div.err', null, h('span', null, t('Regelabweichung')), err, h('span.err-bar', null, errBar)),
    meta);
  ctx.watch(() => {
    const b = ctx.st('control_band'); steps.forEach((s) => s.classList.toggle('on', s.dataset.b === b));
    const e = ctx.n('control_error') ?? 0, big = ctx.n('control_large_error') ?? 150;
    err.textContent = fmtW(e);
    errBar.style.width = clamp((Math.abs(e) / big) * 100, 2, 100) + '%';
    const cap = capacity(ctx);
    fill(meta, kvs([
      [t('Regelabstand'), fmtUnit(ctx.n('control_interval'), 's')], [t('Max. Änderung'), fmtW(ctx.n('control_max_step'))],
      [t('Hausverbrauch (geschätzt)'), fmtW(ctx.n('estimated_home_load'))], [t('PV-Abregelung'), fmtW(ctx.n('pv_surplus_correction'))],
      ctx.has('active_coupling_mode') ? [t('Aktive PV'), ctx.sl('active_coupling_mode')] : null, [t('DC-PV-Freigabe'), ctx.on('pv_release_active') ? t('frei') : t('gesperrt')],
      [t('Akkukapazität'), cap ? `${fmtKWh(cap.kwh)} · ${cap.src}` : t('unbekannt')],
    ]));
  });
  return el;
}

function setpointCard(ctx) {
  const body = h('div.sp');
  const el = card(t('Sollwerte'), 'mdi:target-variant', h('p.hint', null, t('Was der Energiemanager berechnet und was am Gerät tatsächlich steht.')), body);
  ctx.watch(() => {
    const rows = [
      [t('Netzanschluss'), ctx.n('recommended_grid_setpoint'), ctx.srcN('grid_setpoint'), 'W'],
      [t('Wechselrichter-Obergrenze'), ctx.n('recommended_inverter_setpoint'), ctx.srcN('inverter_setpoint'), 'W'],
      [t('System-Ladegrenze'), ctx.n('desired_charge_limit'), ctx.srcN('max_charge_soc'), '%'],
      [t('System-Entladegrenze'), ctx.n('minimum_soc'), ctx.srcN('min_discharge_soc'), '%'],
    ].filter((r) => r[1] != null || r[2] != null);
    fill(body, h('div.sp-h', null, h('span'), h('span', null, t('berechnet')), h('span', null, t('am Gerät'))),
      rows.map(([n, a, b, u]) => {
        const f = (v) => (u === 'W' ? fmtW(v) : v == null ? '—' : fmt(v) + ' %');
        const diff = a != null && b != null && Math.abs(a - b) > (u === 'W' ? 50 : 0.5);
        return h('div.sp-r' + (diff ? '.diff' : ''), null, h('span', null, n), h('b', null, f(a)), h('b', null, f(b)));
      }));
  });
  return el;
}

function diagCard(ctx) {
  const body = h('div');
  const el = card(t('Diagnose'), 'mdi:stethoscope', body,
    h('div.rows', null, toggleRow(ctx, 'automatic_recovery_enabled', t('Automatische Fehlerwiederherstellung'), t('Versucht nach Schreibfehlern selbstständig neu zu starten.'))),
    h('div.btns', null, actionBtn(ctx, 'recalculate', t('Jetzt neu berechnen'), 'mdi:refresh', null, 'ghost')));
  ctx.watch(() => {
    const a = ctx.s('status')?.attributes || {};
    const errs = a.current_input_errors || [];
    const last = a.last_input_errors || [];
    fill(body,
      h('div.kv', null, kvs([
        [t('Status'), ctx.sl('status')], ctx.has('recovery_status') ? [t('Wiederherstellung'), `${ctx.sl('recovery_status')} (${a.recovery_attempts ?? 0}/${a.recovery_max_attempts ?? '–'})`] : null,
        [t('Kommunikation'), a.communication_pause ? t('Pause') : t('stabil')], a.source_polling_interval_seconds ? [t('Abfrageintervall'), fmtUnit(a.source_polling_interval_seconds, 's')] : null,
      ])),
      errs.length ? h('div.errs.now', null, h('b', null, t('Aktuelle Probleme')), errs.map((e) => h('div', null, `${e.input}: ${e.reason}`))) : null,
      !errs.length && last.length ? h('div.errs', null, h('b', null, t('Zuletzt behoben {t}', { t: fmtDateTime(a.last_inputs_recovered_at || a.last_input_error_at) })), last.map((e) => h('div', null, `${e.input}: ${e.reason}`))) : null);
  });
  return el;
}

function tuningCard(ctx) {
  const groups = [
    ['Regelgeschwindigkeit', 'mdi:speedometer', 'Wie schnell und in welchen Schritten der Sollwert nachgeführt wird.',
      ['control_small_error', 'control_large_error', 'control_slow_interval', 'control_medium_interval', 'control_fast_interval', 'control_small_max_step', 'control_medium_max_step', 'control_large_max_step', 'feedback_settle_time']],
    ['PV-Freigabe & Überschuss', 'mdi:solar-power-variant-outline', 'Ab wann PV genutzt wird und wie ruhig der Überschussmodus regelt.',
      ['pv_start_power', 'pv_stop_power', 'pv_start_delay', 'pv_surplus_deadband', 'pv_surplus_charge_reserve']],
    ['Vollladung bestätigen', 'mdi:battery-check-outline', 'Wann eine 100-%-Ladung als abgeschlossen gilt.',
      ['full_charge_min_hold_minutes', 'full_charge_taper_power', 'full_charge_taper_minutes', 'full_charge_timeout_minutes', 'full_charge_top_off_power', 'charge_soc_hysteresis']],
    ['Wiederherstellung', 'mdi:backup-restore', null, ['recovery_stability_time']],
  ];
  const parts = groups.map(([title, ic, help, keys]) => {
    const rows = keys.map((k) => stepRow(ctx, k)).filter(Boolean);
    return rows.length ? h('details.grp', null, h('summary', null, icon(ic), h('span', null, t(title)), h('small', null, t(rows.length === 1 ? '{n} Wert' : '{n} Werte', { n: rows.length })), icon('mdi:chevron-down')),
      help ? h('p.hint', null, t(help)) : null, h('div.rows', null, rows)) : null;
  }).filter(Boolean);
  return parts.length ? card(t('Feinabstimmung'), 'mdi:tune', h('p.hint', null, t('Nur ändern, wenn du weißt, was du tust. Die Standardwerte passen für die meisten Anlagen.')), parts) : null;
}

function technik(ctx) {
  return h('div.grid', null,
    h('div.span-6.stack', null, checkCard(ctx), regulationCard(ctx), diagCard(ctx)),
    h('div.span-6.stack', null, setpointCard(ctx), tuningCard(ctx)));
}

// ---------- Basisklasse ----------

const TABS = [
  { id: 'overview', label: 'Übersicht', icon: 'mdi:view-dashboard-outline', view: overview },
  { id: 'steuern', label: 'Steuern', icon: 'mdi:tune-vertical-variant', view: controls },
  { id: 'verlauf', label: 'Verlauf', icon: 'mdi:chart-timeline-variant', view: historyView },
  { id: 'technik', label: 'Technik', icon: 'mdi:cog-outline', view: technik },
];

class XT500Base extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._updaters = []; this._cleanups = []; this._ids = {}; this._pending = new Map(); this._cache = {}; this._seen = {};
  }

  setConfig(config) {
    this._config = config || {};
    if (this._hass) { this._sig = null; this.hass = this._hass; }
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    const lang = (hass.locale?.language || hass.language || 'de').toLowerCase();
    LANG = lang.startsWith('de') ? 'de' : 'en';
    NUMLOC = lang;
    // Manager nur neu suchen, wenn sich die Zahl der Entitäten ändert
    const nStates = Object.keys(hass.states).length;
    if (first || nStates !== this._nStates || !this._managers) { this._managers = findManagers(hass); this._nStates = nStates; }
    const wanted = this._config?.manager_id || this._manager;
    const id = this._managers.has(wanted) ? wanted : this._managers.keys().next().value;
    if (id !== this._manager) this._cache = {};
    this._manager = id; this._ids = this._managers.get(id) || {};
    this._ro = this._config?.read_only_for_non_admins !== false && !!hass.user && hass.user.is_admin === false;
    const dark = hass.themes?.darkMode;
    if (dark != null) this.toggleAttribute('light', !dark);
    const sig = [id, Object.keys(this._ids).length, this._managers.size, LANG, this._ro].join(':');
    if (first || sig !== this._sig) { this._sig = sig; this._snapshot(); this._render(); return; }
    if (this._changed()) this._update();
  }

  // Nur die Entitäten dieses Managers und seine Quellen beobachten
  _watched() {
    const ids = Object.values(this._ids);
    const a = this._hass.states[this._ids.status]?.attributes || {};
    for (const [k, v] of Object.entries(a)) if (k.startsWith('source_') && k.endsWith('_entity') && v) ids.push(v);
    return ids;
  }

  _snapshot() { this._seen = {}; for (const id of this._watched()) this._seen[id] = this._hass.states[id]; }

  _changed() {
    let changed = false;
    for (const id of this._watched()) if (this._hass.states[id] !== this._seen[id]) { changed = true; this._seen[id] = this._hass.states[id]; }
    return changed;
  }

  _update() {
    for (const fn of this._updaters) { try { fn(); } catch (e) { console.error('xt500-energy', e); } }
    this._checkPending();
    const fc = this._cache.fc;
    if (this._c && fc && Date.now() - fc.at > 30 * 60e3 && !this._cache.fcBusy) loadForecast(this._c).then(() => this._update());
  }

  _startForecast(ctx) {
    if (!this._hass.callWS) return;
    energyPrefs(ctx).then(() => this._update());
    loadForecast(ctx).then(() => this._update());
  }

  _ctx() {
    this._c = makeCtx(this);
    return this._c;
  }

  _set(key, value) {
    const id = this._ids[key]; if (!id) return;
    if (this._ro) return this._toast(t('Nur Administratoren dürfen Einstellungen ändern.'), true);
    const d = id.split('.')[0];
    const label = LABELS[key] ? L2(LABELS[key]) : key;
    let call;
    if (d === 'number') { call = ['number', 'set_value', { entity_id: id, value }]; this._expect(key, { kind: 'num', v: value, tol: (this._hass.states[id]?.attributes?.step ?? 1) / 2, label }); }
    if (d === 'select') { call = ['select', 'select_option', { entity_id: id, option: value }]; this._expect(key, { kind: 'eq', v: value, label }); }
    if (d === 'switch') { call = ['switch', value ? 'turn_on' : 'turn_off', { entity_id: id }]; this._expect(key, { kind: 'eq', v: value ? 'on' : 'off', label }); }
    if (d === 'time') { call = ['time', 'set_value', { entity_id: id, time: value }]; this._expect(key, { kind: 'time', v: value, label }); }
    if (d === 'button') call = ['button', 'press', { entity_id: id }];
    if (call) return this._call(...call);
  }

  // Rückmeldung: warten, bis HA den neuen Zustand meldet
  _expect(key, p) {
    p.until = Date.now() + 10000;
    this._pending.set(key, p);
    this._markPending();
    setTimeout(() => this._checkPending(), 10100);
  }

  _checkPending() {
    if (!this._pending.size) return;
    for (const [key, p] of this._pending) {
      const s = this._hass.states[this._ids[key]]?.state;
      const ok = s != null && (p.kind === 'num' ? Math.abs(parseFloat(s) - p.v) <= p.tol + 1e-9 : p.kind === 'time' ? s.slice(0, 5) === String(p.v).slice(0, 5) : s === p.v);
      if (ok) this._pending.delete(key);
      else if (Date.now() > p.until) { this._pending.delete(key); this._toast(t('Nicht übernommen: {l}', { l: p.label }), true); }
    }
    this._markPending();
  }

  _markPending() {
    this.shadowRoot.querySelectorAll('[data-pk]').forEach((el) => el.classList.toggle('pending', this._pending.has(el.dataset.pk)));
  }

  async _call(domain, service, data) {
    try { await this._hass.callService(domain, service, data); }
    catch (e) {
      for (const [k, id] of Object.entries(this._ids)) if (id === data.entity_id) this._pending.delete(k);
      this._markPending();
      this._toast(t('Fehler: {e}', { e: e.message || e }), true);
    }
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
  }

  _toast(msg, bad) {
    const tEl = this.shadowRoot.querySelector('.toast'); if (!tEl) return;
    tEl.textContent = msg; tEl.classList.toggle('bad', !!bad); tEl.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => tEl.classList.remove('show'), 3200);
  }

  _confirm({ title, text, ok = t('OK'), tone = '', noCancel = false }) {
    return new Promise((resolve) => {
      const close = (v) => { dlg.remove(); resolve(v); };
      const dlg = h('div.modal', { onclick: (e) => { if (e.target === dlg) close(false); } },
        h('div.dialog', { role: 'dialog', 'aria-modal': 'true' }, h('h3', null, title), h('p', null, text),
          h('div.btns', null, noCancel ? null : h('button.btn.ghost', { onclick: () => close(false) }, t('Abbrechen')), h('button.btn' + (tone ? '.' + tone : ''), { onclick: () => close(true) }, ok))));
      (this.shadowRoot.querySelector('.app') || this.shadowRoot).append(dlg);
      dlg.querySelector('.btn:last-child').focus();
    });
  }

  _help(key, title) { return this._confirm({ title, text: L2(HELP[key]), ok: t('Schließen'), noCancel: true }); }

  _reset() { this._cleanups.forEach((f) => f()); this._cleanups = []; this._updaters = []; }
}

// ---------- Hauptkarte ----------

class XT500EnergyCard extends XT500Base {
  constructor() {
    super();
    this._tab = store.get('xt500-energy-tab') || 'overview';
  }

  static getConfigElement() { return document.createElement('xt500-energy-card-editor'); }
  static getStubConfig() { return {}; }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }

  _render() {
    this._reset();
    const root = this.shadowRoot;
    root.replaceChildren(h('style', { text: CSS }));
    if (!this._ids.status) {
      root.append(h('div.app', null, h('section.card.empty', null, icon('mdi:home-battery-outline'), h('h2', null, t('Noch kein XT500 eingerichtet')),
        h('p', null, t('Richte zuerst „XT500 Energy Manager“ unter Einstellungen → Geräte & Dienste ein.')))));
      return;
    }
    const ctx = this._ctx();
    this._startForecast(ctx);
    const live = h('span.live');
    const tabs = TABS.map((tb) => h('button.tab' + (tb.id === this._tab ? '.sel' : ''), { 'data-tab': tb.id, role: 'tab', onclick: () => this._setTab(tb.id) }, icon(tb.icon), h('span', null, t(tb.label))));
    const managerSel = this._managers.size > 1 ? h('select.mgr', { 'aria-label': t('Manager'), onchange: (e) => { this._config = { ...this._config, manager_id: e.target.value }; this._sig = null; this.hass = this._hass; } },
      [...this._managers.entries()].map(([m, ids], i) => h('option', { value: m, selected: m === this._manager ? true : null }, managerName(this._hass, ids, `XT500 ${i + 1}`)))) : null;
    this._content = h('main.content');
    root.append(h('div.app' + (this._ro ? '.ro' : ''), null,
      h('header.top', null,
        h('div.brand', null, h('span.logo', null, icon('mdi:home-battery')), h('div', null, h('h1', null, t('Energiemanager')), h('small', null, managerName(this._hass, this._ids, 'XT500')))),
        managerSel, live),
      h('nav.tabs', { role: 'tablist' }, tabs),
      this._content,
      h('div.toast', { role: 'status' }),
      h('footer.foot', null, `XT500 Energy Manager ${VERSION}`)));
    ctx.watch(() => {
      const st = ctx.st('status');
      const tone = !ctx.on('regulation_enabled') || st === 'disabled' ? 'muted' : ['invalid_data', 'control_error'].includes(st) ? 'danger' : st === 'communication_pause' ? 'warn' : 'ok';
      live.dataset.tone = tone;
      live.textContent = t({ muted: 'Aus', danger: 'Störung', warn: 'Pause', ok: 'Regelt' }[tone]);
    });
    this._renderTab();
  }

  _renderTab() {
    const keep = this._updaters.slice(0, 1);
    this._cleanups.forEach((f) => f()); this._cleanups = [];
    this._updaters = keep;
    const tab = TABS.find((tb) => tb.id === this._tab) || TABS[0];
    this._content.replaceChildren(tab.view(this._c));
    this.shadowRoot.querySelectorAll('.tab').forEach((b) => { b.classList.toggle('sel', b.dataset.tab === tab.id); b.setAttribute('aria-selected', b.dataset.tab === tab.id); });
    this._markPending();
  }

  _setTab(id) {
    this._tab = id;
    store.set('xt500-energy-tab', id);
    this._renderTab();
  }
}

// ---------- Kompaktkarte für beliebige Dashboards ----------

class XT500EnergyMiniCard extends XT500Base {
  static getConfigElement() { const e = document.createElement('xt500-energy-card-editor'); e.mini = true; return e; }
  static getStubConfig() { return { show_stats: true }; }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 12, rows: 'auto', min_columns: 6 }; }

  _render() {
    this._reset();
    const root = this.shadowRoot;
    root.replaceChildren(h('style', { text: CSS + MINI_CSS }));
    if (!this._ids.status) { root.append(h('ha-card.mini', null, h('div.mini-empty', null, icon('mdi:home-battery-outline'), t('Noch kein XT500 eingerichtet')))); return; }
    const ctx = this._ctx();
    const r = ring(92);
    const title = h('b.mini-title'), text = h('small.mini-text'), etaEl = h('small.mini-eta'), dot = h('span.mini-dot');
    const stats = h('div.mini-stats');
    const show = this._config?.show_stats !== false;
    const elc = h('ha-card.mini', { tabindex: 0, role: 'button', onclick: () => {
      const p = this._config?.navigation_path;
      if (p) navigate(p); else ctx.moreInfo(ctx.id('status'));
    } }, h('div.mini-row', null, r.el, h('div.mini-t', null, h('div.mini-name', null, dot, h('span', null, managerName(this._hass, this._ids, 'XT500'))), title, text, etaEl)), show ? stats : null);
    root.append(elc);
    learnCapacity(ctx);
    this._startForecast(ctx);
    ctx.watch(() => {
      const { p } = r.update(ctx);
      const d = describe(ctx);
      elc.dataset.tone = d.tone;
      elc.dataset.flow = p.charge > 15 ? 'charge' : '';
      title.textContent = d.title;
      text.textContent = ctx.sl('status');
      const f = d.tone !== 'danger' ? forecastSummary(ctx) : null;
      const e = d.tone === 'ok' && !f ? eta(ctx) : null;
      etaEl.textContent = f ? f.text : e ? e.text : '';
      dot.dataset.bad = setupIssues(ctx).some((i) => i.level !== 'info') ? '1' : '';
      if (show) fill(stats,
        [['mdi:solar-power-variant', t('PV'), fmtW(p.solar), 'amber'], ['mdi:home-outline', t('Haus'), fmtW(p.home), 'text'],
          p.grid != null ? ['mdi:transmission-tower', t('Netz'), (p.grid < -15 ? '−' : '') + fmtW(Math.abs(p.grid)), 'cool'] : null]
          .filter(Boolean).map(([ic, l, v, tone]) => h('div.mini-s', { 'data-tone': tone }, icon(ic), h('span', null, l), h('b', null, v))));
    });
  }
}

// ---------- Editor ----------

class XT500EnergyEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }

  _schema() {
    const managers = this._hass ? findManagers(this._hass) : new Map();
    const options = [{ value: '', label: t('Erster gefundener') }, ...[...managers.entries()].map(([m, ids]) => ({ value: m, label: managerName(this._hass, ids, m) }))];
    return [
      { name: 'manager_id', selector: { select: { options, mode: 'dropdown' } } },
      ...(this.mini ? [{ name: 'navigation_path', selector: { text: {} } }, { name: 'show_stats', selector: { boolean: {} } }] : [{ name: 'read_only_for_non_admins', selector: { boolean: {} } }]),
      { name: 'capacity_kwh', selector: { number: { min: 0.5, max: 50, step: 0.1, mode: 'box', unit_of_measurement: 'kWh' } } },
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    const lang = (this._hass.locale?.language || this._hass.language || 'de').toLowerCase();
    LANG = lang.startsWith('de') ? 'de' : 'en';
    const labels = { manager_id: t('Manager'), navigation_path: t('Ziel beim Antippen (z. B. /xt500-neu)'), show_stats: t('Kennzahlen anzeigen'), read_only_for_non_admins: t('Nicht-Admins nur Anzeige'), capacity_kwh: t('Akkukapazität in kWh (leer = automatisch)') };
    const data = { show_stats: true, read_only_for_non_admins: true, manager_id: '', ...this._config };
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => labels[s.name] || s.name;
      this._form.addEventListener('value-changed', (e) => {
        const cfg = { ...e.detail.value };
        for (const k of ['manager_id', 'navigation_path', 'capacity_kwh']) if (cfg[k] === '' || cfg[k] == null) delete cfg[k];
        this._config = cfg;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.replaceChildren(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = data;
  }
}

// ---------- Stil (Cockpit-Tokens) ----------

const CSS = `
:host {
  --bg: #0b0d11; --surface: #151820; --surface-2: #1b1f29; --surface-3: #232835;
  --border: rgba(255,255,255,.06); --border-strong: rgba(255,255,255,.12);
  --text: #eceef2; --muted: #8d93a0; --faint: #5c6270;
  --amber: #f5b84a; --energy: #3fd0a4; --cool: #5aa7ff; --heat: #ff8a4c; --media: #a78bfa;
  --danger: #ff6b6b; --warn: #f5b84a; --ok: #3fd0a4; --accent: #7aa2ff;
  --radius: 18px; --radius-sm: 12px; --gap: 12px;
  --shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 8px 24px rgba(0,0,0,.25);
  --ease: cubic-bezier(.2,.8,.2,1);
  display: block; color: var(--text); background: var(--bg);
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased; min-height: 100%;
}
:host([light]) {
  --bg: #eef0f4; --surface: #fff; --surface-2: #f5f6f9; --surface-3: #eceef3;
  --border: rgba(15,20,30,.07); --border-strong: rgba(15,20,30,.14);
  --text: #14171d; --muted: #646b78; --faint: #9aa0ab;
  --amber: #e9a020; --energy: #12a77c; --cool: #2f7fe0; --heat: #ec6a2a; --media: #7c5ce6;
  --danger: #e0393e; --warn: #d8901a; --ok: #12a77c; --accent: #3d6fe8;
  --shadow: 0 1px 2px rgba(15,20,30,.05), 0 6px 20px rgba(15,20,30,.05);
}
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; text-align: left; }
ha-icon { --mdc-icon-size: 20px; display: inline-flex; }
h1, h2, h3, p { margin: 0; }
[hidden] { display: none !important; }

.app { container-type: inline-size; max-width: 1280px; margin: 0 auto; padding: 16px 16px 40px; position: relative; }
.top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.brand { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.logo { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; color: var(--energy); flex: none;
  background: color-mix(in srgb, var(--energy) 14%, var(--surface)); border: 1px solid color-mix(in srgb, var(--energy) 30%, transparent); }
.logo ha-icon { --mdc-icon-size: 24px; }
.brand h1 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
.brand small { color: var(--muted); font-size: 12.5px; }
.live { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 99px; font-size: 12.5px; font-weight: 600; background: var(--surface); border: 1px solid var(--border); white-space: nowrap; }
.live::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c, var(--ok)); animation: pulse 2s infinite; }
.live[data-tone="muted"] { --c: var(--faint); } .live[data-tone="danger"] { --c: var(--danger); } .live[data-tone="warn"] { --c: var(--warn); }
.live[data-tone="muted"]::before { animation: none; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c, var(--ok)) 60%, transparent); } 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.mgr { background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 7px 10px; font: inherit; max-width: 40%; }

.tabs { display: flex; gap: 4px; padding: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 14px; position: sticky; top: 8px; z-index: 5; }
.tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 6px; border-radius: 10px; color: var(--muted); font-weight: 600; font-size: 13.5px; transition: background .2s, color .2s; }
.tab:hover { color: var(--text); }
.tab.sel { background: var(--surface-3); color: var(--text); box-shadow: var(--shadow); }
.tab ha-icon { --mdc-icon-size: 18px; }
@container (max-width: 520px) { .tab { flex-direction: column; gap: 2px; font-size: 11px; padding: 7px 2px; } }

.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--gap); }
.grid > * { grid-column: span 12; min-width: 0; }
.grid > :empty { display: none; }
.stack { display: flex; flex-direction: column; gap: var(--gap); }
@container (min-width: 760px) { .span-6 { grid-column: span 6; } .span-4 { grid-column: span 6; } .span-5 { grid-column: span 5; } .span-7 { grid-column: span 7; } }
@container (min-width: 1080px) { .span-4 { grid-column: span 4; } .span-8 { grid-column: span 8; } }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); height: 100%; }
.stack > .card { height: auto; }
.card-h { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--muted); }
.card-h h3 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.card-h ha-icon { --mdc-icon-size: 18px; }
.card-tools { display: flex; align-items: center; gap: 10px; margin: -4px 0 10px; flex-wrap: wrap; }
.hint { color: var(--muted); font-size: 12.5px; margin: -4px 0 12px; }
.ladder + .hint { margin: 12px 0 0; }
.hint.last { margin: 10px 0 0; } .hint.last:empty { display: none; }
.sub-h { color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin: 16px 0 8px; }

.banner { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 14px; font-size: 13.5px;
  background: color-mix(in srgb, var(--warn) 13%, var(--surface)); border: 1px solid color-mix(in srgb, var(--warn) 35%, transparent); color: var(--text); }
.banner > span { flex: 1; } .banner > ha-icon:first-child { color: var(--warn); }
.banner[data-level="danger"] { background: color-mix(in srgb, var(--danger) 13%, var(--surface)); border-color: color-mix(in srgb, var(--danger) 40%, transparent); }
.banner[data-level="danger"] > ha-icon:first-child { color: var(--danger); }
.banner.info { background: color-mix(in srgb, var(--accent) 10%, var(--surface)); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
.banner.info > ha-icon:first-child { color: var(--accent); }

/* Hero */
.hero { display: flex; gap: 22px; align-items: center; position: relative; overflow: hidden; }
.hero::after { content: ""; position: absolute; inset: auto -20% -60% 30%; height: 120%; pointer-events: none; background: radial-gradient(closest-side, color-mix(in srgb, var(--tone, var(--energy)) 14%, transparent), transparent); }
[data-tone="danger"] { --tone: var(--danger); } [data-tone="warn"] { --tone: var(--warn); } [data-tone="info"] { --tone: var(--cool); } [data-tone="muted"] { --tone: var(--faint); }
.hero[data-tone="danger"] { border-color: color-mix(in srgb, var(--danger) 35%, transparent); }
.hero-ring { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 0 0 auto; }
.ring { position: relative; flex: none; }
.ring svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.ring circle { fill: none; stroke-width: 14; }
.ring .trk { stroke: var(--surface-3); }
.ring .zone { opacity: .28; } .ring .zone.min { stroke: var(--danger); } .ring .zone.res { stroke: var(--warn); }
.ring .val { stroke: var(--energy); stroke-linecap: round; transition: stroke-dasharray .8s var(--ease); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--energy) 50%, transparent)); }
[data-flow="charge"] .ring .val { animation: glow 2.4s ease-in-out infinite; }
@keyframes glow { 50% { filter: drop-shadow(0 0 14px color-mix(in srgb, var(--energy) 80%, transparent)); } }
.ring line { stroke-width: 3; stroke-linecap: round; }
.ring line.tg { stroke: var(--text); } .ring line.rs { stroke: var(--warn); } .ring line.mn { stroke: var(--danger); }
.ring-c { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.ring-v { font-size: 44px; font-weight: 700; letter-spacing: -.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.ring-v span { font-size: 20px; color: var(--muted); margin-left: 2px; }
.ring-s { color: var(--muted); font-size: 12.5px; margin-top: 4px; }
[data-flow="charge"] .ring-s { color: var(--energy); }
.legend { display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: center; font-size: 11.5px; color: var(--muted); }
.lg::before { content: ""; display: inline-block; width: 10px; height: 3px; border-radius: 2px; margin-right: 5px; vertical-align: middle; background: var(--text); }
.lg.rs::before { background: var(--warn); } .lg.mn::before { background: var(--danger); }
.hero-t { flex: 1; min-width: 0; position: relative; z-index: 1; }
.eyebrow { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--tone, var(--energy)); margin-bottom: 6px; }
.hero h2 { font-size: 24px; line-height: 1.2; font-weight: 700; letter-spacing: -.015em; margin-bottom: 8px; }
.hero p { color: var(--muted); font-size: 14px; }
.eta { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 13px; font-weight: 600; color: var(--energy); }
.eta:empty { display: none; } .eta ha-icon { --mdc-icon-size: 16px; } .eta .help { color: var(--muted); }
.hero[data-flow="discharge"] .eta { color: var(--text); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 99px; font-size: 12.5px; background: var(--surface-2); border: 1px solid var(--border); }
.chip ha-icon { --mdc-icon-size: 15px; color: var(--muted); }
.chip.accent ha-icon { color: var(--accent); } .chip.energy ha-icon { color: var(--energy); } .chip.warn { color: var(--warn); }
@container (max-width: 560px) { .hero { flex-direction: column; text-align: center; } .chips, .eta { justify-content: center; } .hero h2 { font-size: 21px; } }

/* Energiefluss */
.fl-stage { position: relative; height: 250px; }
.fl-lines { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.fl-lines path { fill: none; stroke: var(--border-strong); stroke-width: 2; stroke-linecap: round; transition: stroke .4s; }
.fl-lines path.active { stroke: color-mix(in srgb, var(--energy) 45%, transparent); }
.fl-lines [data-k^="solar"].active { stroke: color-mix(in srgb, var(--amber) 55%, transparent); }
.fl-lines [data-k^="grid"].active { stroke: color-mix(in srgb, var(--cool) 55%, transparent); }
.fl-dot { fill: var(--energy); filter: drop-shadow(0 0 4px var(--energy)); }
.fl-dot.solar { fill: var(--amber); filter: drop-shadow(0 0 4px var(--amber)); }
.fl-dot.grid { fill: var(--cool); filter: drop-shadow(0 0 4px var(--cool)); }
.fl-node { position: absolute; display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 84px; --c: var(--text); }
.fl-node.na { opacity: .45; }
.fl-node[data-tone="amber"] { --c: var(--amber); } .fl-node[data-tone="energy"] { --c: var(--energy); } .fl-node[data-tone="cool"] { --c: var(--cool); }
.fl-ic { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--surface-2); color: var(--c); border: 2px solid color-mix(in srgb, var(--c) 40%, transparent); margin-bottom: 4px; transition: box-shadow .4s; }
.fl-ic ha-icon { --mdc-icon-size: 24px; }
.fl-node.battery .fl-ic { background: linear-gradient(to top, color-mix(in srgb, var(--energy) 30%, var(--surface-2)) var(--soc, 0%), var(--surface-2) var(--soc, 0%)); }
.fl-val, .fl-sub, .fl-label { background: var(--surface); padding: 0 4px; border-radius: 6px; position: relative; }
.fl-val { font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
.fl-label { font-size: 11.5px; color: var(--muted); }
.fl-sub { font-size: 11.5px; color: var(--muted); white-space: nowrap; }
.fl-sub:empty { display: none; }
.fl-node.solar { left: 50%; top: 0; transform: translateX(-50%); }
.fl-node.battery { left: 0; top: 50%; transform: translateY(-50%); }
.fl-node.grid { right: 0; top: 50%; transform: translateY(-50%); }
.fl-node.home { left: 50%; bottom: 0; transform: translateX(-50%); }
.flow[data-sun="1"] .fl-node.solar .fl-ic { box-shadow: 0 0 24px color-mix(in srgb, var(--amber) 50%, transparent); }

/* Gesundheit */
.health { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 8px; }
@container (max-width: 640px) { .health { grid-template-columns: repeat(2, 1fr); } }
.hl { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; position: relative; transition: background .2s; min-width: 0; }
.hl:hover { background: var(--surface-2); }
.hl .dot { position: absolute; left: 34px; top: 9px; width: 9px; height: 9px; border-radius: 50%; background: var(--ok); border: 2px solid var(--surface); }
.hl.bad .dot { background: var(--danger); animation: pulse 1.6s infinite; --c: var(--danger); }
.hl-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-2); color: var(--muted); flex: none; }
.hl-t { display: flex; flex-direction: column; min-width: 0; }
.hl-t b { font-size: 13px; } .hl-t small { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hl.bad small { color: var(--danger); }

/* Vorrang-Treppe */
.ladder { display: flex; flex-direction: column; gap: 6px; }
.lvl { display: grid; grid-template-columns: 18px 34px 1fr auto; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; border: 1px solid transparent; opacity: .62; transition: all .3s var(--ease); }
.lvl-n { color: var(--faint); font-size: 12px; font-weight: 700; text-align: center; }
.lvl-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-2); color: var(--muted); }
.lvl-t { display: flex; flex-direction: column; min-width: 0; } .lvl-t b { font-size: 13.5px; } .lvl-t small { color: var(--muted); font-size: 12px; }
.lvl-badge { display: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--accent); padding: 3px 8px; border-radius: 99px; background: color-mix(in srgb, var(--accent) 14%, transparent); }
.lvl.act { opacity: 1; background: color-mix(in srgb, var(--accent) 8%, var(--surface-2)); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
.lvl.act .lvl-ic { color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, transparent); }
.lvl.act .lvl-badge { display: inline-block; }
.lvl.pending { opacity: .95; } .lvl.pending small { color: var(--warn); }

/* Heute */
.today { display: flex; flex-direction: column; gap: 4px; }
.today-r { display: grid; grid-template-columns: 30px 1fr auto; grid-template-rows: auto 4px; align-items: center; column-gap: 10px; row-gap: 4px; padding: 7px 4px; border-radius: 10px; --c: var(--energy); }
.today-r[data-tone="amber"] { --c: var(--amber); } .today-r[data-tone="cool"] { --c: var(--cool); } .today-r[data-tone="media"] { --c: var(--media); }
.today-ic { grid-row: span 2; color: var(--c); display: grid; place-items: center; }
.today-l { color: var(--muted); font-size: 13px; }
.tv { font-variant-numeric: tabular-nums; font-size: 14px; }
.tb { grid-column: 2 / 4; height: 4px; border-radius: 4px; background: var(--surface-3); overflow: hidden; }
.tb-f { display: block; height: 100%; background: var(--c); border-radius: 4px; transition: width .8s var(--ease); }

/* Zyklus */
.cy-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.cy-days b { font-size: 34px; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.cy-days span { color: var(--muted); }
.cy-st { text-align: right; display: flex; flex-direction: column; } .cy-st small { font-weight: 600; } .cy-next { color: var(--muted); font-size: 12.5px; }
.card[data-due="1"] .cy-st small { color: var(--warn); } .card[data-run="1"] .cy-st small { color: var(--energy); }
.cy-bar { height: 10px; border-radius: 10px; background: var(--surface-3); overflow: hidden; }
.cy-f { display: block; height: 100%; border-radius: 10px; background: linear-gradient(90deg, color-mix(in srgb, var(--energy) 60%, transparent), var(--energy)); transition: width .8s var(--ease); }
.card[data-due="1"] .cy-f { background: linear-gradient(90deg, color-mix(in srgb, var(--warn) 60%, transparent), var(--warn)); }
.cy-conf { color: var(--energy); font-size: 12.5px; margin-top: 8px; }
.cy-fc { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; padding: 9px 11px; border-radius: 11px; font-size: 12.5px; background: color-mix(in srgb, var(--warn) 12%, var(--surface-2)); color: var(--text); }
.cy-fc[data-ok="1"] { background: color-mix(in srgb, var(--amber) 10%, var(--surface-2)); }
.cy-fc:empty { display: none; } .cy-fc ha-icon { --mdc-icon-size: 18px; color: var(--amber); flex: none; }
.fc-today { width: 100%; margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); display: flex; flex-direction: column; gap: 4px; }
.fct-h { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.fct-h ha-icon { --mdc-icon-size: 16px; color: var(--amber); }
.fct { display: flex; justify-content: space-between; font-size: 13px; } .fct span { color: var(--muted); } .fct b { font-variant-numeric: tabular-nums; }
.eta.fcl { color: var(--muted); font-weight: 500; margin-top: 4px; } .eta.fcl ha-icon { color: var(--amber); }

/* Bedienelemente */
.btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-weight: 600; font-size: 13.5px; background: var(--accent); color: #fff; transition: transform .15s, filter .2s; }
.btn:hover { filter: brightness(1.08); } .btn:active { transform: scale(.97); }
.btn ha-icon { --mdc-icon-size: 18px; }
.btn.ghost { background: var(--surface-2); color: var(--text); border: 1px solid var(--border-strong); }
.btn.danger { background: var(--danger); }
.rows { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--border); }
.rows > .row:first-child { border-top: 0; }
.row-ic { color: var(--muted); display: grid; }
.row-t { flex: 1; min-width: 0; display: flex; flex-direction: column; } .row-t b { font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 4px; } .row-t small { color: var(--muted); font-size: 12.5px; }
.help { color: var(--faint); display: inline-grid; place-items: center; border-radius: 50%; } .help:hover { color: var(--accent); } .help ha-icon { --mdc-icon-size: 16px; }
.row.range { flex-wrap: wrap; row-gap: 8px; }
.row.range input { flex: 1 0 100%; }
.row.disabled { opacity: .45; pointer-events: none; }
.rv, .sv { font-weight: 700; font-variant-numeric: tabular-nums; font-size: 15px; }
input[type=range] { -webkit-appearance: none; appearance: none; height: 28px; background: transparent; margin: 0; --c: var(--accent); }
.range.energy input { --c: var(--energy); } .range.danger input { --c: var(--danger); } .range.warn input { --c: var(--warn); }
input[type=range]::-webkit-slider-runnable-track { height: 8px; border-radius: 8px; background: linear-gradient(90deg, var(--c) var(--p, 0%), var(--surface-3) var(--p, 0%)); }
input[type=range]::-moz-range-track { height: 8px; border-radius: 8px; background: linear-gradient(90deg, var(--c) var(--p, 0%), var(--surface-3) var(--p, 0%)); }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; margin-top: -8px; border-radius: 50%; background: #fff; border: 3px solid var(--c); box-shadow: 0 2px 8px rgba(0,0,0,.3); }
input[type=range]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid var(--c); }
.stepper { display: flex; align-items: center; gap: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 11px; padding: 3px; }
.stepper button { width: 32px; height: 30px; border-radius: 8px; display: grid; place-items: center; color: var(--muted); }
.stepper button:hover { background: var(--surface-3); color: var(--text); }
.stepper .sv { min-width: 70px; text-align: center; font-size: 14px; }
.time { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 7px 10px; font: inherit; color-scheme: dark; }
:host([light]) .time { color-scheme: light; }
.switch { width: 50px; height: 30px; border-radius: 30px; background: var(--surface-3); position: relative; flex: none; transition: background .25s; border: 1px solid var(--border-strong); }
.switch .knob { position: absolute; top: 2px; left: 2px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform .25s var(--ease); box-shadow: 0 2px 6px rgba(0,0,0,.3); }
.switch.on { background: var(--energy); border-color: transparent; } .switch.on .knob { transform: translateX(20px); }

/* Rückmeldung, während eine Änderung übernommen wird */
.pending .row-t b::after, .big-toggle.pending::after { content: ""; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--accent); border-right-color: transparent; animation: spin .8s linear infinite; margin-left: 6px; }
.choice.pending, .switch.pending { animation: breathe 1.2s ease-in-out infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes breathe { 50% { opacity: .55; } }

/* Nur-Anzeige */
.ro .ctl { pointer-events: none; opacity: .55; filter: saturate(.6); }

.choice { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
.choice.compact { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.opt { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border-radius: 13px; background: var(--surface-2); border: 1.5px solid var(--border); transition: all .2s var(--ease); }
.opt:hover { border-color: var(--border-strong); }
.opt-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-3); color: var(--muted); flex: none; }
.opt-t { display: flex; flex-direction: column; } .opt-t b { font-size: 13.5px; } .opt-t small { color: var(--muted); font-size: 12px; line-height: 1.35; margin-top: 2px; }
.choice.compact .opt { align-items: center; padding: 9px 10px; }
.opt.sel { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--surface-2)); }
.opt.sel .opt-ic { background: var(--accent); color: #fff; }

.main .main-row { display: flex; align-items: center; gap: 12px; }
.main-ic { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: color-mix(in srgb, var(--energy) 15%, transparent); color: var(--energy); flex: none; }
.main[data-off="1"] .main-ic { background: var(--surface-3); color: var(--faint); }
.main[data-off="1"] .choice, .main[data-off="1"] .rows { opacity: .5; }
.big-toggle { width: 100%; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 14px; font-weight: 700; font-size: 15px; background: var(--energy); color: #06291f; transition: all .2s; }
.big-toggle.on { background: var(--surface-3); color: var(--text); border: 1px solid var(--border-strong); }
.card[data-active="1"] { border-color: color-mix(in srgb, var(--energy) 40%, transparent); }
.exp { color: var(--energy); font-size: 12.5px; }
.bp { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); }
.bp:empty { display: none; }
.bp-r { display: flex; align-items: center; gap: 10px; }
.bp > .btn { align-self: flex-start; }
.bp-ic { color: var(--accent); display: grid; }
.bp-t { flex: 1; display: flex; flex-direction: column; min-width: 0; } .bp-t small { color: var(--muted); font-size: 12px; }

/* Grenzen-Balken */
.lim { margin: 4px 0 18px; }
.lim-bar { position: relative; height: 34px; border-radius: 10px; background: var(--surface-3); overflow: hidden; }
.lim-z { position: absolute; top: 0; bottom: 0; }
.lim-z.min { left: 0; width: var(--min); background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--danger) 35%, transparent) 0 6px, color-mix(in srgb, var(--danger) 18%, transparent) 6px 12px); }
.lim-z.res { left: var(--min); width: calc(var(--res) - var(--min)); background: color-mix(in srgb, var(--warn) 28%, transparent); }
.lim-soc { position: absolute; top: 9px; bottom: 9px; left: 0; width: var(--soc); border-radius: 0 6px 6px 0; background: var(--energy); opacity: .85; transition: width .8s var(--ease); }
.lim-cap { position: absolute; top: 0; bottom: 0; left: var(--cap); right: 0; background: repeating-linear-gradient(90deg, transparent 0 4px, color-mix(in srgb, var(--text) 10%, transparent) 4px 5px); border-left: 2px dashed var(--muted); }
.lim-now { position: absolute; top: 0; bottom: 0; left: var(--soc); width: 2px; background: var(--text); }
.lim-scale { position: relative; height: 18px; margin-top: 6px; font-size: 11.5px; color: var(--muted); }
.lim-scale span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.lim-scale .mn { color: var(--danger); } .lim-scale .rs { color: var(--warn); } .lim-scale .now { color: var(--text); font-weight: 600; }
.lim-scale .cp { transform: translateX(-100%); }

/* Verlauf */
.seg { display: inline-flex; gap: 3px; padding: 3px; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; }
.card .seg { background: var(--surface-2); }
.seg button { padding: 6px 14px; border-radius: 8px; color: var(--muted); font-weight: 600; font-size: 13px; }
.seg button.sel { background: var(--surface-3); color: var(--text); }
.load { color: var(--muted); margin-left: 10px; }
.chart { position: relative; width: 100%; touch-action: pan-y; }
.chart svg { display: block; overflow: visible; }
.chart .grid line { stroke: var(--border); } .chart .grid text { fill: var(--faint); font-size: 10.5px; }
.chart .ln { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.chart .ar { opacity: .16; stroke: none; }
.chart .zero { stroke: var(--border-strong); }
.chart .band { stroke-dasharray: 4 4; stroke-width: 1.5; } .chart .band.mn { stroke: var(--danger); } .chart .band.rs { stroke: var(--warn); }
.chart .band-t { font-size: 10.5px; } .chart .band-t.mn { fill: var(--danger); } .chart .band-t.rs { fill: var(--warn); }
.chart .cross { stroke: var(--muted); stroke-dasharray: 3 3; opacity: 0; }
.chart .ln.dash { stroke-dasharray: 5 4; opacity: .85; }
.chart .now { stroke: var(--text); stroke-opacity: .35; } .chart .now-t { fill: var(--muted); font-size: 10.5px; }
.legend.series .dashed i { background: none; border: 2px dashed var(--muted); width: 12px; height: 0; border-radius: 0; }
.fc-info { margin-top: 12px; } .fc-info .hint { margin: 10px 0 0; }
.grid > :has(> .card[hidden]:only-child) { display: none; }
.chart .hov { fill: var(--text); opacity: 0; fill-opacity: .06; }
.tip { position: absolute; top: 4px; pointer-events: none; opacity: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; padding: 7px 10px; font-size: 12px;
  display: flex; flex-direction: column; gap: 2px; min-width: 140px; box-shadow: var(--shadow); transition: opacity .15s; z-index: 2; }
.tip i, .legend.series i, .tot i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; flex: none; }
.legend.series { justify-content: flex-start; margin-top: 10px; font-size: 12.5px; }
.totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 6px 16px; margin-top: 12px; }
.tot { display: flex; align-items: center; font-size: 12.5px; color: var(--muted); } .tot span { flex: 1; } .tot b { color: var(--text); font-variant-numeric: tabular-nums; }
.events { display: flex; flex-direction: column; }
.ev { display: grid; grid-template-columns: 44px 28px 1fr; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; position: relative; }
.ev::before { content: ""; position: absolute; left: 65px; top: 0; bottom: 0; width: 2px; background: var(--border); }
.ev:first-child::before { top: 50%; } .ev:last-child::before { bottom: 50%; }
.ev-time { color: var(--faint); font-variant-numeric: tabular-nums; font-size: 12px; }
.ev-dot { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--surface-2); color: var(--muted); z-index: 1; border: 1px solid var(--border); }
.ev-dot ha-icon { --mdc-icon-size: 15px; }
.ev.ok .ev-dot { color: var(--energy); } .ev.warn .ev-dot { color: var(--warn); } .ev.danger .ev-dot { color: var(--danger); }
.ev.danger .ev-t { color: var(--danger); }
.more { margin-top: 8px; }
.fc { display: flex; flex-direction: column; }
.fc-r { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--border); font-size: 13px; }
.fc-r:first-child { border-top: 0; } .fc-r ha-icon { color: var(--energy); } .fc-r span { flex: 1; } .fc-r small { color: var(--muted); text-align: right; }

/* Technik */
.checks { display: flex; flex-direction: column; gap: 8px; }
.chk { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); }
.chk > div { display: flex; flex-direction: column; min-width: 0; } .chk b { font-size: 13.5px; } .chk small { color: var(--muted); font-size: 12.5px; overflow-wrap: anywhere; }
.chk.ok ha-icon { color: var(--ok); } .chk.info ha-icon { color: var(--accent); } .chk.warn ha-icon { color: var(--warn); } .chk.danger ha-icon { color: var(--danger); }
.chk.danger { background: color-mix(in srgb, var(--danger) 12%, var(--surface-2)); }
.card[data-level="danger"] { border-color: color-mix(in srgb, var(--danger) 40%, transparent); }
.card[data-level="warn"] { border-color: color-mix(in srgb, var(--warn) 35%, transparent); }
.bands { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px; }
.band-s { text-align: center; padding: 8px; border-radius: 10px; background: var(--surface-2); color: var(--faint); font-weight: 600; font-size: 13px; border: 1px solid var(--border); }
.band-s.on { color: var(--text); background: color-mix(in srgb, var(--accent) 16%, var(--surface-2)); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.err { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; align-items: baseline; margin-bottom: 12px; color: var(--muted); }
.err-v { color: var(--text); font-size: 20px; font-variant-numeric: tabular-nums; }
.err-bar { grid-column: 1 / 3; height: 6px; border-radius: 6px; background: var(--surface-3); overflow: hidden; }
.err-f { display: block; height: 100%; background: var(--accent); border-radius: 6px; transition: width .5s var(--ease); }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
@container (max-width: 480px) { .kv { grid-template-columns: 1fr; } }
.kv-r { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-top: 1px solid var(--border); font-size: 13px; }
.kv-r span { color: var(--muted); } .kv-r b { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
.sp { display: flex; flex-direction: column; }
.sp-h, .sp-r { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 8px; padding: 9px 0; font-size: 13px; }
.sp-h { color: var(--faint); font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; padding-top: 0; }
.sp-h span:not(:first-child), .sp-r b { text-align: right; font-variant-numeric: tabular-nums; }
.sp-r { border-top: 1px solid var(--border); } .sp-r span { color: var(--muted); }
.sp-r.diff b:last-child { color: var(--warn); }
.errs { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); font-size: 12.5px; color: var(--muted); display: flex; flex-direction: column; gap: 3px; }
.errs b { color: var(--text); font-size: 13px; }
.errs.now { background: color-mix(in srgb, var(--danger) 12%, var(--surface-2)); } .errs.now b { color: var(--danger); }
details.grp { border-top: 1px solid var(--border); }
details.grp summary { list-style: none; display: flex; align-items: center; gap: 10px; padding: 12px 0; cursor: pointer; font-weight: 600; }
details.grp summary::-webkit-details-marker { display: none; }
details.grp summary span { flex: 1; } details.grp summary small { color: var(--faint); font-weight: 500; }
details.grp summary ha-icon:first-child { color: var(--muted); }
details.grp summary ha-icon:last-child { color: var(--faint); transition: transform .2s; }
details.grp[open] summary ha-icon:last-child { transform: rotate(180deg); }
details.grp .rows { padding-bottom: 8px; }

/* Sonstiges */
.empty { text-align: center; padding: 40px 20px; } .empty ha-icon { --mdc-icon-size: 48px; color: var(--muted); } .empty h2 { margin: 12px 0 6px; }
.toast { position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 30px); opacity: 0; background: var(--surface-3); border: 1px solid var(--border-strong); padding: 10px 16px;
  border-radius: 12px; box-shadow: var(--shadow); transition: all .3s var(--ease); pointer-events: none; z-index: 20; font-weight: 600; max-width: calc(100% - 32px); }
.toast.show { opacity: 1; transform: translate(-50%, 0); } .toast.bad { color: var(--danger); }
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); display: grid; place-items: center; z-index: 30; padding: 16px; animation: fade .2s; }
.dialog { background: var(--surface); color: var(--text); border: 1px solid var(--border-strong); border-radius: 20px; padding: 22px; max-width: 440px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.dialog h3 { font-size: 18px; margin-bottom: 8px; } .dialog p { color: var(--muted); }
.dialog .btns { justify-content: flex-end; margin-top: 20px; }
@keyframes fade { from { opacity: 0; } }
.foot { text-align: center; color: var(--faint); font-size: 11.5px; margin-top: 24px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

// Kompaktkarte: übernimmt Hintergrund und Schrift des HA-Themes
const MINI_CSS = `
:host { background: none; min-height: 0; --surface: var(--ha-card-background, var(--card-background-color, #151820)); --text: var(--primary-text-color, #eceef2); --muted: var(--secondary-text-color, #8d93a0); }
ha-card.mini { display: block; padding: 14px 16px; cursor: pointer; overflow: hidden; position: relative; color: var(--text);
  background: var(--ha-card-background, var(--card-background-color, #1c1f26)); border-radius: var(--ha-card-border-radius, 12px); }
ha-card.mini::after { content: ""; position: absolute; inset: auto -30% -70% 40%; height: 140%; pointer-events: none; background: radial-gradient(closest-side, color-mix(in srgb, var(--tone, var(--energy)) 12%, transparent), transparent); }
.mini-row { display: flex; align-items: center; gap: 16px; position: relative; z-index: 1; }
.mini .ring-v { font-size: 24px; } .mini .ring-v span { font-size: 13px; } .mini .ring-s { display: none; }
.mini .ring circle { stroke-width: 16; }
.mini .ring line { stroke-width: 4; }
.mini-t { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.mini-name { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.mini-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tone, var(--ok)); flex: none; }
.mini-dot[data-bad="1"] { background: var(--warn); }
.mini-title { font-size: 16px; line-height: 1.25; }
.mini-text { color: var(--muted); font-size: 12.5px; }
.mini-eta { color: var(--energy); font-size: 12.5px; font-weight: 600; } .mini-eta:empty { display: none; }
.mini-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 6px; margin-top: 12px; position: relative; z-index: 1; }
.mini-s { display: flex; align-items: center; gap: 6px; padding: 7px 9px; border-radius: 10px; background: color-mix(in srgb, var(--text) 6%, transparent); font-size: 12px; color: var(--muted); --c: var(--text); }
.mini-s[data-tone="amber"] { --c: var(--amber); } .mini-s[data-tone="cool"] { --c: var(--cool); }
.mini-s ha-icon { --mdc-icon-size: 16px; color: var(--c); } .mini-s span { flex: 1; } .mini-s b { color: var(--text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.mini-empty { display: flex; align-items: center; gap: 10px; color: var(--muted); }
`;

// Mehrfaches Laden (z. B. zusätzlich als Ressource eingetragen) darf nicht scheitern
const define = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };
define('xt500-energy-card', XT500EnergyCard);
define('xt500-energy-mini-card', XT500EnergyMiniCard);
define('xt500-energy-card-editor', XT500EnergyEditor);

// Dashboard-Strategie: ein Panel-Dashboard mit der Hauptkarte
class XT500EnergyStrategy extends HTMLElement {
  static async generate(config) {
    const { type, title, ...cardConfig } = config;
    return { title: title || 'XT500', views: [{ title: 'XT500', path: 'xt500', icon: 'mdi:home-battery', type: 'panel',
      cards: [{ type: 'custom:xt500-energy-card', ...cardConfig }] }] };
  }
}
define('ll-strategy-dashboard-xt500-energy', XT500EnergyStrategy);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'xt500-energy-card')) window.customCards.push(
  { type: 'xt500-energy-card', name: 'XT500 Energiemanager', description: 'Komplette Bedienoberfläche für den XT500 Energy Manager.', preview: false },
  { type: 'xt500-energy-mini-card', name: 'XT500 Energiemanager (kompakt)', description: 'Ladestand, Zustand in Klartext und Kennzahlen – für jedes Dashboard.', preview: true },
);
console.info(`%c XT500 ENERGY %c ${VERSION} `, 'background:#3fd0a4;color:#06291f;font-weight:700', 'background:#151820;color:#eceef2');
