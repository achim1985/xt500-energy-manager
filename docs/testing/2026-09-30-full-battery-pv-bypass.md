# Live-Test: Vollakku-PV-Bypass, Version 1.10.6

Datum: 30.09.2026, Zeitzone Europe/Berlin. Home Assistant Core 2026.9.3,
SunEnergyXT-Integration 1.1.3, XT500 Energy Manager 1.10.6.
Die geladene Version wurde über die Integrationsdiagnose bestätigt.

## Ausgangslage und Ablauf

- Akku-SOC: 72 %, DC-PV-Kopplung, keine aktive Ladeanforderung.
- System-Ladegrenze ursprünglich 100 %, Testgrenze 70 %.
- Leistungsgrenzen: Hausnetz 800 W, Wechselrichter insgesamt 2400 W.
- Home Assistant wurde nach ausdrücklicher Freigabe neu gestartet.
- Für den Kurztest wurde der zuvor vorübergehend ausgeschaltete Bypass aktiviert.
- Laut HA-Verlauf wechselte der Status um 15:47:21 zu
  `full_battery_pv_bypass` und um 15:47:55 zurück zu `normal`.
- Die Regelung blieb laut Verlauf durchgehend betriebsbereit.
- Um 15:47:59 wurde die ursprüngliche Ladegrenze 100 % am Gerät zurückgelesen.

## Gemessene Werte

Alle Leistungen in W. Positive Batterieleistung bedeutet Laden;
positive öffentliche Netzleistung bedeutet Bezug.

| Uhrzeit | DC-PV | XT500-Netzanschluss | Batterie | Öffentliches Netz | GS | IS-Obergrenze |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 15:47:26 | 370 | 342 | 9 | 186.529 | 0.0 | 931.0 |
| 15:47:31 | 370 | 316 | 9 | 175.779 | 0.0 | 1291.0 |
| 15:47:36 | 370 | 313 | 10 | 173.206 | 0.0 | 1301.0 |
| 15:47:41 | 369 | 313 | 10 | 174.349 | 0.0 | 1291.0 |

## Vergleich vor und nach dem Test

Zeitgewichtete Mittelwerte aus dem HA-Recorder; Umschaltphasen sind ausgespart.
Alle Uhrzeiten am 30.09.2026 in Europe/Berlin. Alle Leistungen in W.

| Phase | Zeitraum | DC-PV | Batterie | XT500-Netzanschluss | Öffentlicher Netzbezug |
| --- | --- | ---: | ---: | ---: | ---: |
| Vorher | 15:46:50–15:47:20 | 377.1 | -175.7 | 512.1 | 2.2 |
| Bypass stabil | 15:47:30–15:47:50 | 369.3 | +10.0 | 313.0 | 183.5 |
| Nachher | 15:48:15–15:48:45 | 364.0 | -205.0 | 498.8 | 1.2 |

Der Lastanschluss war in allen drei Fenstern bei 0 W. Die DC-PV lag vorher
zwischen 370 und 385 W, während des Bypasses zwischen 367 und 370 W und
nachher zwischen 361 und 369 W. Es ist kein auffälliger Einbruch der
PV-Eingangsleistung am Wechsel erkennbar. Die Leistungsbilanz ist plausibel:
Die fehlende Akkuentladung ging mit zusätzlichem öffentlichem Netzbezug einher.
Eine vollständige Durchleitung bei echtem PV-Überschuss wurde damit nicht geprüft.

## Bewertung

Der zuvor fehlende Sensorzustand wurde akzeptiert. Der Bypass blieb aktiv,
ohne dass die Regelung verriegelte. GS war 0 W; IS stieg deutlich über die
gemessene DC-PV-Leistung, ohne beobachtete Akkuentladung während der
aufgezeichneten Bypass-Messungen. Das belegt, dass die Wechselrichter-
Obergrenze in diesem Versuch keinen entsprechenden Batterie-Ausgabebefehl
erzwang.

**Die Verbrauchsdeckung bei fehlendem PV-Überschuss war fehlerhaft.** Vorher
und nachher unterstützte der Akku den Hausverbrauch; während des Bypasses
verursachte die unterbundene Akkuentladung etwa 184 W öffentlichen Netzbezug.
Der erfolgreiche Statuswechsel belegt daher keine insgesamt korrekte Regelung.

