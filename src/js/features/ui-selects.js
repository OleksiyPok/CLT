// The selects: values from the settings, the languages and the voices of the device.

export function createUiSelects(ctx) {
  const { store, utils, elements, view } = ctx;

  // Sets the value of a select if it is in the list (otherwise blank, or the fallback)
  function setSelectValue(sel, cand, fallback, preferBlank) {
    if (!sel) return;
    const hasOpt = (val) => Array.from(sel.options).some((o) => String(o.value) === String(val));
    if (cand !== undefined && hasOpt(cand)) sel.value = String(cand);
    else if (preferBlank) sel.value = "";
    else if (fallback !== undefined && hasOpt(fallback)) sel.value = String(fallback);
  }

  // The selects of the settings: interface language, speed, interval, rows ("raw" = the saved values before the merge with the defaults)
  function setSelectsFromSettings(s, { preferBlankForInvalid = true, raw = {} } = {}) {
    setSelectValue(elements.uiLangSelect, raw.uiLang ?? s.uiLang, s.uiLang, preferBlankForInvalid);
    setSelectValue(elements.speedSelect, raw.speed ?? s.speed, s.speed, preferBlankForInvalid);
    setSelectValue(elements.intervalSelect, raw.intervalMs ?? raw.delay ?? s.intervalMs, s.intervalMs, preferBlankForInvalid);
    setSelectValue(elements.rowsSelect, raw.rows ?? s.rows, s.rows, preferBlankForInvalid);
  }

  function populateLanguageSelect(list = view.availableLanguages) {
    if (!elements.languageCodeSelect) return;
    const s = store.getSettings();
    const base = utils.getBaseLang(s.languageCode || "");
    const preferred = base ? base.toUpperCase() : "";
    elements.languageCodeSelect.innerHTML = "";
    (list || []).forEach((lc) => {
      const opt = document.createElement("option");
      opt.value = lc;
      opt.textContent = lc;
      elements.languageCodeSelect.appendChild(opt);
    });
    const toSet = (list || []).includes(preferred) ? preferred : (list || [])[0] || "";
    if (toSet) elements.languageCodeSelect.value = toSet;
  }

  // The voices of the language (or all voices); "persist" saves the shown voice as the chosen one
  function populateVoiceSelect(langCodeOrAll = elements.languageCodeSelect?.value || "", { persist = true } = {}) {
    if (!elements.voiceSelect) return;
    const list = view.voices;
    const s = store.getSettings();
    let filtered = [];
    if (langCodeOrAll === "ALL") {
      filtered = list || [];
    } else {
      const base = (utils.getBaseLang(langCodeOrAll) || "").toUpperCase();
      filtered = (list || []).filter((v) => (utils.getBaseLang(v.lang) || "").toUpperCase() === base);
    }
    elements.voiceSelect.innerHTML = "";
    filtered.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      elements.voiceSelect.appendChild(opt);
    });
    const target = filtered.find((v) => v.name === s.voiceName) || filtered.find((v) => utils.normalizeLangCode(v.lang) === utils.normalizeLangCode(s.languageCode)) || filtered[0];
    if (target) {
      elements.voiceSelect.value = target.name;
      if (!persist) return;
      s.voiceName = target.name;
      s.languageCode = utils.normalizeLangCode(target.lang);
      store.setSettings(s);
      store.saveSettings(s, elements);
    }
  }

  function renderLangVoiceUI() {
    if (!view.voices.length || !view.availableLanguages.length) return;
    populateLanguageSelect();
    // The voices come in parts: a saved voice is not replaced by another one while it is missing from the list
    populateVoiceSelect(elements.languageCodeSelect?.value || "", { persist: !store.getSettings().voiceName });
  }

  return { setSelectsFromSettings, populateLanguageSelect, populateVoiceSelect, renderLangVoiceUI };
}
