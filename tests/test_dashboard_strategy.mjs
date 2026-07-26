import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const strategySource = fs.readFileSync(
  new URL(
    "../custom_components/xt500_energy_manager/frontend/xt500-energy-dashboard-strategy.js",
    import.meta.url,
  ),
  "utf8",
);

const customElementRegistry = new Map();
const context = vm.createContext({
  console,
  window: {},
  customElements: {
    define: (name, elementClass) => customElementRegistry.set(name, elementClass),
    get: (name) => customElementRegistry.get(name),
  },
  document: {
    createElement: (tagName) => ({ tagName }),
  },
  HTMLElement: class {
    attachShadow() {
      this.shadowRoot = {};
      return this.shadowRoot;
    }
  },
  CustomEvent: class {},
});
vm.runInContext(strategySource, context);

const Strategy = customElementRegistry.get(
  "ll-strategy-dashboard-xt500-energy-manager",
);
const StrategyEditor = customElementRegistry.get(
  "xt500-energy-manager-strategy-editor",
);

const plain = (value) => JSON.parse(JSON.stringify(value));

const managerState = {
  state: "Normalbetrieb",
  attributes: {
    integration: "xt500_energy_manager",
    xt500_manager_id: "manager-1",
    xt500_key: "status",
  },
};

const createHass = (dashboards, userId = "user-1") => ({
  states: {
    "sensor.xt500_status": managerState,
  },
  user: { id: userId },
  callWS: async (message) => {
    assert.equal(message.type, "lovelace/config");
    if (!(message.url_path in dashboards)) {
      throw new Error("Dashboard not found");
    }
    return dashboards[message.url_path];
  },
});

const createLayoutHass = () => {
  const hass = createHass({});
  hass.states["sensor.xt500_status"] = {
    ...managerState,
    attributes: {
      ...managerState.attributes,
      source_soc_entity: "sensor.xt500_soc",
      source_pv_power_entity: "sensor.xt500_pv",
    },
  };
  hass.states["sensor.xt500_soc"] = { state: "72", attributes: {} };
  hass.states["sensor.xt500_pv"] = { state: "500", attributes: {} };
  for (const key of [
    "recommended_grid_setpoint",
    "cycle_state",
    "battery_charge_power",
    "regulation_enabled",
    "automatic_recovery_enabled",
    "manual_active",
    "automatic_enabled",
    "cycle_start",
    "base_mode",
    "show_advanced",
  ]) {
    hass.states[`sensor.xt500_${key}`] = {
      state: "0",
      attributes: {
        integration: "xt500_energy_manager",
        xt500_manager_id: "manager-1",
        xt500_key: key,
      },
    };
  }
  return hass;
};

const sectionHeadings = (view) => view.sections.map((section) =>
  section.cards[0].heading || section.cards[0].title,
);

test("bindet genau die ausgewählte Quellansicht als echten Reiter ein", async () => {
  const source = {
    views: [
      {
        title: "Übersicht",
        path: "home",
        cards: [{ type: "markdown", content: "Nicht auswählen" }],
      },
      {
        title: "Strom",
        path: "strom",
        icon: "mdi:flash",
        type: "sections",
        visible: [{ user: "existing-user" }],
        sections: [{ type: "grid", cards: [{ type: "gauge", entity: "sensor.pv" }] }],
      },
    ],
  };
  const originalSource = structuredClone(source);
  const result = await Strategy.generate(
    {
      additional_views: [{
        source_dashboard: "dashboard-achim",
        source_view: "path:strom",
        title: "PV",
        icon: "mdi:solar-power",
        visibility: "all",
      }],
    },
    createHass({ "dashboard-achim": source }),
  );

  assert.equal(result.views.length, 7);
  const imported = result.views[1];
  assert.equal(imported.title, "PV");
  assert.equal(imported.icon, "mdi:solar-power");
  assert.equal(imported.path, "zusatz-dashboard-achim-strom");
  assert.equal(imported.subview, false);
  assert.deepEqual(plain(imported.visible), [{ user: "existing-user" }]);
  assert.deepEqual(plain(imported.sections), source.views[1].sections);
  assert.deepEqual(plain(result.views.map((view) => view.path)), [
    "speicher",
    "zusatz-dashboard-achim-strom",
    "energie",
    "energie-verlauf",
    "energie-verbraucher",
    "energie-live",
    "einstellungen",
  ]);
  assert.equal(result.views.at(-1).path, "einstellungen");
  assert.deepEqual(source, originalSource);
});

test("Nur für mich setzt die Ansicht auf den beim Speichern erfassten Benutzer", async () => {
  const result = await Strategy.generate(
    {
      additional_views: [{
        source_dashboard: "pv",
        source_view: "path:strom",
        visibility: "user",
        user_id: "saved-user",
      }],
    },
    createHass({
      pv: {
        views: [{ title: "Strom", path: "strom", cards: [] }],
      },
    }),
  );

  assert.deepEqual(plain(result.views[1].visible), [{ user: "saved-user" }]);
  assert.equal(result.views.at(-1).path, "einstellungen");
});

