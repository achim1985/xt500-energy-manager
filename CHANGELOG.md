# Änderungsprotokoll

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
