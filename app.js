// Punto de entrada principal - MisMonedas v4.2.0
import { CONFIG } from "./js/config.js";
import { API } from "./js/modules/api.js";
import { Converter } from "./js/modules/converter.js";
import { UI } from "./js/modules/ui.js";
import { Storage } from "./js/modules/storage.js";
import { Utils } from "./js/modules/utils.js";
import { Clock } from "./js/modules/clock.js";
import { Weather } from "./js/modules/weather.js";
import { Greeting } from "./js/modules/greeting.js";
import { Theme } from "./js/modules/theme.js";
import { Stats } from "./js/modules/stats.js";
import { GoldCalculator } from "./js/modules/gold.js";
import { News } from "./js/modules/news.js";
import { History } from "./js/modules/history.js";
import { Modal } from "./js/modules/modal.js";

const RATE_KEYS = ["bcv", "euro", "paralelo", "trm"];
const RATE_DOM = {
  bcv: { value: "bcv-value", variation: "bcv-variation-container", label: "BCV" },
  euro: { value: "euro-value", variation: "euro-variation-container", label: "Euro" },
  paralelo: { value: "paralelo-value", variation: "paralelo-variation-container", label: "Paralelo" },
  trm: { value: "trm-value", variation: "trm-variation-container", label: "TRM" },
};
const FIVE_MINUTES = 5 * 60 * 1000;

/** Extrae la tasa de una respuesta de DolarAPI aceptando varias estructuras */
const pickRate = (d) => {
  if (!d) return 0;
  const n = d.promedio || d.venta || d.compra || d.precio || d.tasa || d.value || d.rate;
  if (n) return Number(n) || 0;
  return d.data ? pickRate(d.data) : 0;
};

const $ = (id) => document.getElementById(id);

class App {
  constructor() {
    this.rates = { bcv: 0, euro: 0, paralelo: 0, trm: 0 };
    this.variations = { bcv: null, euro: null, paralelo: null, trm: null };
    this.factors = { factor1: 0, factor2: 0, factor3: 0 };
    this.lastUpdate = null;
    this.loading = false;
    this.convTab = "oficial";

    this.clock = new Clock();
    this.weather = new Weather();
    this.greeting = new Greeting();
    this.theme = new Theme();
    this.stats = new Stats();
    this.news = new News();
    this.goldCalc = null;

    this.loaders = {
      bcv: async () => pickRate(await API.getDolarOficial()),
      euro: async () => pickRate(await API.getEuroOficial()),
      paralelo: async () => pickRate(await API.getDolarParalelo()),
      trm: async () => Number((await API.getTRMColombia()).trm) || 0,
    };
  }

  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================
  async init() {
    try {
      Modal.init();
      this.theme.apply();
      this.theme.setupListeners();
      this.updateThemeLabel();

      // La interfaz queda operativa ANTES de que lleguen los datos
      this.setupNavigation();
      this.setupEventListeners();
      this.loadCurrencies();
      this.loadConversionHistory();
      this.stats.init();
      this.registerServiceWorker();

      this.clock.start();
      this.weather.init();
      this.news.init();
      this.goldCalc = new GoldCalculator();

      await this.loadAllData();

      this.greeting.show({ rates: this.rates, variations: this.variations, lastUpdate: this.lastUpdate });
      window.switchToScreen = this.switchScreen.bind(this);
      console.log(`✅ MisMonedas v${CONFIG.VERSION} inicializada correctamente`);
    } catch (error) {
      console.error("❌ Error al inicializar:", error);
      UI.showToast("Error al cargar algunos datos", "error");
    }
  }

  // ==========================================================
  // DATOS
  // ==========================================================
  computeFactors() {
    const { trm, paralelo, bcv, euro } = this.rates;
    this.factors = {
      factor1: trm > 0 && paralelo > 0 ? trm / paralelo : 0,
      factor2: trm > 0 && bcv > 0 ? trm / bcv : 0,
      factor3: trm > 0 && euro > 0 ? trm / euro : 0,
    };
  }

