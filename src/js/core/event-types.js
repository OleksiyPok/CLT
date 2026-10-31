// Names of the events of the event bus
export const EventTypes = Object.freeze({
  APP_INIT: "app:init",
  APP_STATE: "app:state",
  APP_STATE_SET: "app:state:set",
  APP_CLOSED: "app:closed",

  CONFIG_LOADED: "app:config:loaded",

  SETTINGS_LOAD: "settings:load",
  SETTINGS_SAVE: "settings:save",
  SETTINGS_APPLY: "settings:apply",
  SETTINGS_RESET: "settings:resetToDefaults",

  UI_TEXTS_UPDATE: "ui:texts:update",
  UI_TRANSLATE: "ui:translate",
  UI_SPEAK_SINGLE: "ui:speak:single",
  UI_SPEAK_GROUP: "ui:speak:group",

  SPEECH_START: "speech:start",
  SPEECH_END: "speech:end",

  VOICES_CHANGED: "voices:changed",
  VOICES_LOADED: "voices:loaded",

  PLAYBACK_START: "playback:start",
  PLAYBACK_PAUSE: "playback:pause",
  PLAYBACK_CONTINUE: "playback:continue",
  PLAYBACK_STOP: "playback:stop",
  PLAYBACK_FINISH: "playback:finish",

  SETTINGS_APPLY_TO_UI: "settings:applyToUI",
  SETTINGS_RESET_TO_DEFAULTS: "settings:resetToDefaults",

  UPDATE_CONTROLS: "ui:updateControls",
});
