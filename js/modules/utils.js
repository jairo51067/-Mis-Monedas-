// Funciones auxiliares reutilizables
export class Utils {
    /**
     * Formatea un número según la localización
     */
    static formatNumber(number, locale = 'es-CO', options = {}) {
        const defaultOptions = {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...options
        };
        return new Intl.NumberFormat(locale, defaultOptions).format(number);
    }

    /**
     * Formatea como moneda
     */
    static formatCurrency(amount, currency = 'COP', locale = 'es-CO') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Formatea fecha y hora
     */
    static formatDateTime(date = new Date()) {
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const anio = date.getFullYear();
        const hora = String(date.getHours()).padStart(2, '0');
        const minutos = String(date.getMinutes()).padStart(2, '0');
        const segundos = String(date.getSeconds()).padStart(2, '0');

        return {
            fecha: `${dia}/${mes}/${anio}`,
            hora: `${hora}:${minutos}:${segundos}`,
            completo: `${dia}/${mes}/${anio} a las ${hora}:${minutos}:${segundos}`
        };
    }

    /**
     * Valida que sea un número válido
     */
    static isValidNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num) && num >= 0;
    }

    /**
     * Debounce para funciones de alto tráfico
     */
    static debounce(func, delay = 300) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Retry para llamadas API
     */
    static async retryAsync(fn, attempts = 3, delay = 1000) {
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === attempts - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
}