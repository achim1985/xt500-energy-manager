# Optionale saldierte Netzmessung

## Auswahl in Home Assistant

Bei der Ersteinrichtung oder unter **Einstellungen → Geräte & Dienste → XT500 Energy Manager → Konfigurieren** den automatischen oder manuellen Einrichtungsweg öffnen. Im Feld **Externer Netzleistungssensor** einen Sensor mit Geräteklasse `power` auswählen, der die **saldierte Gesamtwirkleistung aller Phasen am Hausanschluss** liefert. Beispielsweise eignet sich der entsprechende Gesamtleistungssensor eines Shelly Pro 3EM. Keine einzelne Phase, Scheinleistung, Energieentität oder **XT500-Systemleistung am Netzanschluss** auswählen.

Die Auswahl ist unabhängig vom bestehenden Pflichtfeld für den öffentlichen Zähler der XT500-Regelung. Derselbe geeignete Hauszähler darf in beiden Feldern ausgewählt werden; die neue Option verändert keine Regelungseingänge.

Positive Werte bedeuten Bezug, negative Werte Einspeisung. Bei umgekehrter Konvention **Vorzeichen des Netzleistungssensors invertieren** aktivieren. Standard ist aus. Änderungen speichern; der bestehende Options-Listener lädt die Integration neu. Die optionale Sensorauswahl löschen und speichern, um die zusätzliche Messung zu deaktivieren. Die bisherigen Funktionen bleiben dabei aktiv.

Die Integration erzeugt automatisch:

| Name | Schlüssel | Einheit | Geräteklasse | Zustandsklasse |
| --- | --- | --- | --- | --- |
| Netzleistung saldiert | `grid_power_net` | W | power | measurement |
| Netzbezug Leistung | `grid_import_power` | W | power | measurement |
| Netzeinspeisung Leistung | `grid_export_power` | W | power | measurement |
| Netzbezug Energie | `grid_import_energy` | kWh | energy | total_increasing |
| Netzeinspeisung Energie | `grid_export_energy` | kWh | energy | total_increasing |

Unter **Einstellungen → Dashboards → Energie → Stromnetz**:

- **Netzbezug Energie** als Netzbezug hinzufügen.
- **Netzeinspeisung Energie** als Rückspeisung hinzufügen.

Die automatisch vergebenen Entity-IDs hängen von Integrationsname und vorhandenen Registry-Einträgen ab. Nach den oben genannten Anzeigenamen auswählen. Die Energiewerte beginnen bei erstmaliger Aktivierung mit null; vorhandene Zählerstände oder historische Daten des externen Geräts werden nicht übernommen.

## Architektur und Rückwärtskompatibilität

Die bestehende Integration besitzt keine eigene Geräte-API oder `DataUpdateCoordinator`: `runtime.py` beobachtet ausgewählte Home-Assistant-Entitäten und steuert vorhandene SunEnergyXT-Entitäten. `controller.py` enthält die reine Regelungslogik. Die Plattformen nutzen `XT500Entity`, dessen Unique-ID-Konvention `entry_id + '_' + key` lautet. Automatische Entity-Erkennung und Migration bleiben unverändert. Die Konfiguration bleibt Version 6, da beide neuen Felder optional sind und fehlende Werte deaktiviert/false bedeuten.

`grid_meter.py` verwaltet einen separaten Messbaustein pro Konfiguration. `__init__.py` startet und stoppt ihn mit dem Entry. Er beeinflusst weder die Controller-Berechnung noch deren Verfügbarkeit. `sensor.py` erzeugt fünf zusätzliche Entitäten nur bei ausgewählter Quelle. Alle verwenden das bereits vorhandene Energiemanager-Gerät und die bestehende ID-Konvention; keine bestehende ID wird verändert. Entitäten können einzeln deaktiviert werden, ohne die gemeinsame Energieerfassung zu stoppen.

## Berechnung

Intern wird die Leistung über Home Assistants `PowerConverter` in Watt umgerechnet. W und kW sowie weitere von HA unterstützte Leistungseinheiten werden akzeptiert. Nach optionaler Invertierung gilt:

- Bezugsleistung: `max(P, 0)`.
- Einspeiseleistung: `max(-P, 0)`.
- Energiezuwachs: `P_Richtung × Sekunden / 3_600_000` in kWh.

`grid_energy.py` verwendet die linke Rechteckintegration: Der vorherige gültige Wert gilt bis zum Zeitpunkt der nächsten Änderung. Dies passt zu stückweise konstant gemeldeten Leistungen und verhindert, dass ein neuer Wert rückwirkend auf das vorangegangene Intervall angewendet wird. Die Genauigkeit bleibt von der zeitlichen Auflösung des Quellsensors abhängig.

State-Change-Events liefern Messwertänderungen. Ein lokaler Checkpoint alle 60 Sekunden integriert auch bei konstanter Leistung und schreibt neue Zustände, ohne das Gerät abzufragen. Zeitdifferenzen verwenden eine monotone Prozessuhr. Eine Lücke von mehr als zwei Checkpoint-Intervallen (120 Sekunden) zeigt eine unterbrochene Verarbeitung an: Dieses unsichere Intervall wird verworfen. Das ist ein Schutz gegen Scheduler-/Host-Ausfälle, kein Grenzwert für Leistungswerte oder für den Meldeabstand des Quellsensors.

