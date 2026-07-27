# Änderungsprotokoll

## Unveröffentlicht

- eigene, providerunabhängige Tarif-Ladeanforderung mit separatem Ladeziel und
  separater Netz-Ladeleistung
- zeitlich begrenzte Anforderung fällt ohne regelmäßige Erneuerung automatisch
  und sicher in den Grundbetrieb zurück
- klare Priorität: manuelle Zielladung, Zyklusladung, Tarifladung, Grundbetrieb
- eigener Tarifstatus und Ablaufzeitpunkt in Dashboard und Diagnosedaten
- mitgelieferter Automation-Blueprint für beliebige numerische Preissensoren
  mit getrennter Start-/Stoppschwelle, Hysterese und sicherem Verhalten bei
  ungültigen Preisen
- der Blueprint wird bei Neuinstallation automatisch angelegt und nach einem
  HACS-Update beim Home-Assistant-Start sicher synchronisiert
- eine verwaltete Prüfsumme schützt manuell veränderte Blueprint-Kopien vor
  unbeabsichtigtem Überschreiben
- ausführliche Anleitung mit Tibber-Beispiel, Einheitenhinweis und Abgrenzung
  zu vorausschauender Preisoptimierung

## 1.6.0 – 2026-07-27

- neue empfohlene Einrichtung über eine native SunEnergy-XT500-Geräteauswahl
- originale XT500-Sensoren, Sollwerte und Leistungsgrenzen werden anhand ihrer
  stabilen SunEnergyXT-Kennungen automatisch erkannt
- nur der externe Gesamt-Stromzähler und seine Vorzeichenrichtung müssen
  weiterhin manuell ausgewählt werden
- vollständige manuelle Entitätsauswahl bleibt als Expertenmodus erhalten
- automatische Erkennung kann später über **Konfigurieren** erneut ausgeführt
  werden
- Stromzählerauswahl zeigt nur Leistungssensoren und erklärt ausdrücklich,
  dass die Gesamtleistung am öffentlichen Netzanschlusspunkt benötigt wird
- ungültige Eingangsdaten nennen den betroffenen Eingang, die Entität, ihren
  Zustand und die genaue Ursache
- letzter Eingangsfehler sowie Fehler- und Erholungszeitpunkt bleiben nach
  einer kurzen Störung in Entitätsattributen und Diagnosedaten sichtbar
- Start- und Neuladephasen erzeugen keine Serie irreführender Warnmeldungen
- Installationsanleitung und Fehlerbehebung an den neuen Einrichtungsablauf
  angepasst

## 1.5.0 – 2026-07-26

- Inhalte der Seiten **Speicher** und **Einstellungen** sind in eigenständige,
  frei anordenbare Blöcke aufgeteilt
- grafischer Strategy-Editor kann jeden Block mit Pfeiltasten verschieben oder
  über einen Sichtbarkeitsschalter ausblenden
- getrennte Reihenfolgen für Speicherübersicht und Einstellungsseite
- Schaltfläche **Standard wiederherstellen** setzt Reihenfolge und Sichtbarkeit
  einer Seite sicher zurück
- bestehende Dashboard-Konfigurationen verwenden automatisch die bisherige
  Standardreihenfolge

## 1.3.0 – 2026-07-25

- grafischer Strategy-Editor zum Einbinden einzelner Ansichten aus anderen
  Home-Assistant-Dashboards
- eingebundene Ansichten erscheinen als echte Reiter in der oberen
  Dashboard-Leiste und werden beim Neuladen aus ihrer Quelle aktualisiert
- optionaler eigener Titel und eigenes Symbol sowie zusätzliche Sichtbarkeit
  „Nur für mich“
- bestehende Benutzerbeschränkungen der Quellansicht bleiben erhalten
- Schutz vor Doppelimport, Selbstimport und verschachtelten Ansichtsstrategien
- eine nicht erreichbare Quellansicht beeinträchtigt die beiden
  Energiemanager-Ansichten nicht

## 1.2.0 – 2026-07-24

- Normalbetrieb gleicht jetzt zusätzlich die Differenz zwischen angefordertem
  XT500-Sollwert und tatsächlich gemessener Netzanschlussleistung aus
- dauerhafter kleiner Netzbezug durch Wandlungsverluste, Verzögerung oder
  Leistungsabweichungen des XT500 wird begrenzt nachgeregelt
- Ziellademodi, PV-Überschussbetrieb, Lastanschluss-Aufteilung und bestehende
  Leistungsgrenzen bleiben unverändert
- schnell wechselnde Regelwerte werden nicht mehr zusätzlich als Attribute des
  Statussensors gespeichert; sie bleiben als eigene Live-Entitäten und im
  Diagnosebericht verfügbar
- originale Systemlastanschluss-Entladegrenze kann bei der Einrichtung
  zugeordnet und im Einstellungs-Dashboard direkt verändert werden
- Statusblock zeigt den nächsten berechneten Termin der Zyklusladung
- der Termin wird als festes Datum mit Uhrzeit statt als relativer Zeitraum
  angezeigt
