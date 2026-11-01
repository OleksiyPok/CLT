// The application: loads the data, applies the settings and connects the modules by events.
import { APP_VERSION, STORAGE_KEY } from "../core/config.js";
import { EventTypes } from "../core/event-types.js";

export function createApp({ bus, config, langLoader, timeDictLoader, store, ui, voices, wakeLock, utils }) {
  function setupDeveloperButtons() {
    document.getElementById("developerPathBtn")?.addEventListener("click", () => alert(location.href));
    document.getElementById("developerClearBtn")?.addEventListener("click", () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      alert("Saved settings cleared");
    });
  }

  async function init() {
    const appCfg = await config.load();
    utils.setDebug(appCfg.developerMode);

    await timeDictLoader.loadAll(config.TIME_LANGS);

    ui.buildRows(appCfg.rows);
    store.setDefaultActive(appCfg);
    ui.setDeveloperVisibility(appCfg);

    const versionEl = document.getElementById("appVersion");
    if (versionEl) versionEl.textContent = APP_VERSION;
    setupDeveloperButtons();

    await langLoader.loadAll(config.UI_LANGS);
    const { raw, merged } = store.loadSettingsFromLocal(ui.els);
    store.setSettings(merged);
    ui.applySettingsToUI(merged, { raw });
    store.saveSettings(merged, ui.els);

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
      if (saveFromUI) store.saveSettings(s, ui.els);
    });

    bus.on(EventTypes.UI_TRANSLATE, ({ lang }) => {
      ui.translateUI(lang);
    });

    bus.on(EventTypes.SETTINGS_RESET, () => {
      const defaults = store.getDefaultActive();
      store.setSettings(defaults);
      store.saveSettings(defaults, ui.els);
      ui.applySettingsToUI(defaults, { raw: defaults });
    });

    window.addEventListener("pagehide", () => bus.emit(EventTypes.APP_CLOSED));
    window.addEventListener("beforeunload", () => bus.emit(EventTypes.APP_CLOSED));

    bus.emit(EventTypes.APP_INIT);
  }

  return { init };
}
