# Änderungsprotokoll

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
