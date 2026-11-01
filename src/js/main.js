// Entry point: creates the modules and connects them.

import { createConfig } from "./core/config.js";
import { createEventBus } from "./core/event-bus.js";
import { createLangLoader } from "./core/i18n.js";
import { createStore } from "./core/store.js";
import { Utils } from "./core/utils.js";
import { createApp } from "./features/app.js";
import { createPlayback } from "./features/playback.js";
import { createSpeaker } from "./features/speaker.js";
import { createTimeDictLoader } from "./features/time-dict.js";
import { createDeveloper } from "./features/developer.js";
import { initSnap } from "./features/scroll-steps.js";
import { createTimePhrase } from "./features/time-phrase.js";
import { createUI } from "./features/ui.js";
import { createVoices } from "./features/voices.js";
import { createWakeLock } from "./features/wake-lock.js";

const bus = createEventBus();
const Config = createConfig();
const LangLoader = createLangLoader({ config: Config, utils: Utils });
const TimeDictLoader = createTimeDictLoader({ config: Config, utils: Utils });
const TimePhrase = createTimePhrase({ dictLoader: TimeDictLoader });
const Store = createStore({ bus: bus, config: Config, utils: Utils });
const WakeLock = createWakeLock({ bus: bus });
const Voices = createVoices({ bus: bus, utils: Utils, allowedLangs: Config.TIME_LANGS });
const Speaker = createSpeaker({
  bus: bus,
  voicesProvider: () => Voices.getVoices(),
  settingsProvider: () => Store.getSettings(),
});
const UI = createUI({ bus: bus, store: Store, config: Config, langLoader: LangLoader, utils: Utils, timePhrase: TimePhrase });
createPlayback({ bus: bus, store: Store, ui: UI, speaker: Speaker, utils: Utils, wakeLock: WakeLock, timePhrase: TimePhrase });
const Developer = createDeveloper({ bus: bus, ui: UI });
const App = createApp({
  bus: bus,
  config: Config,
  langLoader: LangLoader,
  timeDictLoader: TimeDictLoader,
  store: Store,
  ui: UI,
  voices: Voices,
  wakeLock: WakeLock,
  utils: Utils,
  developer: Developer,
});

App.init();
initSnap();
