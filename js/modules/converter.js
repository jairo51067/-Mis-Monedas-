// Lógica de conversión de monedas
import { API } from "./api.js";
import { Storage } from "./storage.js";
import { Utils } from "./utils.js";

export class Converter {
  /**
   * Convierte entre monedas usando ExchangeRate-API
   */
  static async convert(amount, fromCurrency, toCurrency) {
    if (!Utils.isValidNumber(amount)) {
      throw new Error("Cantidad inválida");
    }

    if (amount === 0) return 0;

    const rate = await API.getConversionRate(fromCurrency, toCurrency);
    if (!rate) {
      throw new Error("Tasa de cambio no disponible");
    }

    return amount * rate;
  }

  /**
   * Convierte Bolívares a Pesos COP usando factor paralelo
   */
  static convertBsToCop(bolivares, factor) {
    if (!Utils.isValidNumber(bolivares) || factor <= 0) {
      return 0;
    }
    return bolivares * factor;
  }

  /**
   * Convierte Pesos COP a Bolívares usando factor paralelo
   */
  static convertCopToBs(pesos, factor) {
    if (!Utils.isValidNumber(pesos) || factor <= 0) {
      return 0;
    }
    return pesos / factor;
  }

  /**
   * Guarda conversión en historial
   */
  static saveToHistory(amount, fromCurrency, result, toCurrency) {
    Storage.addToHistory({
      amount: parseFloat(amount),
      from: fromCurrency,
      to: toCurrency,
      result: parseFloat(result),
    });
  }
  /**
   * ✅ NUEVO: Determina la tasa implícita del dólar en una transacción cruzada
   * @param {number} pesos - Cantidad de pesos colombianos
   * @param {number} factorAplicado - Factor COP/VES que le ofrecen al usuario
   * @param {number} trm - Tasa TRM actual (COP/USD)
   * @param {number} tasaBcv - Tasa BCV actual (VES/USD)
   * @param {number} tasaParalelo - Tasa Paralelo actual (VES/USD)
   * @returns {Object|null} Objeto con los cálculos o null si faltan datos
   */
  static calculateImplicitDollarRate(
    pesos,
    factorAplicado,
    trm,
    tasaBcv,
    tasaParalelo,
  ) {
    if (!pesos || !factorAplicado || !trm || !tasaBcv || !tasaParalelo) {
      return null;
    }

    // 1. Bolívares que recibirá el usuario
    const bolivaresRecibidos = pesos / factorAplicado;

    // 2. Tasa implícita USD/VES
    // Matemáticamente: (pesos / factor) / (pesos / trm) se simplifica a: trm / factor
    const tasaImplicitaUsdVes = trm / factorAplicado;

    // 3. Comparación vs BCV
    const diffBcv = tasaImplicitaUsdVes - tasaBcv;
    const pctBcv = (diffBcv / tasaBcv) * 100;

    // 4. Comparación vs Paralelo
    const diffParalelo = tasaImplicitaUsdVes - tasaParalelo;
    const pctParalelo = (diffParalelo / tasaParalelo) * 100;

    return {
      bolivaresRecibidos,
      tasaImplicitaUsdVes,
      comparacionBcv: {
        diff: Math.abs(diffBcv),
        pct: Math.abs(pctBcv),
        direction: diffBcv > 0 ? "up" : diffBcv < 0 ? "down" : "stable",
      },
      comparacionParalelo: {
        diff: Math.abs(diffParalelo),
        pct: Math.abs(pctParalelo),
        direction:
          diffParalelo > 0 ? "up" : diffParalelo < 0 ? "down" : "stable",
      },
    };
  }
}
