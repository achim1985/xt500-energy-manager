# Lokale Untersuchung: Pendeln im Vollakku-PV-Bypass

Datum: 02.10.2026. Ausgangsstand: veröffentlichte Version 1.11.0 (8149ad8).
Die Bypass-Prüfung darin entspricht Version 1.10.7. Das laufende Home-Assistant-
System wurde gemäß Benutzerauftrag weder gelesen noch geändert. Die Untersuchung
verwendet den Screenshot, lokalen Quellcode und synthetische Messwertfolgen.

## Beobachtung und Abgrenzung

Der Screenshot zeigt unter anderem Bypass um 18:01:04, Normalbetrieb um
18:01:09, Bypass um 18:01:14 und Normalbetrieb um 18:01:19. Laut Benutzer
lag der SOC über der normalen Ladegrenze und die Ladehysterese bei 1 %.
Die exakten PV-, Akku- und Netzwerte dieses Systems liegen nicht vor.
Eine konkrete einzelne Messwertänderung auf diesem System ist deshalb nicht
bewiesen; der Codefehler lässt sich jedoch unabhängig vom SOC nachstellen.

Das 1-%-SOC-Halteband hält nur die Vollakku-Erkennung. Die geräteseitige
Lade-SOC-Hysterese regelt das Wiederladen. Beide verhindern keine Wechsel,
die durch die getrennte Leistungsfreigabe ausgelöst werden.

## Reproduzierbarer Fehler

Bei konstantem SOC 75 %, DC-PV 500 W, Hausverbrauch 450 W und Lastanschluss
0 W erzeugte die bisherige Berechnung folgende wechselnde Entscheidungen:

| Zeitpunkt | XT500-Ausgabe W | Öffentliches Netz, Einspeisung positiv W | Akkuentladung W | Entscheidung |
| --- | ---: | ---: | ---: | --- |
| 0 s | 470 | +20 | 45 | Bypass, GS 0 |
| 5 s | 405 | -45 | 0 | Normalbetrieb |
| 10 s | 470 | +20 | 45 | Bypass, GS 0 |
| 15 s | 405 | -45 | 0 | Normalbetrieb |

Im Normalbetrieb wird die Einspeisung von 20 W von der Akkuunterstützung
45 W abgezogen. Die verbleibenden 25 W liegen unter der 30-W-Prüfschwelle.
Damit wird Bypass freigegeben, obwohl die Einspeisung teilweise aus dem Akku
stammen kann. GS 0 beendet die Akkuunterstützung. Der entstehende Netzbezug
von 45 W beendet den Bypass. Sobald normale Akkuunterstützung und eine kleine
Überregelung zurückkehren, kann derselbe Einstieg erneut stattfinden.

Die bisherigen Tests prüften vorwiegend einzelne Berechnungen. Sie bewiesen
keine Stabilität dieser Abfolge. Zusätzlich wurden Entscheidungen bei jedem
Entitätsereignis neu berechnet; die Begrenzung von Geräte-Schreibvorgängen und
deren Rückmeldungswartezeit entprellen den Statuswechsel nicht. Zeitversetzt
eintreffende Messungen können daher weitere kurze Kandidatenwechsel erzeugen.

## Korrektur 1.11.1

- Beim Einstieg wird öffentliche Einspeisung nicht mehr als Ausgleich für
  gemessene Akkuunterstützung anerkannt. Maximal 10 W gemessene Akkuentladung
  und 10 W Netzbezug gegenüber dem konfigurierten Netzziel sind erlaubt.
- Die gesamte Freigabe muss 30 Sekunden durchgehend bestehen. Währenddessen
  arbeitet der ausgewählte Grundmodus weiter. Ein ungeeigneter Zwischenwert
  setzt die Prüfung zurück. Ein Timer wertet nach Ablauf auch unveränderte
  Messwerte erneut aus.
- Ein aktiver Bypass behält die bisherige 30-W-Rückmeldungstoleranz und wird
  bei nicht gedecktem Verbrauch sofort verlassen. Ladeanforderungen, fehlende
  DC-PV-Freigabe, AC-Kopplung, ausgeschaltete Option und Freigabeende am SOC
  bleiben sofort wirksam. Eine erneute Freigabe benötigt wieder 30 Sekunden.
- Zustand und Timer werden bei deaktivierter Regelung oder ungültigen Daten
  zurückgesetzt; der Timer wird beim Entladen der Integration abgebrochen.

## Prüfung und Grenzen

135 Python-Tests und 18 Dashboard-Tests bestanden; Python-Kompilierung,
JavaScript-Syntax und Diff-Prüfung ebenfalls erfolgreich.
Neue Tests prüfen die oben beschriebene wiederholte Folge, kontinuierliche
Freigabe mit Unterbrechung, die getrennte Ein-/Ausstiegstoleranz, sofortigen
Ausstieg und verzögerten Wiedereinstieg sowie Aufwecken und Abbruch des Timers.

Die synthetische Folge bleibt mit der Korrektur im Normalbetrieb. Bei echten
anhaltenden Überschusswerten wird der Bypass nach 30 Sekunden freigegeben.
Ändert sich die reale verfügbare PV längerfristig, sind Wechsel weiterhin
sachlich notwendig; die Korrektur verspricht keinen dauerhaft festgehaltenen
Bypass bei unzureichender PV. Ein neuer Hardwaretest steht aus.
