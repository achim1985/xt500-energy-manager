# Direkter SunEnergyXT-Gerätetest und manueller Bypass-Test am 30.09.2026

Alle Uhrzeiten in Europe/Berlin. XT500 Energy Manager 1.10.7, SunEnergyXT 1.1.3.

## Direkter Test ohne Regelung unseres Energiemanagers

Vorher: SOC 71 %, System-Ladegrenze 100 %, Energiemanager aktiv.
Alle sieben über die Gerätesollwerte gefundenen alten Automationen waren ausgeschaltet;
die geräteeigene lokale Nulleinspeiseregelung war ebenfalls aus. Keine aktive Ladeanforderung.

Der Energiemanager wurde um 16:23:06 ausgeschaltet. Seine Abschaltfunktion
neutralisierte GS auf 0 W und IS auf 1 W. Nach Bestätigung der Pause und
nichtnegativer Batterieleistung wurde ausschließlich über die originalen
SunEnergyXT-number-Entitäten die System-Ladegrenze auf 70 % und IS auf 800 W
gesetzt. Die bestehende Hausnetz-Gerätegrenze 800 W blieb wirksam.
Die originale Integration bietet keine separate harte Akku-Entladesperre;
die minimale Entladegrenze ist auf 30 % begrenzt, während der SOC 71 % betrug.
GS = 0 W enthält keinen positiven Batterie-Ausgabesollwert. Der Versuch
wäre bei jeder gemessenen negativen Batterieleistung abgebrochen worden.

Testfenster: 16:23:18.671–16:23:48.895, zehn Messabfragen im Abstand von drei Sekunden.
Während sämtlicher Abfragen: Energiemanager aus, GS 0 W, IS 800 W, Ladegrenze 70 %.
Positive BP bedeutet Ladung; positive öffentliche Netzleistung bedeutet Bezug.

| Uhrzeit | DC-PV W | XT500-Netzausgabe W | Akku W | Öffentliches Netz W |
| --- | ---: | ---: | ---: | ---: |
| 16:23:21 | 289 | 201 | 9 | 3.684 |
| 16:23:24 | 465 | 380 | 10 | 76.391 |
| 16:23:27 | 307 | 236 | 10 | 280.618 |
| 16:23:30 | 269 | 248 | 9 | -14.922 |
| 16:23:33 | 472 | 394 | 9 | -14.922 |
| 16:23:36 | 473 | 410 | 10 | -14.922 |
| 16:23:39 | 475 | 413 | 9 | -10.8 |
| 16:23:42 | 479 | 417 | 9 | -23.501 |
| 16:23:45 | 487 | 423 | 9 | -31.677 |
| 16:23:48 | 494 | 429 | 10 | -31.677 |

In allen zehn Abfragen wurde 9–10 W Akkuladung und keine Akkuentladung gemessen.
Gegen Ende stieg DC-PV von 472 auf 494 W und die Netzausgabe von 394 auf 429 W.
Öffentliche Einspeisung wurde ebenfalls beobachtet, zuletzt 31.677 W.
Der Versuch bestätigt PV-Ausgabe bei neutralem GS über das Gerät selbst.
Er beweist keine exakt entladefreie Umschaltphase zwischen den Geräteabfragen.
Die Differenz von DC-Eingang und AC-Ausgabe enthält die kleine Akkuladung,
Umwandlungsverluste und Eigenverbrauch; deren genaue Anteile sind nicht bestimmt.

Der Recorder-Vergleich zeigt zunehmende PV-Eingangsleistung:
vorher (16:22:30–16:23:00) zeitgewichteter Mittelwert 438.2 W,
späterer Teil des Tests (16:23:32–16:23:49) 472.5 W,
nach Wiederanlauf vor dem Benutzertest (16:24:08–16:24:20) 560.6 W.
Die ersten Sekunden zeigen Einbrüche und Erholung nach dem Neutralisieren
der Ausgänge; daraus lässt sich keine gleichbleibende verfügbare Solarleistung
und keine exakte MPPT-Ausnutzung ableiten.

## Wiederherstellung und anschließender Benutzertest

Nach Testende IS zunächst auf 1 W neutralisiert, Ladegrenze um 16:23:55 auf
100 % zurückgestellt und Energiemanager um 16:24:00 wieder eingeschaltet.
Der Verlauf bestätigt den Zustand normal ab 16:24:05.

Danach wurde über eine Benutzerbedienung um 16:24:24 das Ladelimit des
Energiemanagers auf 70 % gesetzt und um 16:24:26 die Bypass-Option eingeschaltet.
Der Benutzer bestätigte im Chat, gerade bei Sonne manuell zu testen.
Diese späteren Einstellungen gehören zu seinem Test und wurden nicht zurückgesetzt.

Live-Momentaufnahme während dieses manuellen Tests:
DC-PV 692 W, XT500-Netzausgabe 615 W, Lastanschluss 0 W, Akku lädt mit 9 W,
öffentliche Einspeisung 153.288 W. GS 0 W, IS 1261 W, Ladegrenze 70 %,
Status full_battery_pv_bypass, Produktionsregelung bereit.
Die Diagnose zeigt control_error = null; das aktuelle Systemlog enthält keine XT500-ERROR-Einträge.

Damit ist auch mit dem Energiemanager 1.10.7 echte öffentliche Einspeisung
ohne gemessene Akkuentladung beobachtet. Während der weiteren Beobachtung fiel PV auf 223 W bei gleichzeitig etwa
466 W öffentlichem Netzbezug; der Status wechselte auf normal. Gegen 16:28 Uhr
bestätigte die Diagnose bei DC-PV 345 W: Bypass-Option weiterhin eingeschaltet,
SOC-Haltezustand gesetzt, aktiver Bypass false, Status normal, Akkuentladung
173 W und GS 450 W. Damit ist die Rückkehr zur normalen Akkuunterstützung
bei fehlender PV auch physisch beobachtet. Die momentane öffentliche
Einspeisung von rund 90 W und Sollwertkorrektur auf 360 W zeigen eine laufende
Nachregelung; eine langfristige Stabilität wird aus diesen Momentaufnahmen
nicht abgeleitet.

API-Vertrag: https://github.com/SunEnergyXT/SunEnergyXT-500-Series/blob/main/API.de.md
