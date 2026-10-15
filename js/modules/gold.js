// js/modules/gold.js - Calculadora de Oro - MisMonedas v4.2.0
// Restaura el flujo completo del original en 3 pasos: cantidad (g/oz), pureza
// (24k-10k) y operación (vender/comprar con margen), más desglose y educación.
// v4.2.0: se eliminó la variación "+1.2%" escrita a mano; ahora es real
// (frente al día anterior registrado) o no se muestra.
import { CONFIG } from "../config.js";
import { Utils } from "./utils.js";
import { History } from "./history.js";

const TROY_OUNCE_IN_GRAMS = 31.1035;
const MARGIN_PCT = 15; // Margen de la casa de compra / joyería (igual que v3.0.0)
const FALLBACK_PRICE = 2350;

export class GoldCalculator {
  constructor() {
    this.price = FALLBACK_PRICE;
    this.isLive = false;

    this.el = {
      price: document.getElementById("gold-price"),
      variation: document.getElementById("gold-variation"),
      time: document.getElementById("gold-time"),
      amount: document.getElementById("gold-grams"),
      unit: document.getElementById("gold-unit"),
      hint: document.getElementById("purity-hint"),
      narrative: document.getElementById("gold-narrative"),
      total: document.querySelector("#gold-result .result-value"),
      breakdown: document.getElementById("gold-breakdown"),
      base: document.getElementById("break-base"),
      pct: document.getElementById("break-purity-pct"),
      adjusted: document.getElementById("break-adjusted"),
      marginLabel: document.getElementById("break-margin-label"),
      final: document.getElementById("break-final"),
    };
    this.init();
  }

  /** Cálculo puro (testeable): misma matemática del original */
  static compute({ price, amount, unit, karat, operation }) {
    const purityFactor = karat / 24;
    const base = price / TROY_OUNCE_IN_GRAMS;
    const adjusted = base * purityFactor;
    const multiplier = operation === "compra" ? 1 + MARGIN_PCT / 100 : 1 - MARGIN_PCT / 100;
    const final = adjusted * multiplier;
    const grams = unit === "oz" ? amount * TROY_OUNCE_IN_GRAMS : amount;
    return { base, adjusted, final, grams, total: final * grams, purityPct: Math.round(purityFactor * 100), margin: MARGIN_PCT };
  }

  async init() {
    if (!this.el.amount || !this.el.unit) {
      console.warn("GoldCalculator: elementos HTML no encontrados.");
      return;
    }
    const screen = document.getElementById("screen-oro");
    screen?.addEventListener("input", (e) => e.target.matches("#gold-grams") && this.calculate());
    screen?.addEventListener("change", (e) => {
      if (e.target.matches("#gold-unit, input[name='gold-purity'], input[name='gold-operation']")) this.calculate();
    });

    this.calculate();
    await this.refresh();
  }

  async refresh() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(CONFIG.APIs.GOLD, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const price = Number(data.price);
      if (!(price > 0)) throw new Error("Precio inválido");

      this.price = price;
      this.isLive = true;
      History.record("oro", price);
      this.renderPrice();
      await this.renderVariation();
    } catch (error) {
      console.warn("⚠️ No se pudo obtener el precio del oro. Usando valor de referencia.", error.message);
      this.isLive = false;
      this.renderPrice();
    } finally {
      clearTimeout(timer);
    }
    this.calculate();
  }

  renderPrice() {
    if (this.el.price) this.el.price.textContent = Utils.formatCurrency(this.price, "USD") + (this.isLive ? "" : " (ref.)");
    if (!this.el.time) return;
    this.el.time.textContent = this.isLive
      ? `Actualizado: ${new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`
      : "Sin conexión con la bolsa: el cálculo usa un valor de referencia que puede estar desactualizado.";
    this.el.time.classList.toggle("warn", !this.isLive);
  }

  async renderVariation() {
    const el = this.el.variation;
    if (!el) return;
    const v = await History.variation("oro", this.price);
    if (!v || Math.abs(v.percentage) < 0.005) {
      el.className = "gold-variation";
      el.textContent = "";
      return;
    }
    const up = v.percentage > 0;
    el.className = `gold-variation ${up ? "up" : "down"}`;
    el.innerHTML = `<i class="fa-solid ${up ? "fa-arrow-up" : "fa-arrow-down"}"></i> ${up ? "+" : "−"}${Math.abs(v.percentage).toFixed(2)}% vs. ${v.since.slice(8, 10)}/${v.since.slice(5, 7)}`;
  }

  calculate() {
    const amount = parseFloat(this.el.amount?.value) || 0;
    const unit = this.el.unit?.value || "g";
    const purityInput = document.querySelector("input[name='gold-purity']:checked");
    const karat = purityInput ? parseInt(purityInput.value, 10) : 18;
    const operation = document.querySelector("input[name='gold-operation']:checked")?.value || "venta";

    const purityDesc =
      purityInput?.closest(".choice")?.querySelector("small")?.textContent.split("·").pop().trim().toLowerCase() || "joyería";
    const pctRaw = Math.round((karat / 24) * 100);
    if (this.el.hint) {
      this.el.hint.textContent = `El ${pctRaw}% del peso es oro puro y el ${100 - pctRaw}% restante son otros metales. Uso típico: ${purityDesc}.`;
    }

    if (amount <= 0) {
      if (this.el.breakdown) this.el.breakdown.hidden = true;
      if (this.el.total) this.el.total.textContent = "$0.00";
      if (this.el.narrative) this.el.narrative.textContent = "Ingresa una cantidad mayor a cero para estimar el valor.";
      return;
    }

    const r = GoldCalculator.compute({ price: this.price, amount, unit, karat, operation });
    const usd = (v) => Utils.formatCurrency(v, "USD");

    if (this.el.breakdown) this.el.breakdown.hidden = false;
    if (this.el.base) this.el.base.textContent = usd(r.base);
    if (this.el.pct) this.el.pct.textContent = `${r.purityPct}%`;
    if (this.el.adjusted) this.el.adjusted.textContent = usd(r.adjusted);
    if (this.el.marginLabel) {
      this.el.marginLabel.textContent =
        operation === "venta"
          ? `Precio por gramo tras margen de la casa de compra (−${r.margin}%):`
          : `Precio por gramo con margen de la joyería (+${r.margin}%):`;
    }
    if (this.el.final) this.el.final.textContent = usd(r.final);
    if (this.el.total) this.el.total.textContent = usd(r.total);
    if (this.el.narrative) {
      const unitText = unit === "oz" ? "onzas troy" : "gramos";
      this.el.narrative.textContent = `Valor estimado por ${operation === "venta" ? "VENDER" : "COMPRAR"} ${amount} ${unitText} de oro ${karat}k:`;
    }
  }
}