  renderFactors() {
    const set = (id, value) => {
      const el = $(id);
      if (el) el.textContent = value > 0 ? value.toFixed(4) : "--";
    };
    set("factor-paralelo", this.factors.factor1);
    set("factor-oficial", this.factors.factor2);
    set("factor-euro", this.factors.factor3);
    const par = $("par-factor");
    if (par) par.textContent = this.factors.factor1 > 0 ? this.factors.factor1.toFixed(4) : "--";
  }

  renderRate(key) {
    const dom = RATE_DOM[key];
    const v = this.variations[key];
    UI.updateStatCard(dom.value, dom.variation, this.rates[key], v ? v.percentage : null);
    const el = $(dom.variation);
    if (el) {
      el.title = v
        ? `Frente al valor registrado el ${v.since.slice(8, 10)}/${v.since.slice(5, 7)}`
        : "Aún no hay un día anterior registrado para comparar";
    }
  }

  /** Registra el valor del día, recalcula factores y repinta */
  afterRatesChanged() {
    RATE_KEYS.forEach((k) => this.rates[k] > 0 && History.record(k, this.rates[k]));
    this.computeFactors();
    RATE_KEYS.forEach((k) => this.renderRate(k));
    this.renderFactors();
    this.greeting.renderHome(this.rates, "home");
    this.convertBsCop("bs");
  }

  async loadVariations(keys = RATE_KEYS) {
    await Promise.all(
      keys.map(async (k) => {
        this.variations[k] = this.rates[k] > 0 ? await History.variation(k, this.rates[k]).catch(() => null) : null;
        this.renderRate(k);
      }),
    );
  }

  async loadAllData() {
    if (this.loading) return false;
    this.loading = true;
    this.setRefreshing(true);
    try {
      const results = await Promise.allSettled(RATE_KEYS.map((k) => this.loaders[k]()));
      let ok = 0;
      results.forEach((r, i) => {
        const key = RATE_KEYS[i];
        if (r.status === "fulfilled" && r.value > 0) {
          this.rates[key] = r.value;
          ok++;
        } else {
          console.error(`❌ Error cargando ${key}:`, r.reason || "valor inválido");
        }
      });

      this.afterRatesChanged();
      if (ok > 0) {
        this.lastUpdate = Date.now();
        localStorage.setItem("last_rates_update", String(this.lastUpdate));
      }
      this.updateLastUpdateLabel(ok < RATE_KEYS.length);
      await this.loadVariations();
      return ok === RATE_KEYS.length;
    } finally {
      this.loading = false;
      this.setRefreshing(false);
    }
  }

