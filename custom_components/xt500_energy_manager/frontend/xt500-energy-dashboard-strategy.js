const XT500_DISPLAY_NAMES = {
  status: "Status",
  recovery_status: "Fehlerwiederherstellung",
  active_mode: "Lademodus",
  data_valid: "Eingangsdaten",
  control_ready: "Produktivregelung",
  charge_request: "Ladeanforderung",
  recommended_grid_setpoint: "Netzanschluss-Sollwert",
  recommended_inverter_setpoint: "Wechselrichter-Obergrenze",
  desired_charge_limit: "System-Ladegrenze",
  estimated_home_load: "Hausverbrauch (geschätzt)",
  control_band: "Regelstufe",
  control_error: "Regelabweichung",
  control_interval: "Aktiver Regelabstand",
  control_max_step: "Aktive maximale Änderung",
  feedback_ready: "Neue Rückmeldungen",
  pv_release_active: "PV-Ausgabe",
  active_target_soc: "Aktives Ladeziel",
  cycle_state: "Zyklusstatus",
  cycle_charge_active: "Zyklusladung aktiv",
  cycle_due: "Zyklus fällig",
  cycle_check_time: "Tägliche Prüfzeit",
  days_since_full: "Tage im aktuellen Zyklus",
  next_cycle_at: "Nächste Zyklusladung",
  battery_charge_power: "Batterie lädt",
  battery_discharge_power: "Batterie entlädt",
};

const XT500_DISPLAY_ICONS = {
  active_target_soc: "mdi:battery-charging",
};

class XT500EnergyManagerDashboardStrategy extends HTMLElement {
  static getCreateSuggestions(_hass) {
    return { title: "XT500 Energiemanager", icon: "mdi:home-battery" };
  }

