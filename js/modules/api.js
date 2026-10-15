// js/modules/api.js - MisMonedas v4.0.0
import { CONFIG } from '../config.js';
import { Utils } from './utils.js';
import { Storage } from './storage.js';

export class API {
    static async fetchWithRetry(url, options = {}) {
        return Utils.retryAsync(async () => {
            const fetchOptions = {
                method: 'GET',
                cache: 'no-cache',
                mode: 'cors',
                ...options
            };
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        }, 3);
    }

    static async getConversionRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return 1;
        try {
            const data = await this.fetchWithRetry(`${CONFIG.APIs.EXCHANGE_RATE}${fromCurrency}`);
            return data.rates[toCurrency] || null;
        } catch (error) {
            console.error(`❌ Error fetching rate from ${fromCurrency} to ${toCurrency}:`, error);
            throw new Error('Tasa de cambio no disponible');
        }
    }

    static async getExchangeRates(baseCurrency = 'USD') {
        try {
            const data = await this.fetchWithRetry(`${CONFIG.APIs.EXCHANGE_RATE}${baseCurrency}`);
            return data.rates;
        } catch (error) {
            console.error('❌ Error fetching exchange rates:', error);
            throw new Error('No se pudieron obtener las tasas de cambio');
        }
    }

    static async getDolarOficial() {
        try {
            const data = await this.fetchWithRetry(CONFIG.APIs.DOLAR_API.OFICIAL);
            Storage.setRatesWithHistory(CONFIG.CACHE.KEYS.BCV, data);
            return data;
        } catch (error) {
            console.error('❌ Error fetching dólar oficial:', error);
            throw error;
        }
    }

    static async getDolarParalelo() {
        try {
            const data = await this.fetchWithRetry(CONFIG.APIs.DOLAR_API.PARALELO);
            Storage.setRatesWithHistory(CONFIG.CACHE.KEYS.PARALELO, data);
            return data;
        } catch (error) {
            console.error('❌ Error fetching dólar paralelo:', error);
            throw error;
        }
    }

   static async getEuroOficial() {
    try {
        const data = await this.fetchWithRetry(CONFIG.APIs.DOLAR_API.EURO);
        
        // ✅ NORMALIZACIÓN: Si viene como array, tomar el primer elemento
        const normalized = Array.isArray(data) ? data[0] : data;
        
        Storage.setRatesWithHistory('euro_oficial_cache', normalized);
        return normalized;
    } catch (error) {
        console.error('❌ Error fetching euro oficial:', error);
        throw error;
    }
}

    static async getTRMColombia() {
        try {
            const rates = await this.getExchangeRates('USD');
            const trmData = { trm: rates.COP };
            Storage.setRatesWithHistory(CONFIG.CACHE.KEYS.TRM, trmData);
            return trmData;
        } catch (error) {
            console.error('❌ Error fetching TRM:', error);
            throw error;
        }
    }

    /**
     * ✅ CORREGIDO: Cálculo de factores NO BLOQUEANTE
     * Si falla, retorna null en lugar de romper la app.
     * También acepta más variantes de estructura de respuesta.
     */
    static async getConversionFactors() {
        try {
            const [trmData, paraleloData, oficialData, euroData] = await Promise.all([
                this.getTRMColombia(),
                this.getDolarParalelo(),
                this.getDolarOficial(),
                this.getEuroOficial()
            ]);

            const trm = trmData.trm || 0;

            // ✅ Fallback más robusto: acepta promedio, venta o compra
            const paralelo = paraleloData.promedio || paraleloData.venta || paraleloData.compra || 0;
            const oficial = oficialData.promedio || oficialData.venta || oficialData.compra || 0;
            const euro = euroData.promedio || euroData.venta || euroData.compra || 0;

            // ✅ Validación más permisiva: solo requerimos oficial y paralelo
            if (oficial === 0 || paralelo === 0) {
                console.warn('️ Tasas de Venezuela incompletas. Factores no calculados.');
                return { factor1: 0, factor2: 0, factor3: 0 };
            }

            return {
                factor1: trm > 0 ? trm / paralelo : 0,
                factor2: trm > 0 ? trm / oficial : 0,
                factor3: (trm > 0 && euro > 0) ? trm / euro : 0
            };
        } catch (error) {
            console.error('❌ Error calculating factors:', error);
            // ✅ Retorna valores por defecto en lugar de romper la app
            return { factor1: 0, factor2: 0, factor3: 0 };
        }
    }
}