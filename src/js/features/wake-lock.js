// Keeps the screen on while the phrases are played (Wake Lock API)
import { EventTypes } from "../core/event-types.js";
import { Utils } from "../core/utils.js";

export function createWakeLock({ bus } = {}) {
  let wakeLock = null;

  async function request() {
    Utils.log("wakeLock.request called");
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock?.addEventListener?.("release", () => {});
      }
      return !!wakeLock;
    } catch (e) {
      console.warn("WakeLock request failed", e);
      wakeLock = null;
      return false;
    }
  }

  async function release() {
    Utils.log("wakeLock.release called");
    try {
      if (wakeLock) {
        await (wakeLock.release?.() || Promise.resolve());
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }

  function init() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        bus.emit(EventTypes.APP_STATE, "resume-visibility");
      } else {
        release();
      }
    });
    bus.on(EventTypes.APP_STATE, (s) => {
      if (s === "playing") request();
      else release();
    });
  }
  bus.on(EventTypes.APP_CLOSED, () => {
    release();
  });

  return { request, release, init };
}
