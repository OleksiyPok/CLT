// Settings window: the same settings as on the main page (copies, see ui-mirrors.js).
export function createModals({ elements, mirrors }) {
  const isSettingsModalOpen = () => !elements.settingsAppModal?.classList.contains("hidden");

  function openSettingsModal() {
    mirrors.sync();
    elements.settingsAppModal?.classList.remove("hidden");
  }

  const closeSettingsModal = () => elements.settingsAppModal?.classList.add("hidden");

  return { isSettingsModalOpen, openSettingsModal, closeSettingsModal };
}