- Batterie lädt/entlädt werden aus den originalen Gesamtleistungen als
  gegenseitig ausschließende Nettowerte angezeigt

## 1.1.0

- Zyklusladung kann unabhängig von der Fälligkeit sofort manuell gestartet
  werden
- einstellbare tägliche Prüfzeit für den Start einer fälligen automatischen
  Zyklusladung
- eindeutiger Zyklusstatus trennt automatische Überwachung, fälligen Zyklus,
  manuelle Ladung, automatische Ladung und angehaltene Ladung
- eigener Zustand „Zyklusladung aktiv“ zusätzlich zur reinen
  Zyklusüberwachung
- Rücksetzknopf setzt die Zyklustage auf 0 und beendet eine laufende
  Zyklusladung, ohne eine künstliche Vollladung einzutragen
- manuelle und automatische Zyklusladung verwenden denselben separat
  einstellbaren Zyklus-Lademodus und dasselbe Vollladeziel
- verpasste Prüfzeit wird nach einem Neustart sicher nachgeholt; wird der
  Zyklus erst nach der Prüfzeit fällig, startet er erst am Folgetag
- Dashboard und Anleitung um Zyklusstatus, Start, Prüfzeit und Rücksetzen
  ergänzt
- Zyklusstatus, Zyklustage und Prüfzeit werden im Dashboard jeweils nur an
  einer passenden Stelle angezeigt
- „Neu berechnen“ aus dem automatisch erzeugten Dashboard entfernt

## 1.0.7

- neue Installationen und Aktualisierungen starten die Zyklusladung Automatik
  nicht mehr sofort, wenn noch keine Volladung aufgezeichnet wurde
- beim ersten Aktivieren beginnt stattdessen das eingestellte Zyklusintervall
- eine tatsächlich erreichte automatische Ziel-SOC setzt den Zeitplan zurück
- Diagnoseausgabe zeigt Zeitanker, Fälligkeit und nächsten Zykluszeitpunkt
- Dashboard-Ressource auf Version 1.0.7 angehoben

## 1.0.6

- einzelne SunEnergyXT-Schreib-Timeouts führen nicht mehr sofort zur
  Sicherheitsverriegelung
- nach einem Timeout wird zunächst auf die Rückmeldung des möglicherweise
  bereits übernommenen Zielwerts gewartet
- falls nötig folgen höchstens zwei idempotente Wiederholungen mit wachsender
  Wartezeit
- erst drei fehlgeschlagene Schreibversuche lösen den bestehenden
  `control_error` samt iPhone-Benachrichtigung aus
- Diagnoseattribute zeigen Anzahl, letzten Timeout und erfolgreiche
  vorübergehende Wiederherstellung
- Fehlermeldungen enthalten jetzt betroffene Entität und Zielwert
- Dashboard-Ressource auf Version 1.0.6 angehoben

## 1.0.5

- kontrollierte automatische Wiederherstellung nach einem Schreibfehler
- einstellbare Stabilitätszeit und eigener Ein-/Aus-Schalter
- wirkungsloser Schreibtest auf den bereits aktuellen Wechselrichter-Sollwert
- Freigabe erst nach neuen Messrückmeldungen
- höchstens drei Wiederherstellungsversuche mit wachsender Wartezeit
- eigener Wiederherstellungsstatus in Integration, Diagnose und Dashboard
- leere Timeout-Fehlertexte zeigen jetzt mindestens den Exception-Typ
- Dashboard-Ressource auf Version 1.0.5 angehoben

## 1.0.4

- „Zyklusladung“ in der Bedienoberfläche einheitlich in
  „Zyklusladung Automatik“ umbenannt
- Schnellsteuerung um Schalter für manuelle Zielladung und
  Zyklusladung Automatik ergänzt
- Dashboard-Ressource auf Version 1.0.4 angehoben

## 1.0.3

- erster öffentlicher Betateststand
- HACS als empfohlenen Installations- und Aktualisierungsweg dokumentiert
- manuelle Installation als Alternative beibehalten
- öffentliche Test- und Fehlermeldehinweise ergänzt
- Dashboard-Ressource auf Version 1.0.3 angehoben

## 1.0.2

- Batteriesymbol für das aktive Ladeziel korrigiert
- Eingangsdaten werden als „Gültig“ oder „Ungültig“ angezeigt
- Dashboard-Ressource auf Version 1.0.2 angehoben

## 1.0.1

- Zustandsübersetzungen für die Prüfung der Eingangsdaten ergänzt
- explizites Symbol für das aktive Ladeziel ergänzt

## 1.0.0

- erster produktiver Stand
- adaptive Nulleinspeisungsregelung
- Normalbetrieb und PV-Überschuss-Grundmodus
- manuelle Zielladung mit vier Lademodi
- automatische Zyklusladung mit getrenntem Lademodus
- normales Ladelimit und temporäre Anhebung während einer Zielladung
- Niedrig-PV-Sperre mit einstellbarer Hysterese und Startverzögerung
- automatisch erzeugtes Dashboard mit Standardkarten
