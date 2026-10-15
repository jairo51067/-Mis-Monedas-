// js/config.js - Configuración Global de MisMonedas v4.2.0
// Endpoints verificados y corregidos para DolarAPI Venezuela

export const CONFIG = {
    // 1. NOMBRE Y VERSIÓN
    APP_NAME: "MisMonedas",
    VERSION: "4.2.0",
    
    // 2. ENDPOINTS DE APIS (Rutas oficiales y verificadas)
    APIs: {
        DOLAR_API: {
            OFICIAL: "https://ve.dolarapi.com/v1/dolares/oficial",
            PARALELO: "https://ve.dolarapi.com/v1/dolares/paralelo", // ✅ Corregido
            EURO: "https://ve.dolarapi.com/v1/euros",                // ✅ Corregido
            // v4.2.0: histórico real (último valor de cada día) — solo oficial y paralelo
            HIST_OFICIAL: "https://ve.dolarapi.com/v1/historicos/dolares/oficial",
            HIST_PARALELO: "https://ve.dolarapi.com/v1/historicos/dolares/paralelo"
        },
        EXCHANGE_RATE: "https://api.exchangerate-api.com/v4/latest/",
        WEATHER: "https://api.open-meteo.com/v1/forecast",
        GOLD: "https://api.gold-api.com/price/XAU",
        NEWS_WORKER: "https://jairo-news-api.jairocardenas05.workers.dev/"
    },

    // 3. CLAVES DE CACHÉ
    CACHE: {
        PREFIX: "mismonedas_v4_",
        KEYS: {
            BCV: "mismonedas_bcv_cache",
            PARALELO: "mismonedas_paralelo_cache",
            EURO: "mismonedas_euro_cache",
            TRM: "mismonedas_trm_cache",
            HISTORY: "mismonedas_conversion_history",
            THEME: "mismonedas_theme"
        },
        EXPIRATION_MS: 5 * 60 * 1000
    },

    // 4. CONFIGURACIÓN DE CONVERSOR
    DEFAULT_CURRENCY: { FROM: "USD", TO: "VES" },
    CURRENCIES: [
        { code: "USD", name: "Dólar Estadounidense", symbol: "$" },
        { code: "VES", name: "Bolívar Soberano", symbol: "Bs." },
        { code: "COP", name: "Peso Colombiano", symbol: "$" },
        { code: "EUR", name: "Euro", symbol: "€" }
    ],

    // 5. CONFIGURACIÓN DE PUBLICIDAD (Estructura que espera news.js)
    AD_CONFIG: {
        affiliate: {
            isActive: true,
            url: "https://www.binance.com/es/register?ref=TU_CODIGO_DE_REFERIDO",
            name: "Binance",
            color: "#F0B90B",
            title: "Regístrate en Binance",
            text: "Obtén 10% de descuento en comisiones de trading",
            cta: "Registrarse"
        },
        client: {
            isActive: false,
            isImage: false,
            url: "#",
            name: "Cliente",
            color: "#00d4ff",
            title: "Espacio disponible",
            text: "Contacta para patrocinar MisMonedas",
            cta: "Contactar",
            imageUrl: ""
        }
    },

    // 6. UI/UX
    UI: {
        SHOW_VARIATIONS_ONLY_IF_HISTORY: true,
        MIN_VARIATION_TO_SHOW: 0.01
    }
};

// ==========================================
// EXPORTS INDEPENDIENTES (Para compatibilidad)
// ==========================================
export const APP_NAME = CONFIG.APP_NAME;
export const VERSION = CONFIG.VERSION;
export const APIs = CONFIG.APIs;
export const CACHE = CONFIG.CACHE;
export const DEFAULT_CURRENCY = CONFIG.DEFAULT_CURRENCY;
export const CURRENCIES = CONFIG.CURRENCIES;
export const AD_CONFIG = CONFIG.AD_CONFIG;
export const UI_CONFIG = CONFIG.UI;