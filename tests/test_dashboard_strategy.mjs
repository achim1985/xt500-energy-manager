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

  assert.equal(result.views.length, 3);
  const imported = result.views[2];
  assert.equal(imported.title, "PV");
  assert.equal(imported.icon, "mdi:solar-power");
  assert.equal(imported.path, "zusatz-dashboard-achim-strom");
  assert.equal(imported.subview, false);
  assert.deepEqual(plain(imported.visible), [{ user: "existing-user" }]);
  assert.deepEqual(plain(imported.sections), source.views[1].sections);
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

  assert.deepEqual(plain(result.views[2].visible), [{ user: "saved-user" }]);
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

  assert.equal(result.views.length, 3);
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

  assert.equal(result.views.length, 2);
  assert.equal(result.views[0].path, "speicher");
  assert.equal(result.views[1].path, "einstellungen");
});

test("stellt einen grafischen Strategy-Editor bereit", () => {
  assert.deepEqual(Strategy.getConfigElement(), {
    tagName: "xt500-energy-manager-strategy-editor",
  });
  assert.ok(customElementRegistry.has("xt500-energy-manager-strategy-editor"));
});
