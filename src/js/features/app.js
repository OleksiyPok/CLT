// The application: loads the data, applies the settings and connects the modules by events.
import { APP_VERSION } from "../core/config.js";
import { EventTypes } from "../core/event-types.js";

export function createApp({ bus, config, langLoader, timeDictLoader, store, ui, voices, wakeLock, utils, developer }) {
  // F1 opens the help window (and not the help of the browser)
  function handleKeyControls(event) {
    if (event.key === "F1" || event.code === "F1" || event.keyCode === 112) {
      event.preventDefault();
      bus.emit(EventTypes.UI_HELP_MODAL_OPEN);
    }
  }

  async function init() {
    const appCfg = await config.load();
    utils.setDebug(appCfg.developerMode);

    await timeDictLoader.loadAll(config.TIME_LANGS);

    ui.buildRows(appCfg.rows);
    store.setDefaultActive(appCfg);
    ui.setDeveloperVisibility(appCfg);

    const versionEl = document.getElementById("version");
    if (versionEl) versionEl.textContent = `version: ${APP_VERSION}`;
    developer.init(appCfg);

    await langLoader.loadAll(config.UI_LANGS);
    const { raw, merged } = store.loadSettingsFromLocal(ui.elements);
    store.setSettings(merged);
    ui.applySettingsToUI(merged, { raw });
    store.saveSettings(merged, ui.elements);

    await voices.load();

    bus.on(EventTypes.VOICES_LOADED, () => {
      const currentSettings = store.getSettings();
      if (!currentSettings.voiceName && voices.getVoices) {
        const all = voices.getVoices();
        if (all && all.length) {
          currentSettings.voiceName = all[0].name;
          store.setSettings(currentSettings);
        }
      }
    });

    bus.on(EventTypes.APP_INIT, async () => {
      ui.init();
      wakeLock.init();
      await voices.load();
    });

    bus.on(EventTypes.SETTINGS_APPLY_TO_UI, ({ saveFromUI }) => {
      const s = ui.readSettingsFromUI();
      store.setSettings(s);
      if (saveFromUI) store.saveSettings(s, ui.elements);
    });

    bus.on(EventTypes.UI_TRANSLATE, ({ lang }) => {
      ui.updateUILabels(lang);
    });

    bus.on(EventTypes.SETTINGS_RESET, () => {
      const defaults = store.getDefaultActive();
      store.setSettings(defaults);
      store.saveSettings(defaults, ui.elements);
      ui.applySettingsToUI(defaults, { raw: defaults });
    });

    window.addEventListener("pagehide", () => bus.emit(EventTypes.APP_CLOSED));
    window.addEventListener("beforeunload", () => bus.emit(EventTypes.APP_CLOSED));
    document.addEventListener("keydown", handleKeyControls);

    bus.emit(EventTypes.APP_INIT);
  }

  return { init };
}