  static async generate(config, hass) {
    const managers = new Map();
    for (const [entityId, state] of Object.entries(hass.states)) {
      if (state.attributes.integration !== "xt500_energy_manager") continue;
      const managerId = state.attributes.xt500_manager_id || "default";
      if (!managers.has(managerId)) managers.set(managerId, {});
      managers.get(managerId)[state.attributes.xt500_key] = entityId;
    }

    if (managers.size === 0) {
      return {
        title: config.title || "XT500 Energiemanager",
        views: [{
          title: "Einrichtung",
          path: "setup",
          icon: "mdi:home-battery",
          cards: [{
            type: "markdown",
            title: "Noch kein XT500 eingerichtet",
            content: "Richte zuerst **XT500 Energy Manager** unter Einstellungen → Geräte & Dienste ein. Das Dashboard aktualisiert sich danach automatisch.",
          }],
        }],
      };
    }

    const views = [];
    let index = 0;
    for (const entities of managers.values()) {
      index += 1;
      const sourceAttributes = hass.states[entities.status]?.attributes || {};
      const socEntity = sourceAttributes.source_soc_entity;
      const actualGridSetpoint = sourceAttributes.source_grid_setpoint_entity;
      const actualChargeLimit = sourceAttributes.source_max_charge_soc_entity;
      const actualLoadDischargeLimit =
        sourceAttributes.source_load_discharge_limit_entity;
      const existing = (keys) => keys.map((key) => entities[key]).filter(Boolean);
      const namedExisting = (keys) => keys
        .filter((key) => entities[key])
        .map((key) => ({
          entity: entities[key],
          name: XT500_DISPLAY_NAMES[key] || key,
          ...(XT500_DISPLAY_ICONS[key] ? { icon: XT500_DISPLAY_ICONS[key] } : {}),
          ...(key === "next_cycle_at" ? { format: "datetime" } : {}),
        }));
      const heading = (text, icon) => ({ type: "heading", heading: text, icon });
      const tile = (key, name, features = []) => entities[key] ? {
        type: "tile",
        entity: entities[key],
        name,
        features,
        grid_options: { columns: "full", rows: "auto" },
      } : null;
      const compact = (cards) => cards.filter(Boolean);

      const statusEntities = [
        ...namedExisting([
          "status", "control_ready", "recovery_status", "active_mode", "charge_request",
          "active_target_soc", "desired_charge_limit", "pv_release_active", "data_valid",
        ]),
        { type: "section", label: "Sollwerte und Berechnung" },
      ];
      if (actualGridSetpoint && hass.states[actualGridSetpoint]) {
        statusEntities.push({ entity: actualGridSetpoint, name: "Netz-Sollwert am Gerät" });
      }
      if (actualChargeLimit && hass.states[actualChargeLimit]) {
        statusEntities.push({ entity: actualChargeLimit, name: "System-Ladegrenze am Gerät" });
      }
      statusEntities.push(...namedExisting([
        "recommended_grid_setpoint",
        "recommended_inverter_setpoint",
        "estimated_home_load",
      ]));
      statusEntities.push(
        { type: "section", label: "Zyklusladung" },
        ...namedExisting([
          "cycle_state",
          "days_since_full",
          "next_cycle_at",
        ]),
      );

      const flowEntities = [
        [entities.battery_charge_power, "Batterie lädt"],
        [entities.battery_discharge_power, "Batterie entlädt"],
        [sourceAttributes.source_pv_power_entity, "PV-Eingang"],
        [sourceAttributes.source_public_grid_power_entity, "Öffentliches Netz (+ Bezug)"],
        [sourceAttributes.source_grid_port_power_entity, "XT500 Netzanschluss"],
        [sourceAttributes.source_load_port_power_entity, "XT500 Lastanschluss"],
      ]
        .filter(([entityId]) => entityId && hass.states[entityId])
        .map(([entityId, name]) => ({ entity: entityId, name }));

      const mainControlCards = compact([
        heading("Hauptsteuerung", "mdi:power"),
        tile("regulation_enabled", "Regelung aktiv", [{ type: "toggle" }]),
        tile("automatic_recovery_enabled", "Automatische Fehlerwiederherstellung", [{ type: "toggle" }]),
        tile("show_advanced", "Feinabstimmung anzeigen", [{ type: "toggle" }]),
      ]);
      const chargeControlCards = compact([
        heading("Manuelle Zielladung", "mdi:battery-arrow-up"),
        tile("manual_active", "Zielladung starten", [{ type: "toggle" }]),
        tile("manual_mode", "Lademodus", [{ type: "select-options" }]),
        tile("target_soc", "Ladeziel", [{ type: "numeric-input", style: "buttons" }]),
        tile("charge_power", "AC-Ladeleistung", [{ type: "numeric-input", style: "buttons" }]),
        heading("Zyklusladung", "mdi:battery-sync"),
        tile("cycle_start", "Jetzt manuell starten", [{ type: "button" }]),
        tile("cycle_reset", "Zyklustage auf 0 setzen", [{ type: "button" }]),
        tile("automatic_enabled", "Automatische Zyklusüberwachung", [{ type: "toggle" }]),
        entities.cycle_check_time ? {
          type: "entities",
          show_header_toggle: false,
          entities: [{
            entity: entities.cycle_check_time,
            name: "Tägliche Prüfzeit",
            icon: "mdi:clock-check-outline",
          }],
        } : null,
        tile("automatic_mode", "Lademodus der Zyklusladung", [{ type: "select-options" }]),
        tile("automatic_target_soc", "Vollladeziel", [{ type: "numeric-input", style: "buttons" }]),
        tile("cycle_interval_days", "Intervall in Tagen", [{ type: "numeric-input", style: "buttons" }]),
      ]);
      const normalControlCards = compact([
        heading("Normalbetrieb und Grenzen", "mdi:tune-variant"),
        tile("base_mode", "Grundmodus", [{ type: "select-options" }]),
        tile("normal_charge_limit", "Ladelimit Normalbetrieb", [{ type: "numeric-input", style: "buttons" }]),
        actualLoadDischargeLimit && hass.states[actualLoadDischargeLimit] ? {
          type: "tile",
          entity: actualLoadDischargeLimit,
          name: "Lastanschluss-Entladegrenze",
          features: [{ type: "numeric-input", style: "buttons" }],
          grid_options: { columns: "full", rows: "auto" },
        } : null,
        tile("minimum_soc", "Entladegrenze", [{ type: "numeric-input", style: "buttons" }]),
        tile("soc_hysteresis", "Wiederfreigabe", [{ type: "numeric-input", style: "buttons" }]),
        tile("target_grid_power", "Netzziel", [{ type: "numeric-input", style: "buttons" }]),
        tile("maximum_grid_output", "Hausnetz-Limit", [{ type: "numeric-input", style: "buttons" }]),
      ]);
      const advancedControlCards = compact([
        heading("Adaptive Regelung", "mdi:speedometer"),
        existing(["control_band", "control_error", "control_interval", "control_max_step", "feedback_ready"]).length ? {
          type: "entities",
          show_header_toggle: false,
          entities: namedExisting(["control_band", "control_error", "control_interval", "control_max_step", "feedback_ready"]),
        } : null,
        heading("Fehlergrenzen", "mdi:approximately-equal"),
        tile("control_small_error", "Fein → Mittel", [{ type: "numeric-input", style: "buttons" }]),
        tile("control_large_error", "Mittel → Schnell", [{ type: "numeric-input", style: "buttons" }]),
        heading("Maximale Änderung je Regelvorgang", "mdi:delta"),
        tile("control_small_max_step", "Kleine Abweichung", [{ type: "numeric-input", style: "buttons" }]),
        tile("control_medium_max_step", "Mittlere Abweichung", [{ type: "numeric-input", style: "buttons" }]),
        tile("control_large_max_step", "Große Abweichung", [{ type: "numeric-input", style: "buttons" }]),
        heading("Zeitverhalten", "mdi:timer-cog-outline"),
        tile("control_slow_interval", "Bei kleiner Abweichung", [{ type: "numeric-input", style: "buttons" }]),
        tile("control_medium_interval", "Bei mittlerer Abweichung", [{ type: "numeric-input", style: "buttons" }]),
        tile("control_fast_interval", "Bei großer Abweichung", [{ type: "numeric-input", style: "buttons" }]),
        tile("feedback_settle_time", "Wartezeit auf Messwerte", [{ type: "numeric-input", style: "buttons" }]),
        heading("Automatische Fehlerwiederherstellung", "mdi:shield-refresh"),
        tile("recovery_stability_time", "Stabile Rückmeldungen abwarten", [{ type: "numeric-input", style: "buttons" }]),
        heading("PV-Ausgabe bei geringer Leistung", "mdi:solar-power-variant-outline"),
        tile("pv_stop_power", "Unterhalb sofort auf 0 W", [{ type: "numeric-input", style: "buttons" }]),
        tile("pv_start_power", "Erneut freigeben oberhalb", [{ type: "numeric-input", style: "buttons" }]),
        tile("pv_start_delay", "Startleistung muss anliegen", [{ type: "numeric-input", style: "buttons" }]),
      ]);

      const topCards = [];
      if (socEntity && hass.states[socEntity]) {
        topCards.push({
          type: "gauge",
          entity: socEntity,
          name: "Speicherstand",
          min: 0,
          max: 100,
          severity: { red: 0, yellow: 20, green: 60 },
        });
      }
      topCards.push({
        type: "entities",
        title: "Regelungsstatus",
        show_header_toggle: false,
        entities: statusEntities,
      });

      const guideCard = {
        type: "markdown",
        title: "Bedienung und Sicherheit",
        content:
          "<details><summary><b>Anleitung und Beispiele anzeigen</b></summary>\n\n" +
          "**Produktivbetrieb:** Ist **Regelung aktiv** eingeschaltet, prüft die Integration nach jedem Home-Assistant-Start zunächst fünf Sekunden lang alle Eingangsdaten. Danach schreibt sie die Netz-, Wechselrichter- und Ladegrenzen direkt auf das Gerät. Andere Automationen dürfen dieselben Sollwerte nicht gleichzeitig verändern.\n\n" +
          "**Normalbetrieb und Ladelimit**\n\n" +
          "- **Normalbetrieb:** Der Speicher gleicht den Hausverbrauch aus und hält das eingestellte Netzziel ein. Oberhalb der Entladegrenze darf er Energie ins Haus abgeben.\n" +
          "- **PV-Überschuss als Grundmodus:** Nur aktuell verfügbare PV-Leistung wird bis zum Hausbedarf freigegeben. Nicht benötigte PV-Leistung bleibt zum Laden im Akku; zusätzliche Batterieentladung wird vermieden.\n" +
          "- **Ladelimit Normalbetrieb:** Dieser Wert wird als echte System-Ladegrenze an den Speicher geschrieben. Der auswählbare Bereich folgt dem Gerät; beim hier verwendeten System sind das 70 bis 100 %.\n" +
          "- **Lastanschluss-Entladegrenze:** Das ist die originale Geräte-Einstellung für den gesonderten XT500-Lastanschluss. Sie wird direkt am Speicher geändert und ist von der Entladegrenze der Energiemanager-Regelung getrennt.\n" +
          "- **Entladegrenze:** Unterhalb dieses SOC stoppt der Energiemanager die geregelte Batterieabgabe ins Hausnetz. Die Wiederfreigabe erfolgt erst oberhalb der zusätzlich eingestellten Hysterese.\n" +
          "- Startet eine manuelle oder automatische Zielladung oberhalb des normalen Limits, hebt die Integration die System-Ladegrenze vorübergehend auf das benötigte Ziel an. Nach Zielerreichung stellt sie automatisch das normale Ladelimit wieder her.\n\n" +
          "**Lademodi für manuelle und automatische Ladung**\n\n" +
          "- **Netzladung:** Lädt mit der eingestellten AC-Leistung; Netzbezug ist erlaubt. Beispiel: 1.200 W und Ziel 100 % erreichen das Ziel auch nachts.\n" +
          "- **PV-Überschuss:** Gibt aktuelle PV-Leistung nur passend zum Hausverbrauch weiter; der Rest kann den Akku laden. Es wird keine Netzladung angefordert. Das Ziel kann mehrere Tage aktiv bleiben.\n" +
          "- **PV-Vorrang:** Verfolgt das Ziel ausschließlich mit PV und hält die Batterieentladung zurück. Bei schlechtem Wetter läuft die Anforderung über mehrere Tage weiter.\n" +
          "- **PV + Netz:** Nutzt vorhandene PV und fordert zusätzlich die eingestellte AC-Ladeleistung aus dem Netz an. Damit wird das Ziel auch an schlechten Tagen erreicht.\n\n" +
          "**Zyklusladung: Überwachung, Start und Rücksetzen**\n\n" +
          "- **Automatische Zyklusüberwachung** beobachtet nur den Zeitabstand. Sie bedeutet nicht, dass gerade geladen wird.\n" +
          "- Ist das Intervall abgelaufen, zeigt der Zyklusstatus **Fällig – wartet auf tägliche Prüfzeit**. Erst zur eingestellten **täglichen Prüfzeit** startet die Integration die Ladung im gewählten Zyklus-Lademodus.\n" +
          "- **Jetzt manuell starten** beginnt die Zyklusladung sofort – unabhängig davon, ob sie bereits fällig ist. Dafür werden ebenfalls der Zyklus-Lademodus und das Vollladeziel verwendet. Die automatische Überwachung bleibt unverändert ein- oder ausgeschaltet.\n" +
          "- Der **Zyklusstatus** unterscheidet eindeutig zwischen Überwachung, fälligem Zyklus, manueller Zyklusladung, automatischer Zyklusladung und einer angehaltenen Ladung.\n" +
          "- **Nächste Zyklusladung** zeigt den aktuell berechneten Termin aus letzter Vollladung bzw. Rücksetzzeitpunkt, Intervall und täglicher Prüfzeit.\n" +
          "- **Zyklustage auf 0 setzen** beginnt das Intervall ab jetzt neu und beendet eine eventuell laufende Zyklusladung. Es wird dabei keine künstliche Vollladung eingetragen.\n\n" +
          "**Ziel erreicht**\n\n" +
          "- Beim manuellen Ziel wird die manuelle Zielladung ausgeschaltet und der Grundmodus wieder aktiv.\n" +
          "- Erreicht eine manuell oder automatisch gestartete Zyklusladung das Vollladeziel, wird sie beendet, der Zeitpunkt gespeichert und der Grundmodus wieder aktiv.\n" +
          "- Die nächste automatische Zyklusladung wird erst nach dem Intervall und anschließend zur täglichen Prüfzeit gestartet.\n" +
          "- Erreicht der Speicher das automatische Vollladeziel ganz normal durch PV, zählt dies ebenfalls als erfolgreiche Vollladung – auch ohne laufende Zyklusladung.\n" +
          "- Die System-Ladegrenze kehrt danach immer zum **Ladelimit Normalbetrieb** zurück.\n\n" +
          "**Regelruhe und Sicherheit:** Kleine Abweichungen werden fein, mittlere stärker und große Lastsprünge schnell korrigiert. Nach einem Sollwertschreiben wartet die Integration auf neue Messwerte. Im PV-Überschussbetrieb setzt die Niedrig-PV-Sperre beide Sollwerte unterhalb der Abschaltschwelle sofort auf 0 W und gibt sie erst nach der eingestellten Zeit oberhalb der Startleistung wieder frei.\n\n" +
          "**Leistungsflüsse:** Batterie lädt und Batterie entlädt sind Nettowerte aus den originalen XT500-Gesamteingangs- und Gesamtausgangsleistungen. Beispiel: 200 W Eingang und 300 W Ausgang werden als 0 W Laden und 100 W tatsächliches Entladen angezeigt.\n\n" +
          "**Fehlerwiederherstellung:** Ein Schreibfehler verriegelt die Regelung sofort. Wenn die automatische Wiederherstellung aktiv ist, müssen beide Rückmeldungen zunächst für die eingestellte Zeit gültig und aktuell bleiben. Danach prüft die Integration die Verbindung mit einem wirkungslosen Schreibtest auf den bereits vorhandenen Wechselrichter-Sollwert und wartet auf neue Messwerte. Bei Erfolg wird die Regelung wieder freigegeben. Es gibt höchstens drei Versuche mit wachsender Wartezeit; danach ist ein manueller Aus-/Ein-Reset von **Regelung aktiv** erforderlich.\n\n" +
          "**Leistungsgrenzen:** Für einen XT500 üblicherweise 800 W als Hausnetz-Limit einstellen. Ein XT500 Pro kann bis zu 2.400 W nutzen. Die Wechselrichter-Obergrenze ist ein technischer Sollwert, kein gemessener Leistungsfluss.\n\n" +
          "</details>",
      };

      views.push({
        title: managers.size > 1 ? `XT500 ${index}` : "Speicher",
        path: managers.size > 1 ? `speicher-${index}` : "speicher",
        icon: "mdi:home-battery",
        type: "sections",
        max_columns: 2,
        sections: [
          {
            type: "grid",
            cards: [
              { type: "heading", heading: "Status und Regelung", icon: "mdi:shield-check" },
              ...topCards,
            ],
          },
          {
            type: "grid",
            cards: [
              ...(flowEntities.length ? [
                { type: "heading", heading: "Aktuelle Leistungsflüsse", icon: "mdi:transmission-tower" },
                { type: "entities", show_header_toggle: false, entities: flowEntities },
              ] : []),
              heading("Schnellsteuerung", "mdi:shield-home"),
              tile("regulation_enabled", "Regelung aktiv", [{ type: "toggle" }]),
              tile("automatic_recovery_enabled", "Fehler automatisch beheben", [{ type: "toggle" }]),
              tile("manual_active", "Manuelle Zielladung", [{ type: "toggle" }]),
              tile("cycle_start", "Zyklusladung jetzt starten", [{ type: "button" }]),
              tile("automatic_enabled", "Automatische Zyklusüberwachung", [{ type: "toggle" }]),
            ].filter(Boolean),
          },
        ],
      });

      views.push({
        title: managers.size > 1 ? `Einstellungen ${index}` : "Einstellungen",
        path: managers.size > 1 ? `einstellungen-${index}` : "einstellungen",
        icon: "mdi:cog-outline",
        type: "sections",
        max_columns: 3,
        sections: [
          { type: "grid", column_span: 3, cards: [guideCard] },
          { type: "grid", cards: mainControlCards },
          { type: "grid", cards: chargeControlCards },
          { type: "grid", cards: normalControlCards },
          ...(entities.show_advanced ? [{
            type: "grid",
            cards: advancedControlCards,
            visibility: [{ condition: "state", entity: entities.show_advanced, state: "on" }],
          }] : []),
        ],
      });
    }

    return { title: config.title || "XT500 Energiemanager", views };
  }
}

if (!customElements.get("ll-strategy-dashboard-xt500-energy-manager")) {
  customElements.define(
    "ll-strategy-dashboard-xt500-energy-manager",
    XT500EnergyManagerDashboardStrategy,
  );
}

window.customStrategies = window.customStrategies || [];
if (!window.customStrategies.some((strategy) => strategy.type === "xt500-energy-manager")) {
  window.customStrategies.push({
    type: "xt500-energy-manager",
    strategyType: "dashboard",
    name: "XT500 Energiemanager",
    description: "Automatisch erzeugte Bedien- und Diagnoseoberfläche für den XT500 Energiemanager.",
    documentationURL: "https://github.com/achim1985/xt500-energy-manager#4-dashboard-strategie-einrichten",
  });
}
