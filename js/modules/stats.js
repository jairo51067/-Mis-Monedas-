// Estadísticas y Tendencias - MisMonedas v4.2.0
// v4.2.0: datos REALES (DolarAPI histórico + registro diario local). Se eliminó
// el historial simulado con semilla pseudoaleatoria.
import { History } from "./history.js";
import { Utils } from "./utils.js";

const META = {
  bcv: { label: "BCV", unit: "VES", locale: "es-VE", light: "#0b57d0", dark: "#a8c7fa" },
  euro: { label: "Euro BCV", unit: "VES", locale: "es-VE", light: "#6750a4", dark: "#d0bcff" },
  paralelo: { label: "Paralelo", unit: "VES", locale: "es-VE", light: "#b26a00", dark: "#ffb74d" },
  trm: { label: "TRM", unit: "COP", locale: "es-CO", light: "#2e7d32", dark: "#81c784" },
};
const RANGE_LABEL = { 7: "7 días", 30: "30 días", 365: "1 año" };

export class Stats {
  constructor() {
    this.chart = null;
    this.currency = "bcv";
    this.days = 7;
    this.ready = false;
    this.token = 0;
    this.last = null;
  }

  init() {
    if (this.ready) return;
    this.ready = true;

    document.querySelectorAll(".stats-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.setActive(".stats-tab", tab);
        this.currency = tab.dataset.currency;
        this.load();
      });
    });

    document.querySelectorAll(".btn-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.setActive(".btn-tab", tab);
        this.days = parseInt(tab.dataset.days, 10) || 7;
        this.load();
      });
    });

    // Redibuja el gráfico al cambiar de tema
    new MutationObserver(() => this.last && this.render(this.last)).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ["data-theme"] },
    );
  }

  setActive(selector, active) {
    document.querySelectorAll(selector).forEach((el) => {
      const on = el === active;
      el.classList.toggle("active", on);
      el.setAttribute("aria-pressed", on);
    });
  }

  async load() {
    const token = ++this.token;
    const result = await History.getSeries(this.currency, this.days);
    if (token !== this.token) return; // llegó una petición más reciente
    this.last = result;
    this.render(result);
  }

  setText(id, text, className) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (className !== undefined) el.className = className;
  }

  render({ points, source }) {
    const meta = META[this.currency];
    const fmt = (v) => Utils.formatNumber(v, meta.locale, { minimumFractionDigits: 2 });
    const empty = document.getElementById("trend-empty");
    const wrap = document.querySelector("#screen-tendencias .chart-container");
    const canvas = document.getElementById("ratesChart");

    this.setText("stat-variation-label", `Variación (${RANGE_LABEL[this.days] || this.days + " días"})`);
    this.setText(
      "stat-source",
      source === "api"
        ? "Fuente: histórico diario de DolarAPI (último valor de cada día) y tu registro local."
        : "Fuente: registro diario guardado en tu dispositivo (este indicador no tiene histórico público).",
    );

    this.setText("stat-current-value", points.length ? `${fmt(points[points.length - 1].value)} ${meta.unit}` : "--");

    if (points.length < 2 || !canvas || typeof Chart === "undefined") {
      this.chart?.destroy();
      this.chart = null;
      if (wrap) wrap.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent =
          typeof Chart === "undefined"
            ? "No se pudo cargar la librería de gráficos. Revisa tu conexión."
            : `Aún no hay suficiente historial para ${meta.label}. MisMonedas guarda la tasa de cada día que abres la app (${points.length} día${points.length === 1 ? "" : "s"} registrado${points.length === 1 ? "" : "s"}).`;
      }
      this.setText("stat-variation", "--", "summary-value");
      return;
    }

    if (wrap) wrap.hidden = false;
    if (empty) empty.hidden = true;

    const first = points[0].value;
    const lastValue = points[points.length - 1].value;
    const pct = ((lastValue - first) / first) * 100;
    const dir = Math.abs(pct) < 0.005 ? "stable" : pct > 0 ? "up" : "down";
    const el = document.getElementById("stat-variation");
    if (el) {
      el.className = `summary-value ${dir}`;
      el.innerHTML =
        dir === "stable"
          ? '<i class="fa-solid fa-minus"></i> 0.00%'
          : `<i class="fa-solid ${dir === "up" ? "fa-arrow-trend-up" : "fa-arrow-trend-down"}"></i> ${dir === "up" ? "+" : "−"}${Math.abs(pct).toFixed(2)}%`;
    }

    this.draw(points, meta, canvas);
  }

  draw(points, meta, canvas) {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const color = isDark ? meta.dark : meta.light;
    const text = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
    const grid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const values = points.map((p) => p.value);
    const span = Math.max(...values) - Math.min(...values);
    const digits = span < 5 ? 2 : span < 50 ? 1 : 0;

    const toDate = (d) => new Date(`${d}T00:00:00`);
    const labels = points.map((p) =>
      this.days > 90
        ? toDate(p.date).toLocaleDateString("es", { month: "short", year: "2-digit" })
        : p.date.slice(8, 10) + "/" + p.date.slice(5, 7),
    );

    this.chart?.destroy();
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, color + "40");
    gradient.addColorStop(1, color + "00");

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: color,
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: points.length <= 31 ? 2 : 0,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            padding: 12,
            callbacks: {
              title: (items) => {
                const d = points[items[0].dataIndex].date;
                return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
              },
              label: (item) =>
                `${Utils.formatNumber(item.parsed.y, meta.locale, { minimumFractionDigits: 2 })} ${meta.unit}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: text, maxTicksLimit: 6, font: { size: 11 } } },
          y: {
            grid: { color: grid },
            ticks: {
              color: text,
              font: { size: 11 },
              callback: (v) =>
                Utils.formatNumber(v, meta.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
            },
          },
        },
      },
    });
  }
}
