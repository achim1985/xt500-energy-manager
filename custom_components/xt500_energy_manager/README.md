# XT500 Energy Manager 1.4.0

Production-ready Home Assistant controller for SunEnergyXT XT500 and XT500 Pro
systems. The integration directly controls the grid-port setpoint, inverter
ceiling, and system charge limit.

## Safety and control behavior

- Production writes start only after Home Assistant is fully running and every
  configured input remained valid for five seconds.
- Adaptive small, medium, and large response bands limit write frequency and
  setpoint changes.
- After a control write, fresh public-meter and XT500 grid-port feedback is
  required before another correction.
- Invalid input data stops writes. A write error latches the controller in a
  stopped state. Optional automatic recovery waits for stable fresh feedback,
  probes the unchanged inverter setpoint, and requires new measurements before
  releasing the latch. Three failed attempts still require a manual master
  switch reset.
- In PV-surplus mode, low PV clamps both setpoints to zero immediately. Output
  is released only after PV stayed above the restart threshold for the
  configured delay.
- The integration does not discover, disable, or enable unrelated automations.
  Any existing automation that writes the same device setpoints must be disabled
  before this controller is enabled.

## Charge limits and targets

- **Normal-operation charge limit** is written to the selected device system
  charge-limit entity during normal operation.
- Manual or automatic target charging temporarily raises the device limit when
  the requested target is higher than the normal limit.
- Reaching a target ends the corresponding charge request and restores the
  normal-operation limit.
- Reaching the automatic full-charge target through ordinary PV charging also
  records a completed full charge and resets the cycle interval.
- The configured value is clamped to the range supported by the selected device
  entity.

## Charging modes

- **Grid charging:** requests the configured charging power from the grid.
- **PV surplus:** passes current PV through only up to home demand and leaves the
  remainder for battery charging, without intentional grid charging.
- **PV priority:** uses PV only and prevents intentional battery discharge while
  the target remains active.
- **PV and grid:** treats the configured power as the total battery charging
  target and requests only the shortfall after available PV from the grid.

Manual charging overrides an automatic due state. Both return to the selected
base mode after completion.

## Installation

1. Install and configure the original
   [SunEnergyXT 500 Series](https://github.com/SunEnergyXT/SunEnergyXT-500-Series)
   integration first.
2. Add `https://github.com/achim1985/xt500-energy-manager` to HACS as a
   custom repository of type **Integration** and download it.
3. Restart Home Assistant.
4. Add **XT500 Energy Manager** under Settings → Devices & services.
5. Select the measurement entities and the writable number entities:
   grid-port setpoint, inverter ceiling, system charge limit, and optionally
   the original load-port discharge limit.
6. Confirm the public meter sign convention.
7. Ensure no other automation writes those same number entities, then enable
   the energy manager.

## Generated dashboard

Register
`/xt500_energy_manager/xt500-energy-dashboard-strategy.js?v=1.4.0` once as a
JavaScript module under Settings → Dashboards → Resources. Then add the
**XT500 Energiemanager** community dashboard.

The generated dashboard uses only built-in Home Assistant cards. It includes
status, power flows, manual and automatic charging, normal-operation limits,
adaptive tuning, and a collapsible operating guide.

The graphical strategy editor can add individual views from other
storage-mode Home Assistant dashboards as native top-level tabs. The source
view remains authoritative and is reloaded with the strategy. Existing source
visibility restrictions are preserved; an imported view can additionally be
limited to the user who configured it.

The same editor can reorder or hide the independently generated blocks on the
overview and settings pages. Up/down controls work on desktop and mobile, and
each page can be reset to its complete default layout.

Battery charging and discharging are displayed as mutually exclusive net
values derived from the original XT500 total input and total output sensors.
The cycle status also shows the next calculated cycle-charge date.

Use a maximum positive home-grid output of about 800 W for an XT500 unless the
local installation permits another value. This output setting does not limit
the negative grid-charging setpoint. Grid charging follows the configured
charging power and the source entity's real device range; XT500 Pro systems can
charge at up to 2400 W.
