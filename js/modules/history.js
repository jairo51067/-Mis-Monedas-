// js/modules/history.js - Histórico REAL de tasas - MisMonedas v4.2.0
// BCV y Paralelo: histórico diario de DolarAPI (+ registro local del día).
// Euro, TRM y Oro: no hay histórico remoto -> registro diario propio del dispositivo.
import { CONFIG } from "../config.js";
import { API } from "./api.js";
import { Storage } from "./storage.js";

const REMOTE_ENDPOINTS = { bcv: "HIST_OFICIAL", paralelo: "HIST_PARALELO" };
const REMOTE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export class History {
  /** Fecha local en formato YYYY-MM-DD */
  static dateKey(date = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  }

  /** Normaliza "fecha" de la API sin desplazarla por zona horaria */
  static normalizeDate(raw) {
    if (!raw) return null;
    const m = String(raw).match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(raw);
    return isNaN(d) ? null : this.dateKey(d);
  }

  /** Registra el valor de hoy (se sobrescribe durante el día) */
  static record(currency, value) {
    return Storage.recordDaily(currency, value, this.dateKey());
  }

  /** Histórico remoto con caché de 6 h. Nunca lanza: devuelve [] si falla. */
  static async fetchRemote(currency) {
    const endpoint = REMOTE_ENDPOINTS[currency];
    if (!endpoint) return [];

    const cacheKey = `mismonedas_histremote_${currency}`;
    const cached = Storage.get(cacheKey);
    if (cached && Array.isArray(cached.points) && Date.now() - cached.ts < REMOTE_TTL_MS) {
      return cached.points;
    }

    try {
      const raw = await API.fetchWithRetry(CONFIG.APIs.DOLAR_API[endpoint]);
      const list = Array.isArray(raw) ? raw : raw?.data || [];
      const byDate = new Map();
      list.forEach((r) => {
        const date = this.normalizeDate(r.fecha);
        const value = Number(r.promedio ?? r.venta ?? r.compra);
        if (date && value > 0) byDate.set(date, value);
      });
      const points = [...byDate.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, value]) => ({ date, value }));
      Storage.set(cacheKey, { ts: Date.now(), points });
      return points;
    } catch (error) {
      console.warn(`⚠️ Histórico remoto (${currency}) no disponible:`, error.message);
      return cached?.points || [];
    }
  }

  /**
   * Serie de los últimos `days` días. Los días pasados priorizan la API;
   * el día de hoy prioriza el valor vivo registrado localmente.
   * @returns {{points: {date:string,value:number}[], source:'api'|'local'}}
   */
  static async getSeries(currency, days) {
    const remote = await this.fetchRemote(currency);
    const today = this.dateKey();
    const merged = new Map(remote.map((p) => [p.date, p.value]));
    Storage.getDaily(currency).forEach((p) => {
      if (!merged.has(p.date) || p.date === today) merged.set(p.date, p.value);
    });

    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromKey = this.dateKey(from);

    const points = [...merged.entries()]
      .filter(([date]) => date >= fromKey)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({ date, value }));

    return { points, source: remote.length ? "api" : "local" };
  }

  /**
   * Variación frente al último día anterior registrado.
   * @returns {{absolute:number, percentage:number, direction:string, since:string}|null}
   *          percentage va CON SIGNO (positivo = sube).
   */
  static async variation(currency, current) {
    if (!current || current <= 0) return null;
    const { points } = await this.getSeries(currency, 14);
    const today = this.dateKey();
    const prev = [...points].reverse().find((p) => p.date < today);
    if (!prev) return null;

    const absolute = current - prev.value;
    const percentage = (absolute / prev.value) * 100;
    const direction = absolute > 0 ? "up" : absolute < 0 ? "down" : "stable";
    return { absolute, percentage, direction, since: prev.date };
  }
}