  async refreshRate(key, btn) {
    btn.classList.add("loading");
    btn.disabled = true;
    try {
      const value = await this.loaders[key]();
      if (!(value > 0)) throw new Error("Valor inválido");
      this.rates[key] = value;
      this.lastUpdate = Date.now();
      localStorage.setItem("last_rates_update", String(this.lastUpdate));
      this.afterRatesChanged();
      this.updateLastUpdateLabel();
      await this.loadVariations([key]);
      UI.showToast(`${RATE_DOM[key].label} actualizado`, "success");
    } catch (error) {
      console.error(`❌ Error actualizando ${key}:`, error);
      UI.showToast(`No se pudo actualizar ${RATE_DOM[key].label}. Revisa tu conexión.`, "error");
    } finally {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  async refreshAll() {
    if (this.loading) return;
    UI.showToast("Actualizando tasas…", "info");
    const allOk = await this.loadAllData();
    await this.goldCalc?.refresh();
    if ($("screen-tendencias")?.classList.contains("active")) this.stats.load();
    UI.showToast(allOk ? "Tasas actualizadas" : "Algunas tasas no se pudieron actualizar", allOk ? "success" : "error");
  }

  setRefreshing(on) {
    $("refreshAllBtn")?.classList.toggle("spinning", on);
  }

  updateLastUpdateLabel(partial = false) {
    const el = $("last-update");
    if (!el) return;
    if (!this.lastUpdate) {
      el.textContent = "No se pudieron cargar las tasas. Revisa tu conexión y toca ↻.";
      return;
    }
    el.textContent = `Actualizado: ${this.greeting.timeAgo(this.lastUpdate)}${partial ? " · algunas tasas no cargaron" : ""}`;
  }

  // ==========================================================
  // NAVEGACIÓN
  // ==========================================================
  setupNavigation() {
    const drawer = $("drawer");
    const scrim = $("scrim");
    const menuBtn = $("menuBtn");

    this.openDrawer = () => {
      drawer.classList.add("active");
      scrim.classList.add("active");
      menuBtn.setAttribute("aria-expanded", "true");
      drawer.querySelector(".drawer-item")?.focus();
    };
    this.closeDrawer = () => {
      const wasOpen = drawer.classList.contains("active");
      drawer.classList.remove("active");
      scrim.classList.remove("active");
      menuBtn.setAttribute("aria-expanded", "false");
      if (wasOpen) menuBtn.focus({ preventScroll: true });
    };

    menuBtn.addEventListener("click", () => this.openDrawer());
    scrim.addEventListener("click", () => this.closeDrawer());
    document.addEventListener("keydown", (e) => e.key === "Escape" && this.closeDrawer());

    document.querySelectorAll("[data-screen]").forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchScreen(trigger.dataset.screen, { tab: trigger.dataset.convTab });
      });
    });

    // Compartir (pestaña inferior y menú)
    const share = () => this.shareApp();
    $("shareTab")?.addEventListener("click", share);
    $("menuShare")?.addEventListener("click", () => {
      this.closeDrawer();
      share();
    });

    // Acciones del menú
    const menuAction = (id, fn) =>
      $(id)?.addEventListener("click", () => {
        this.closeDrawer();
        fn();
      });
    menuAction("menuHistory", () => this.showHistory());
    menuAction("menuRefresh", () => this.refreshAll());
    menuAction("menuTheme", () => {
      this.theme.toggle();
      this.updateThemeLabel();
    });
    menuAction("menuClearCache", () => this.clearCache());
    menuAction("menuAbout", () => Modal.open("aboutDialog"));
  }

  switchScreen(id, { tab } = {}) {
    const target = $(`screen-${id}`);
    if (!target) return;

    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s === target));
    document.querySelectorAll(".bottom-tab[data-screen]").forEach((t) => {
      const on = t.dataset.screen === id;
      t.classList.toggle("active", on);
      if (on) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });

    if (id === "calculadora") this.setConvTab(tab || this.convTab);
    if (id === "tendencias") this.stats.load(); // el canvas necesita estar visible para medirse

    this.closeDrawer();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  setConvTab(name) {
    this.convTab = name;
    document.querySelectorAll(".seg-btn[data-conv-tab]").forEach((b) => {
      const on = b.dataset.convTab === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll(".conv-panel").forEach((p) => {
      p.hidden = p.id !== `conv-panel-${name}`;
    });
  }

  updateThemeLabel() {
    const label = $("menuThemeLabel");
    const icon = document.querySelector("#menuTheme i");
    const dark = this.theme.currentTheme === "dark";
    if (label) label.textContent = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
    if (icon) icon.className = dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  async shareApp() {
    const data = {
      title: "MisMonedas",
      text: "Tasas de cambio BCV, Paralelo, TRM y Euro en tiempo real.",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        UI.showToast("Enlace copiado al portapapeles", "success");
      }
    } catch (err) {
      if (err?.name !== "AbortError") UI.showToast("No se pudo compartir el enlace", "error");
    }
  }

  async clearCache() {
    Storage.clearCaches();
    UI.showToast("Caché limpiada. Recargando datos…", "info");
    $("refresh-news")?.click();
    await this.loadAllData();
    await this.goldCalc?.refresh();
    UI.showToast("Datos recargados", "success");
  }

  // ==========================================================
  // EVENTOS DE LAS PANTALLAS
  // ==========================================================
  setupEventListeners() {
    // Factores desplegables
    const toggle = $("factorsToggle");
    const body = $("factorsBody");
    toggle?.addEventListener("click", () => {
      const open = body.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open);
    });

    // Actualizar una tasa / todas
    document.querySelectorAll("[data-refresh]").forEach((btn) => {
      btn.addEventListener("click", () => this.refreshRate(btn.dataset.refresh, btn));
    });
    $("refreshAllBtn")?.addEventListener("click", () => this.refreshAll());

    // Pestañas del conversor (con flechas de teclado)
    const tabs = [...document.querySelectorAll(".seg-btn[data-conv-tab]")];
    tabs.forEach((btn, i) => {
      btn.addEventListener("click", () => this.setConvTab(btn.dataset.convTab));
      btn.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        this.setConvTab(next.dataset.convTab);
        next.focus();
      });
    });

    // Conversor oficial
    $("conv-calculate")?.addEventListener("click", () => this.handleQuickConversion());
    $("conv-amount")?.addEventListener("keydown", (e) => e.key === "Enter" && this.handleQuickConversion());
    $("conv-swap")?.addEventListener("click", () => {
      const from = $("conv-from");
      const to = $("conv-to");
      [from.value, to.value] = [to.value, from.value];
      const icon = $("conv-swap").querySelector("i");
      icon.style.transform = "rotate(180deg)";
      setTimeout(() => (icon.style.transform = "rotate(0deg)"), 300);
    });

    // Historial
    $("openHistoryBtn")?.addEventListener("click", () => this.showHistory());
    $("btn-clear-history")?.addEventListener("click", () => {
      if (!window.confirm("¿Borrar todo el historial de conversiones de este dispositivo?")) return;
      Storage.clearHistory();
      this.loadConversionHistory();
      this.renderFullHistory();
      UI.showToast("Historial limpiado", "success");
    });

    // Conversor Bs <-> COP (paralelo), en tiempo real
    const debounced = (fn) => Utils.debounce(fn, 150);
    $("input-bolivares")?.addEventListener("input", debounced(() => this.convertBsCop("bs")));
    $("input-pesos")?.addEventListener("input", debounced(() => this.convertBsCop("cop")));

    // Determinador
    $("det-calculate")?.addEventListener("click", () => this.handleDeterminador());

    // Reactualizar al volver a primer plano o recuperar conexión
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      const last = parseInt(localStorage.getItem("last_rates_update") || "0", 10);
      if (!last || Date.now() - last > FIVE_MINUTES) this.loadAllData();
      else this.updateLastUpdateLabel();
    });
    window.addEventListener("online", () => this.loadAllData());
    setInterval(() => this.updateLastUpdateLabel(), 60000);
  }

  // ==========================================================
  // CONVERSOR OFICIAL + HISTORIAL
  // ==========================================================
  loadCurrencies() {
    const fill = (id, selected) => {
      const sel = $(id);
      if (!sel) return;
      sel.innerHTML = CONFIG.CURRENCIES.map((c) => `<option value="${c.code}">${c.code} · ${c.name}</option>`).join("");
      sel.value = selected;
    };
    fill("conv-from", CONFIG.DEFAULT_CURRENCY.FROM);
    fill("conv-to", CONFIG.DEFAULT_CURRENCY.TO);
  }

  async handleQuickConversion() {
    const amount = parseFloat($("conv-amount")?.value);
    const from = $("conv-from")?.value;
    const to = $("conv-to")?.value;
    const btn = $("conv-calculate");

    if (!Utils.isValidNumber(amount) || amount <= 0) {
      UI.showToast("Ingresa un monto válido mayor a cero", "error");
      return;
    }

    btn.disabled = true;
    try {
      const result = await Converter.convert(amount, from, to);
      UI.updateQuickConverterResult("conv-result", result);
      Converter.saveToHistory(amount, from, result, to);
      this.loadConversionHistory();
    } catch (error) {
      UI.showToast("Error en la conversión. Verifica tu conexión.", "error");
    } finally {
      btn.disabled = false;
    }
  }

  historyItemHTML(item) {
    const when = new Date(item.timestamp).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    return `<li><span class="h-main">${Utils.formatNumber(item.amount)} ${item.from} → ${Utils.formatNumber(item.result)} ${item.to}</span><span class="h-time">${when}</span></li>`;
  }

  loadConversionHistory() {
    const list = $("history-list");
    if (!list) return;
    const items = Storage.getConversionHistory().slice(0, 5);
    list.innerHTML = items.length ? items.map((i) => this.historyItemHTML(i)).join("") : '<li class="empty">Aún no has hecho conversiones</li>';
  }

  renderFullHistory() {
    const list = $("history-full-list");
    if (!list) return;
    const items = Storage.getConversionHistory();
    list.innerHTML = items.length ? items.map((i) => this.historyItemHTML(i)).join("") : '<li class="empty">Aún no has hecho conversiones</li>';
    const clear = $("btn-clear-history");
    if (clear) clear.hidden = !items.length;
  }

  showHistory() {
    this.renderFullHistory();
    Modal.open("historySheet");
  }

  // ==========================================================
  // CONVERSOR Bs <-> COP (factor TRM/Paralelo)
  // ==========================================================
  convertBsCop(source) {
    const bsInput = $("input-bolivares");
    const copInput = $("input-pesos");
    const factor = this.factors.factor1;
    if (!bsInput || !copInput) return;

    if (source === "bs") {
      const v = parseFloat(bsInput.value);
      const out = factor > 0 && v >= 0 ? Converter.convertBsToCop(v, factor) : 0;
      $("resultado-cop").textContent = Utils.formatCurrency(out, "COP");
    } else {
      const v = parseFloat(copInput.value);
      const out = factor > 0 && v >= 0 ? Converter.convertCopToBs(v, factor) : 0;
      $("resultado-bs").textContent = Utils.formatCurrency(out, "VES", "es-VE");
    }
    if (source === "bs" && copInput.value) this.convertBsCop("cop");
  }

  // ==========================================================
  // DETERMINADOR DE TASA REAL
  // ==========================================================
  handleDeterminador() {
    const pesos = parseFloat($("det-cop")?.value);
    const factor = parseFloat($("det-factor")?.value);

    if (!(pesos > 0) || !(factor > 0)) {
      UI.showToast("Ingresa un monto y un factor válidos (mayores a 0)", "error");
      return;
    }
    const { trm, bcv, paralelo } = this.rates;
    if (!trm || !bcv || !paralelo) {
      UI.showToast("Esperando a que carguen las tasas del mercado…", "info");
      return;
    }

    const r = Converter.calculateImplicitDollarRate(pesos, factor, trm, bcv, paralelo);
    if (!r) return;

    $("res-bolivares").textContent = Utils.formatCurrency(r.bolivaresRecibidos, "VES", "es-VE");
    $("res-implicit-rate").textContent = `${Utils.formatNumber(r.tasaImplicitaUsdVes, "es-VE")} VES/USD`;
    this.renderComparison("bcv", r.comparacionBcv);
    this.renderComparison("paralelo", r.comparacionParalelo);
    $("det-results").hidden = false;
    $("det-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  renderComparison(type, comp) {
    const valueEl = $(`comp-${type}-value`);
    const badgeEl = $(`comp-${type}-badge`);
    const sign = comp.direction === "up" ? "+" : comp.direction === "down" ? "−" : "";
    valueEl.textContent = `${sign}${Utils.formatNumber(comp.diff, "es-VE")} VES`;
    const label = comp.direction === "up" ? "Más costoso" : comp.direction === "down" ? "Más barato" : "Precio similar";
    badgeEl.textContent = `${label} (${comp.pct.toFixed(2)}%)`;
    badgeEl.className = `comp-badge ${comp.direction}`;
  }

  // ==========================================================
  // SERVICE WORKER
  // ==========================================================
  registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    // v4.2.0: si "load" ya ocurrió, registrar de inmediato (antes el listener nunca se disparaba)
    const register = () =>
      navigator.serviceWorker
        .register("./sw.js")
        .then(() => console.log("✅ Service Worker registrado"))
        .catch((err) => console.error("❌ Error SW:", err));
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

// ==========================================================
// ARRANQUE
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  window.appInstance = new App();
  window.appInstance.init();
});