Eine vollständige öffentliche Überschusseinspeisung wurde nicht nachgewiesen:
Bei ungefähr 486–529 W rekonstruierter Hauslast reichte die PV-Leistung
dafür nicht aus. Die Differenz zwischen DC-PV und AC-Ausgabe enthält auch
Batterieladung, Umwandlungsverluste und Eigenverbrauch; eine genaue
Verlustaufteilung wurde nicht ermittelt.

Die nächste Messabfrage des HA-Werkzeugs lieferte gegen Testende eine
unlesbare Tool-Antwort. Daraufhin beendete die Teststeuerung den Versuch und
stellte die Ladegrenze zurück. Die anschließende HA-Verlaufs- und
Diagnoseprüfung bestätigt den fortlaufenden Gerätebetrieb, den normalen
Regelzustand und `control_error = null`. Im aktuellen Systemlog wurden keine
XT500-Fehler gefunden. Dieser Werkzeugfehler war kein beobachteter
Regelungsfehler.

## Zustand nach dem Test

- System-Ladegrenze im Energiemanager und am Gerät: 100 %.
- Normale Regelung betriebsbereit, kein Steuerfehler.
- Der Benutzer hat ausdrücklich entschieden, den PV-Bypass ausgeschaltet zu lassen.
- Der Live-Test ergänzt die Softwareprüfung mit 107 Python- und 18 Dashboard-Tests.


## Lokale Korrektur 1.10.7

Die Freigabe prüft nun wie im Original-Blueprint die verfügbare DC-PV nach
Lastanschluss und die tatsächliche Verbrauchsdeckung. Zusätzlich verhindert
Akkuunterstützung ohne entsprechenden Netzüberschuss einen Wiedereintritt,
auch wenn die normale Akkuunterstützung den Netzbezug bereits ausgeglichen hat.
Bei fehlender PV bleibt der gewählte Grundmodus aktiv. Die vorhandenen Regeln
für Ladeaufträge, AC-Kopplung, Mindest-SOC und Entladefreigabe bleiben maßgeblich.

Regressionstests reproduzieren die Messwerte während des Tests, unzureichende
AC-Ausgabe trotz nominell ausreichender DC-PV und den Wiedereintritt nach
Wiederherstellung der Akkuunterstützung. Diese Fälle schlugen vor der Korrektur
fehl und bestehen danach. Die Korrektur ist damit lokal geprüft; eine physische
Überschusseinspeisung mit Version 1.10.7 ist noch nicht nachgewiesen.

Original: <https://github.com/SunEnergyXT/sunenergyxt-500-zero-feed-in-blueprint/blob/main/blueprints/automation/sunenergyxt/sunenergyxt-500-zero-feed-in.yaml>

## Aktivierung von 1.10.7 am 30.09.2026

- Mit Sicherung nach `/config/xt500_energy_manager_backups/ssh-deploy-20260930-160831`
  übertragen; Prüfsummenvergleich ohne Unterschiede.
- Home Assistant nach ausdrücklicher Benutzerfreigabe neu gestartet.
- Nach Wiederverfügbarkeit gegen 16:13 Uhr bestätigt die Integrationsdiagnose:
  geladene Version 1.10.7, normale Produktionsregelung betriebsbereit und aktiv,
  `control_error = null`, gültige Eingaben und aktuelle Geräte-Rückmeldungen.
- Bypass weiterhin ausgeschaltet, normale Ladegrenze 100 %.
- Diagnose-Momentaufnahme: DC-PV 270 W, Akkuentladung 176 W, rekonstruierte
  Hauslast 408.4 W und öffentliche Netzleistung 0.6 W Einspeisung. Die normale
  Akkuunterstützung ist damit beobachtet.
- Die Bypass-Freigabe wurde nach diesem Neustart nicht am Gerät getestet;
  der Bypass blieb entsprechend der Benutzerentscheidung ausgeschaltet.

Der anschließend durchgeführte [direkte Gerätetest und manuelle Test mit Sonne](2026-09-30-original-integration-pv-bypass.md) dokumentiert öffentliche Einspeisung ohne gemessene Akkuentladung und den Rückwechsel zur normalen Akkuunterstützung mit 1.10.7.
