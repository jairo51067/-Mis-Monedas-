// js/modules/greeting.js - Bienvenida e Insight - MisMonedas v4.2.0
// v4.2.0: ya no vuelve a consultar las APIs (usa los datos que carga App),
// se muestra 1 vez al día como diálogo M3 y alimenta el Insight/Tip de la Home.
import { History } from "./history.js";
import { Modal } from "./modal.js";
import { UI } from "./ui.js";
import { Utils } from "./utils.js";

export class Greeting {
  constructor() {
    this.modalId = "welcomeDialog";
    this.storageKey = "mismonedas_greeting_date";
    this.tips = [
      "Revisa Tendencias para ver la evolución de 7 días, 30 días y 1 año.",
      "El conversor Bs ↔ COP usa el factor TRM/Paralelo para cálculos rápidos.",
      "Activa el modo oscuro desde la barra superior para usar la app de noche.",
      "Toca ↻ junto a una tasa para actualizar solo esa tasa.",
      "Agrega la app a tu pantalla de inicio para abrirla como una app nativa.",
      "La brecha cambiaria es la diferencia porcentual entre el paralelo y el BCV.",
      "El Determinador te muestra a qué dólar te están cambiando en una operación COP/VES.",
      "El historial guarda tus últimas 50 conversiones en este dispositivo.",
    ];
  }

  hasShownToday() {
    try {
      return localStorage.getItem(this.storageKey) === History.dateKey();
    } catch {
      return false;
    }
  }

  /** Muestra el diálogo de bienvenida una sola vez por día */
  show(snapshot) {
    if (this.hasShownToday() || !document.getElementById(this.modalId)) return;
    this.fill(snapshot);
    Modal.open(this.modalId);
    try {
      localStorage.setItem(this.storageKey, History.dateKey());
    } catch {
      /* almacenamiento no disponible */
    }
  }

  fill({ rates, variations, lastUpdate }) {
    const hour = new Date().getHours();
    const greeting = hour >= 5 && hour < 12 ? "☀️ ¡Buenos días!" : hour >= 12 && hour < 19 ? "🌤️ ¡Buenas tardes!" : "🌙 ¡Buenas noches!";
    this.setText("welcome-greeting", greeting);

    const rows = [
      ["bcv", "welcome-bcv", "Bs.", "es-VE"],
      ["paralelo", "welcome-paralelo", "Bs.", "es-VE"],
      ["euro", "welcome-euro", "Bs.", "es-VE"],
      ["trm", "welcome-trm", "COP", "es-CO"],
    ];
    rows.forEach(([key, id, prefix, locale]) => {
      const value = rates[key];
      this.setText(id, value > 0 ? `${prefix} ${Utils.formatNumber(value, locale, { minimumFractionDigits: 2 })}` : "--");
      UI.renderVariation(document.getElementById(`${id}-var`), value > 0 ? (variations[key]?.percentage ?? null) : null);
    });

    this.renderHome(rates, "welcome");
    this.setText("welcome-last-update", `Actualizado: ${this.timeAgo(lastUpdate)}`);
  }

  /** Insight (brecha cambiaria) + tip del día. Prefijo: "home" o "welcome". */
  renderHome(rates, prefix = "home") {
    const insight = this.getInsight(rates.bcv, rates.paralelo);
    const box = document.getElementById(`${prefix}-insight`);
    if (box) box.className = `insight-card ${insight.tone}`;
    const icon = document.getElementById(`${prefix}-insight-icon`);
    if (icon) icon.className = `fa-solid ${insight.icon}`;
    this.setText(`${prefix}-insight-text`, insight.text);

    const start = new Date(new Date().getFullYear(), 0, 0);
    const dayOfYear = Math.floor((new Date() - start) / 86400000);
    this.setText(`${prefix}-tip-text`, this.tips[dayOfYear % this.tips.length]);
  }

  getInsight(bcv, paralelo) {
    if (!(bcv > 0) || !(paralelo > 0)) {
      return { tone: "neutral", icon: "fa-scale-balanced", text: "Brecha cambiaria no disponible: faltan datos del BCV o del paralelo." };
    }
    const gap = ((paralelo - bcv) / bcv) * 100;
    if (Math.abs(gap) < 5) {
      return { tone: "neutral", icon: "fa-scale-balanced", text: `La brecha cambiaria es mínima (${gap.toFixed(1)}%). Tasas muy cercanas.` };
    }
    if (gap >= 0) {
      return { tone: "warning", icon: "fa-arrow-trend-up", text: `El paralelo está ${gap.toFixed(1)}% por encima del BCV. Brecha significativa.` };
    }
    return { tone: "alert", icon: "fa-triangle-exclamation", text: `El paralelo está ${Math.abs(gap).toFixed(1)}% por debajo del BCV. Situación inusual.` };
  }

  timeAgo(ts) {
    if (!ts) return "ahora";
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "hace menos de 1 minuto";
    if (mins < 60) return `hace ${mins} minuto${mins > 1 ? "s" : ""}`;
    const h = Math.floor(mins / 60);
    return `hace ${h} hora${h > 1 ? "s" : ""}`;
  }

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}
