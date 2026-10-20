import { useState } from "react";

export function useConfirmation() {
  const [dialog, setDialog] = useState(null);

  function ask({ title, message, confirmLabel = "Continue", cancelLabel = "Cancel" }) {
    return new Promise((resolve) => setDialog({ title, message, confirmLabel, cancelLabel, resolve }));
  }

  function confirm(message, title = "Confirm action") {
    return ask({ title, message, confirmLabel: "Delete", cancelLabel: "Cancel" });
  }

  function notify(message, title = "Check your details") {
    return ask({ title, message, confirmLabel: "OK", cancelLabel: null });
  }

  function close(accepted) {
    const current = dialog;
    setDialog(null);
    current?.resolve(accepted);
  }

  const element = dialog ? (
    <div className="dialog-backdrop">
      <section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
        <h2 id="dialog-title">{dialog.title}</h2>
        <p id="dialog-message">{dialog.message}</p>
        <div className="dialog-actions">
          {dialog.cancelLabel && <button className="secondary-button" onClick={() => close(false)}>{dialog.cancelLabel}</button>}
          <button className="primary-button" autoFocus onClick={() => close(true)}>{dialog.confirmLabel}</button>
        </div>
      </section>
    </div>
  ) : null;

  return { confirm, notify, dialog: element };
}