## Persistenz und Unterbrechungen

Die beiden Summen werden in einem eigenen HA-`Store` unter `xt500_energy_manager.<entry_id>.grid_energy` atomar gespeichert. Das passt zum bereits vorhandenen Store-Muster der Integration und erhält die Werte unabhängig von einzelnen deaktivierten oder vorübergehend entfernten Sensorentitäten. `RestoreSensor` ist deshalb nicht zusätzlich notwendig.

Speicherungen werden höchstens einmal pro Minute angestoßen; häufige State-Events verschieben den Speichervorgang nicht ständig nach hinten. Beim ordentlichen Entladen/Herunterfahren werden die Summen abschließend gespeichert. Bei einem abrupten Absturz können die Werte seit dem letzten erfolgreichen Schreibvorgang verloren gehen (normalerweise höchstens etwa eine Minute, abhängig von erfolgreicher Datenträger-I/O).

Nur die Summen werden wiederhergestellt, niemals Leistung oder Zeitanker. Nach Neustart, Quellenwechsel oder Reaktivierung beginnt die Integration beim ersten gültigen Wert ein neues Intervall. Die Summen bleiben auch bei Änderung der Vorzeichenoption erhalten; die neue Einstellung gilt nur künftig.

Bei `unknown`, `unavailable`, fehlendem Sensor, nicht numerischen oder nicht endlichen Werten wird das vorherige gültige Intervall bis zum Verlustereignis abgeschlossen und danach nichts integriert. Ein wieder gültiger Wert rechnet die Lücke nicht nach. Bei einem Wechsel zwischen gültigen Einheiten wird das betroffene Übergangsintervall vorsichtig verworfen. Nicht unterstützte Einheiten werden bei Auftreten/Änderung protokolliert. Restored-Quellzustände und die fünf abgeleiteten Netzsensoren selbst werden als Messquellen ignoriert.

Die Leistungssensoren sind bei ungültiger Quelle nicht verfügbar; die Energiesensoren zeigen ihre letzten Summen weiter an und stellen `source_available: false` bereit. Ein stiller Messgeräteausfall ohne `unavailable`-Ereignis ist nicht von tatsächlich konstanter Leistung unterscheidbar. Der Quellsensor muss seine Verfügbarkeit korrekt melden. Umbenannte Quell-Entity-IDs gegebenenfalls erneut auswählen.

## Validierung

Numerische Tests prüfen Bezug, Einspeisung, Richtungswechsel, Neustart, Datenlücken, nicht endliche Werte und doppelte Checkpoints. Adaptertests mit abgegrenzten HA-Testdoubles prüfen W/kW, Invertierung, Speicherung, Quellenwechsel, Restored-Zustände, Listener-Cleanup, Einheitenwechsel und Scheduler-Unterbrechungen. Schema-/Entitätstests prüfen optionalen Power-Selector, Standardwerte, fünf Entitäten, Verfügbarkeit und Energie-Metadaten.

Die Energie-Dashboard-Voraussetzungen (`energy`, `total_increasing`, `kWh`, monoton steigende Summen) sind auf Code-/Testebene erfüllt. In dieser Entwicklungsumgebung ist Home Assistant nicht installiert; die tatsächliche Auswahl und Statistikbildung in einem laufenden HA wurden nicht überprüft. Die Live-Installation wurde nicht verändert.

Referenzen: [HA Sensor-Entwicklungsrichtlinien](https://developers.home-assistant.io/docs/core/entity/sensor/), [HA Integral und linke Rechteckintegration](https://www.home-assistant.io/integrations/integration/).

## Geänderte und neue Dateien

- `custom_components/xt500_energy_manager/__init__.py`
- `custom_components/xt500_energy_manager/config_flow.py`
- `custom_components/xt500_energy_manager/const.py`
- `custom_components/xt500_energy_manager/diagnostics.py`
- `custom_components/xt500_energy_manager/runtime.py`
- `custom_components/xt500_energy_manager/sensor.py`
- `custom_components/xt500_energy_manager/grid_energy.py` (neu)
- `custom_components/xt500_energy_manager/grid_meter.py` (neu)
- `custom_components/xt500_energy_manager/strings.json`
- `custom_components/xt500_energy_manager/translations/de.json`
- `custom_components/xt500_energy_manager/translations/en.json`
- `tests/test_grid_contracts.py` (neu)
- `tests/test_grid_energy.py` (neu)
- `tests/test_grid_meter.py` (neu)
- `docs/external-grid-meter.md` (neu)
- `README.md`
- `CHANGELOG.md`

Lokale Prüfungen: 130 Python-Tests, 18 Dashboard-Tests, Python-Kompilierung, JavaScript-Syntaxprüfung und `git diff --check` erfolgreich. Ein separater Linter ist im Repository nicht konfiguriert und lokal nicht vorhanden.