test("ignoriert doppelte Einträge und Strategie-Ansichten", async () => {
  const duplicate = {
    source_dashboard: "pv",
    source_view: "path:strom",
    visibility: "all",
  };
  const result = await Strategy.generate(
    { additional_views: [duplicate, structuredClone(duplicate)] },
    createHass({
      pv: {
        views: [
          { title: "Strom", path: "strom", cards: [] },
          {
            title: "Dynamisch",
            path: "dynamisch",
            strategy: { type: "custom:other" },
          },
        ],
      },
    }),
  );

  assert.equal(result.views.length, 7);
});

test("verhindert Selbstimport und lässt das Energiemanager-Dashboard benutzbar", async () => {
  const result = await Strategy.generate(
    {
      additional_views: [
        {
          source_dashboard: "xt500",
          source_view: "path:speicher",
          visibility: "all",
        },
        {
          source_dashboard: "missing",
          source_view: "path:strom",
          visibility: "all",
        },
      ],
    },
    createHass({
      xt500: {
        strategy: { type: "custom:xt500-energy-manager" },
      },
    }),
  );

  assert.equal(result.views.length, 6);
  assert.equal(result.views[0].path, "speicher");
  assert.equal(result.views.at(-1).path, "einstellungen");
});

test("stellt einen grafischen Strategy-Editor bereit", () => {
  assert.deepEqual(Strategy.getConfigElement(), {
    tagName: "xt500-energy-manager-strategy-editor",
  });
  assert.ok(customElementRegistry.has("xt500-energy-manager-strategy-editor"));
});

test("Editor verschiebt, versteckt und setzt Blöcke zurück", () => {
  let changes = 0;
  const editor = {
    _config: {},
    _changed: () => {
      changes += 1;
    },
    _render: () => {},
  };

  StrategyEditor.prototype._moveBlock.call(
    editor,
    "overview",
    "regulation_status",
    -1,
  );
  assert.deepEqual(plain(editor._config.overview_block_order.slice(0, 2)), [
    "regulation_status",
    "storage",
  ]);

  StrategyEditor.prototype._setBlockVisible.call(
    editor,
    "overview",
    "setpoints",
    false,
  );
  assert.deepEqual(plain(editor._config.overview_block_hidden), ["setpoints"]);

  StrategyEditor.prototype._resetBlockLayout.call(editor, "overview");
  assert.deepEqual(plain(editor._config.overview_block_hidden), []);
  assert.deepEqual(plain(editor._config.overview_block_order), [
    "storage",
    "regulation_status",
    "setpoints",
    "cycle",
    "flows",
    "quick_controls",
  ]);
  assert.equal(changes, 3);
});

test("Editor schaltet zwischen ausführlichen, kompakten und verborgenen Energieseiten um", () => {
  let changes = 0;
  const editor = {
    _config: {},
    _changed: () => {
      changes += 1;
    },
    _render: () => {},
  };

  StrategyEditor.prototype._setEnergyViewMode.call(editor, "compact");
  assert.equal(editor._config.energy_views_mode, "compact");
  StrategyEditor.prototype._setEnergyViewMode.call(editor, "hidden");
  assert.equal(editor._config.energy_views_mode, "hidden");
  StrategyEditor.prototype._setEnergyViewMode.call(editor, "invalid");
  assert.equal(editor._config.energy_views_mode, "detailed");
  assert.equal(changes, 3);
});

test("teilt die Speicheransicht standardmäßig in einzeln anordenbare Blöcke", async () => {
  const result = await Strategy.generate({}, createLayoutHass());

  assert.deepEqual(plain(sectionHeadings(result.views[0])), [
    "Speicherstand",
    "Regelungsstatus",
    "Sollwerte und Berechnung",
    "Zyklusladung",
    "Aktuelle Leistungsflüsse",
    "Schnellsteuerung",
  ]);
  const settings = result.views.find((view) => view.path === "einstellungen");
  assert.deepEqual(plain(sectionHeadings(settings)), [
    "Bedienung und Sicherheit",
    "Hauptsteuerung",
    "Manuelle Zielladung",
    "Normalbetrieb und Grenzen",
    "Adaptive Regelung",
  ]);
});

test("wendet Reihenfolge und ausgeblendete Blöcke für beide Seiten an", async () => {
  const result = await Strategy.generate(
    {
      overview_block_order: [
        "quick_controls",
        "flows",
        "storage",
        "regulation_status",
        "setpoints",
        "cycle",
      ],
      overview_block_hidden: ["flows"],
      settings_block_order: [
        "normal_limits",
        "target_charge",
        "main_control",
        "advanced",
        "guide",
      ],
      settings_block_hidden: ["guide", "advanced"],
    },
    createLayoutHass(),
  );

  assert.deepEqual(plain(sectionHeadings(result.views[0])), [
    "Schnellsteuerung",
    "Speicherstand",
    "Regelungsstatus",
    "Sollwerte und Berechnung",
    "Zyklusladung",
  ]);
  const settings = result.views.find((view) => view.path === "einstellungen");
  assert.deepEqual(plain(sectionHeadings(settings)), [
    "Normalbetrieb und Grenzen",
    "Manuelle Zielladung",
    "Hauptsteuerung",
  ]);
});

