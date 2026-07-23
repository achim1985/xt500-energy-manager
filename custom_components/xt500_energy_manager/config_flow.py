"""Config flow for XT500 Energy Manager."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry, ConfigFlowResult
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_BATTERY_INPUT_POWER_ENTITY,
    CONF_BATTERY_OUTPUT_POWER_ENTITY,
    CONF_GRID_PORT_POWER_ENTITY,
    CONF_GRID_POWER_ENTITY,
    CONF_GRID_SETPOINT_ENTITY,
    CONF_INVERTER_SETPOINT_ENTITY,
    CONF_LOAD_PORT_POWER_ENTITY,
    CONF_MAX_CHARGE_SOC_ENTITY,
    CONF_METER_SIGN,
    CONF_PV_POWER_ENTITY,
    CONF_SOC_ENTITY,
    DOMAIN,
    METER_IMPORT_POSITIVE,
    METER_SIGNS,
)


def _entity_selector(domain: str, *, multiple: bool = False) -> selector.EntitySelector:
    return selector.EntitySelector(
        selector.EntitySelectorConfig(domain=domain, multiple=multiple)
    )


def _schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    values = defaults or {}

    def required(key: str, fallback: Any = None) -> vol.Required:
        if key in values:
            return vol.Required(key, default=values[key])
        if fallback is not None:
            return vol.Required(key, default=fallback)
        return vol.Required(key)

    def optional(key: str) -> vol.Optional:
        if key in values and values[key]:
            return vol.Optional(key, default=values[key])
        return vol.Optional(key)

    return vol.Schema(
        {
            required(CONF_SOC_ENTITY): _entity_selector("sensor"),
            required(CONF_PV_POWER_ENTITY): _entity_selector("sensor"),
            required(CONF_GRID_POWER_ENTITY): _entity_selector("sensor"),
            required(CONF_GRID_PORT_POWER_ENTITY): _entity_selector("sensor"),
            required(CONF_LOAD_PORT_POWER_ENTITY): _entity_selector("sensor"),
            required(CONF_GRID_SETPOINT_ENTITY): _entity_selector("number"),
            required(CONF_INVERTER_SETPOINT_ENTITY): _entity_selector("number"),
            required(CONF_MAX_CHARGE_SOC_ENTITY): _entity_selector("number"),
            optional(CONF_BATTERY_INPUT_POWER_ENTITY): _entity_selector("sensor"),
            optional(CONF_BATTERY_OUTPUT_POWER_ENTITY): _entity_selector("sensor"),
            required(CONF_METER_SIGN, METER_IMPORT_POSITIVE): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(METER_SIGNS),
                    translation_key="meter_sign",
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
        }
    )


class XT500EnergyManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle XT500 Energy Manager setup."""

    VERSION = 2

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            await self.async_set_unique_id(user_input[CONF_GRID_SETPOINT_ENTITY])
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="XT500 Energiemanager", data=user_input)
        return self.async_show_form(step_id="user", data_schema=_schema())

    @staticmethod
    @callback
    def async_get_options_flow(_config_entry: ConfigEntry) -> config_entries.OptionsFlow:
        return XT500OptionsFlow()


class XT500OptionsFlow(config_entries.OptionsFlow):
    """Allow source entities to be corrected without recreating the entry."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self.hass.config_entries.async_update_entry(self.config_entry, data=user_input)
            return self.async_create_entry(title="", data={})
        return self.async_show_form(
            step_id="init", data_schema=_schema(dict(self.config_entry.data))
        )
