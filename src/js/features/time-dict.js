// Loads the vocabularies of the time words (src/vocabs/<lang>.json)
export function createTimeDictLoader({ config, utils }) {
  const PATH = config.PATHS.TIME_DICTS_DIR;
  let dicts = {};

  async function loadDict(code) {
    // const baseCode = code.split(/[-_]/)[0];
    const baseCode = utils.getBaseLang(code).toLowerCase();
    try {
      const res = await fetch(`${PATH}/${baseCode}.json`, {
        cache: "no-cache",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch {
      return null;
    }
  }

  async function loadAll(allowed) {
    dicts = {};
    await Promise.all(
      allowed.map(async (code) => {
        const d = await loadDict(code);
        if (d) dicts[code.toLowerCase()] = d;
      })
    );
    return dicts;
  }

  function getDict(lang) {
    const key = String(lang || "").toLowerCase();
    return dicts[key] || dicts["en"];
  }

  return { loadDict, loadAll, getDict };
}
