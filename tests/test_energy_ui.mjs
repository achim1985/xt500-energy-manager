import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../custom_components/xt500_energy_manager/", import.meta.url);
const source = fs.readFileSync(new URL("frontend/xt500-energy-ui.js", root), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));

// Lädt das Modul in eine minimale Browser-Umgebung
const load = (registry = new Map(), window = {}) => {
  const context = vm.createContext({
    console: { ...console, info: () => {} },
    window,
    localStorage: { getItem: () => null, setItem: () => {} },
    customElements: {
      define: (name, cls) => {
        if (registry.has(name)) throw new Error(`${name} already defined`);
        registry.set(name, cls);
      },
      get: (name) => registry.get(name),
    },
    HTMLElement: class { attachShadow() { this.shadowRoot = {}; return this.shadowRoot; } },
    CustomEvent: class {},
  });
  vm.runInContext(source, context);
  return { registry, window };
};

test("registriert Karten, Editor und Strategie", () => {
  const { registry, window } = load();
  for (const name of ["xt500-energy-card", "xt500-energy-mini-card", "xt500-energy-card-editor", "ll-strategy-dashboard-xt500-energy"]) {
    assert.ok(registry.has(name), name);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(window.customCards.map((c) => c.type))), ["xt500-energy-card", "xt500-energy-mini-card"]);
});

test("mehrfaches Laden scheitert nicht", () => {
  const registry = new Map();
  const window = {};
  load(registry, window);
  assert.doesNotThrow(() => load(registry, window));
  assert.equal(window.customCards.length, 2);
});

test("Strategie erzeugt ein Panel mit der Hauptkarte und reicht Optionen durch", async () => {
  const { registry } = load();
  const Strategy = registry.get("ll-strategy-dashboard-xt500-energy");
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const result = plain(await Strategy.generate({ type: "custom:xt500-energy", title: "Speicher", manager_id: "abc", capacity_kwh: 5 }));
  assert.equal(result.title, "Speicher");
  assert.equal(result.views.length, 1);
  assert.equal(result.views[0].type, "panel");
  assert.deepEqual(result.views[0].cards, [{ type: "custom:xt500-energy-card", manager_id: "abc", capacity_kwh: 5 }]);
});

test("Version der Oberfläche passt zur Integration", () => {
  const match = source.match(/const VERSION = '([^']+)'/);
  assert.equal(match?.[1], manifest.version);
});

test("Live-Updates erhalten Scrollposition über Shadow-DOM-Grenzen", () => {
  const { registry } = load();
  const card = new (registry.get("xt500-energy-card"))();
  const page = { scrollTop: 900, scrollLeft: 0, parentNode: null };
  const panel = { scrollTop: 480, scrollLeft: 5, parentNode: page };
  card.parentNode = { host: panel };
  let updates = 0;
  card._updaters = [() => {
    updates++;
    // Layoutänderung oberhalb des sichtbaren Bereichs.
    panel.scrollTop = 320;
    panel.scrollLeft = 0;
    page.scrollTop = 760;
  }];
  card._update();
  assert.equal(updates, 1, "Live-Werte werden weiterhin aktualisiert");
  assert.equal(panel.scrollTop, 480);
  assert.equal(panel.scrollLeft, 5);
  assert.equal(page.scrollTop, 900);
  // Benutzer scrollt weiter: diese neue Position muss gelten.
  panel.scrollTop = 650;
  card._update();
  assert.equal(panel.scrollTop, 650);
  assert.equal(updates, 2);
});
