// Manejo de interfaz de usuario para MisMonedas v4.2.0
import { Utils } from "./utils.js";

export class UI {
  /**
   * Muestra estado de carga
   */
  static showLoading(elementId, message = "Cargando...") {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `<div class="loading-state">${message}</div>`;
    }
  }

  /**
   * Actualiza la tasa principal en la Hero Card (legado, sin uso en M3)
   */
  static updateHeroRate(elementId, value, variationPercent) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const isUp = variationPercent > 0;
    const isDown = variationPercent < 0;
    const variationClass = isUp ? "up" : isDown ? "down" : "stable";
    const icon = isUp ? "fa-arrow-up" : isDown ? "fa-arrow-down" : "fa-minus";
    const sign = isUp ? "+" : "";

    element.innerHTML = `
            <div class="rate-label">USD/VES (BCV)</div>
            <div class="rate-value">${value.toFixed(2)} Bs</div>
            <div class="rate-variation ${variationClass}">
                <i class="fa-solid ${icon}"></i>
                <span>${sign}${variationPercent.toFixed(2)}% hoy</span>
            </div>
        `;
  }

  /**
   * v4.2.0: Pinta una insignia de variación.
   * pct = porcentaje CON SIGNO; null/undefined = aún no hay día anterior registrado.
   * Convención LATAM: sube = rojo suave, baja = verde suave.
   */
  static renderVariation(el, pct) {
    if (!el) return;
    if (pct === null || pct === undefined || Number.isNaN(pct)) {
      el.className = "stat-variation stable";
      el.textContent = "Sin referencia";
      return;
    }
    if (Math.abs(pct) < 0.005) {
      el.className = "stat-variation stable";
      el.innerHTML = '<i class="fa-solid fa-minus"></i> Sin cambios';
      return;
    }
    const isUp = pct > 0;
    el.className = `stat-variation ${isUp ? "up" : "down"}`;
    el.innerHTML = `<i class="fa-solid ${isUp ? "fa-arrow-up" : "fa-arrow-down"}"></i> ${isUp ? "+" : "−"}${Math.abs(pct).toFixed(2)}%`;
  }

  /**
   * Actualiza una Stat Card del Dashboard
   */
  static updateStatCard(valueElementId, variationElementId, value, variationPercent) {
    const valueEl = document.getElementById(valueElementId);
    const variationEl = document.getElementById(variationElementId);

    if (valueEl) valueEl.textContent = value > 0 ? value.toFixed(2) : "N/D";
    this.renderVariation(variationEl, value > 0 ? variationPercent : null);
  }

  /**
   * Actualiza resultado del conversor rápido (formato crudo para input number)
   */
  static updateQuickConverterResult(elementId, result) {
    const element = document.getElementById(elementId);
    if (element) element.value = result.toFixed(2);
  }

  /**
   * Muestra error en elemento
   */
  static showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `<span class="text-danger" style="color: var(--variation-up-fg); font-size: 0.85rem;">Error: ${message}</span>`;
    }
  }

  /**
   * v4.2.0: Toast M3 (snackbar). Estilos en styles.css (.toast-notification).
   * Antes usaba variables CSS inexistentes (--danger/--success) y quedaba transparente.
   */
  static showToast(message, type = "info") {
    document.querySelector(".toast-notification")?.remove();

    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  /**
   * Toggle visibility de elemento
   */
  static toggleVisibility(elementId, show = true) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = show ? "block" : "none";
  }
}
