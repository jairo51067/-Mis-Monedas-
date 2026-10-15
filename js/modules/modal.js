// js/modules/modal.js - Diálogos y hojas inferiores M3 - MisMonedas v4.2.0
export class Modal {
  static _lastFocus = new Map();
  static _ready = false;

  static init() {
    if (this._ready) return;
    this._ready = true;

    document.addEventListener("click", (e) => {
      const closer = e.target.closest("[data-close]");
      const modal = closer?.closest(".modal");
      if (modal) Modal.close(modal.id);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll(".modal.open").forEach((m) => Modal.close(m.id));
    });
  }

  static open(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    this._lastFocus.set(id, document.activeElement);
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add("open");
      document.body.classList.add("no-scroll");
      modal.querySelector(".modal-panel")?.focus({ preventScroll: true });
    });
  }

  static close(id) {
    const modal = document.getElementById(id);
    if (!modal || !modal.classList.contains("open")) return;
    modal.classList.remove("open");
    setTimeout(() => {
      if (!modal.classList.contains("open")) modal.hidden = true;
    }, 250);
    if (!document.querySelector(".modal.open:not(#" + id + ")")) {
      document.body.classList.remove("no-scroll");
    }
    const last = this._lastFocus.get(id);
    if (last && typeof last.focus === "function") last.focus({ preventScroll: true });
  }
}