test("ordnet die Schnellsteuerung eindeutig und zeigt Fehlerbehebung nur in Einstellungen", async () => {
  const result = await Strategy.generate({}, createLayoutHass());
  const overview = result.views.find((view) => view.path === "speicher");
  const settings = result.views.find((view) => view.path === "einstellungen");
  const quickControls = overview.sections.find(
    (section) => section.cards[0].heading === "Schnellsteuerung",
  );
  const mainControl = settings.sections.find(
    (section) => section.cards[0].heading === "Hauptsteuerung",
  );
  const targetCharge = settings.sections.find(
    (section) => section.cards[0].heading === "Manuelle Zielladung",
  );

  assert.deepEqual(plain(quickControls.cards.slice(1).map((card) => card.name)), [
    "Regelung aktiv",
    "Manuelle Zielladung",
    "Automatische Zyklusüberwachung",
    "Zyklusladung jetzt starten",
  ]);
  assert.equal(
    quickControls.cards.some((card) => card.entity?.includes("automatic_recovery")),
    false,
  );
  assert.equal(
    mainControl.cards.some((card) => card.entity?.includes("automatic_recovery")),
    true,
  );

  const cycleMonitorIndex = targetCharge.cards.findIndex(
    (card) => card.name === "Automatische Zyklusüberwachung",
  );
  const cycleStartIndex = targetCharge.cards.findIndex(
    (card) => card.name === "Jetzt manuell starten",
  );
  assert.equal(cycleStartIndex, cycleMonitorIndex + 1);
});

test("erzeugt historische und aktuelle Energieansichten vor der Einstellungsseite", async () => {
  const result = await Strategy.generate({}, createLayoutHass());
  const energyViews = result.views.filter((view) =>
    view.path.startsWith("energie"),
  );

  assert.deepEqual(plain(energyViews.map((view) => view.path)), [
    "energie",
    "energie-verlauf",
    "energie-verbraucher",
    "energie-live",
  ]);
  assert.equal(result.views.at(-1).path, "einstellungen");

  const historicalViews = energyViews.filter((view) =>
    view.path !== "energie-live"
  );
  const historicalCards = historicalViews.flatMap((view) =>
    view.sections.flatMap((section) => section.cards),
  );
  const linkedCards = historicalCards.filter((card) =>
    card.type.startsWith("energy-"),
  );
  assert.ok(linkedCards.length > 10);
  assert.ok(linkedCards.every(
    (card) => card.collection_key === "energy_xt500_manager",
  ));
  assert.ok(historicalViews.every((view) =>
    view.sections[0].cards.some((card) => card.type === "energy-date-selection"),
  ));
  assert.ok(historicalViews.every((view) =>
    !view.sections.flatMap((section) => section.cards)
      .some((card) => card.type === "energy-compare-card"),
  ));

  const liveView = energyViews.find((view) => view.path === "energie-live");
  const liveCards = liveView.sections.flatMap((section) => section.cards);
  assert.ok(liveCards.some((card) => card.type === "power-sources-graph"));
  assert.ok(liveCards.some((card) => card.type === "power-sankey"));
  assert.equal(energyViews
    .flatMap((view) => view.sections.flatMap((section) => section.cards))
    .filter((card) => card.type === "power-sources-graph").length, 1);
  assert.ok(!liveCards.some((card) => card.type === "energy-date-selection"));
  assert.ok(liveCards.filter((card) => card.type.startsWith("power-")).every(
    (card) => card.collection_key === "energy_xt500_manager_live",
  ));
  assert.deepEqual(plain(liveView.badges), [
    {
      type: "power-total",
      collection_key: "energy_xt500_manager_live",
    },
    {
      type: "entity",
      entity: "sensor.xt500_soc",
      show_name: false,
      show_icon: true,
      show_state: true,
    },
  ]);
});

test("unterstützt kompakte und ausgeblendete Energieseiten", async () => {
  const compact = await Strategy.generate(
    { energy_views_mode: "compact" },
    createLayoutHass(),
  );
  assert.deepEqual(plain(compact.views.map((view) => view.path)), [
    "speicher",
    "energie",
    "einstellungen",
  ]);
  assert.ok(compact.views[1].sections
    .flatMap((section) => section.cards)
    .some((card) => card.type === "power-sankey"));
  assert.equal(compact.views[1].badges[0].type, "power-total");
  assert.equal(compact.views[1].badges[1].entity, "sensor.xt500_soc");

  const hidden = await Strategy.generate(
    { energy_views_mode: "hidden" },
    createLayoutHass(),
  );
  assert.deepEqual(plain(hidden.views.map((view) => view.path)), [
    "speicher",
    "einstellungen",
  ]);
});
