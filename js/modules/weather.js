// Manejo del widget de clima mejorado - MisMonedas v4.2.0
import { CONFIG } from '../config.js';

export class Weather {
    constructor() {
        this.initialized = false;
        this.defaultCity = 'Caracas';
    }

    async init() {
        if (this.initialized) return;
        if (!navigator.geolocation) {
            this.loadDefaultWeather();
            return;
        }
        try {
            const position = await this.getCurrentPosition();
            await this.getWeather(position.coords.latitude, position.coords.longitude);
            this.initialized = true;
        } catch (error) {
            console.warn('⚠️ Geolocation denied, loading default weather');
            this.loadDefaultWeather();
        }
    }

    async loadDefaultWeather() {
        try {
            await this.getWeather(10.4806, -66.9036);
            this.initialized = true;
        } catch (error) {
            this.showError('Clima no disponible');
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false
            });
        });
    }

    async getWeather(lat, lon) {
        try {
            const url = `${CONFIG.APIs.WEATHER}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();
            this.displayWeather(data);
        } catch (error) {
            console.error('❌ Error fetching weather:', error);
            this.showError('Error al obtener el clima');
        }
    }

    displayWeather(data) {
        const temp = Math.round(data.current_weather.temperature);
        const weatherCode = data.current_weather.weathercode;
        
        // ✅ FIX v4.0.1: IDs actualizados al nuevo prototipo
        const tempElement = document.getElementById('weather-temp');
        const descElement = document.getElementById('weather-desc');

        if (tempElement) tempElement.innerText = `${temp}°C`;
        if (descElement) descElement.innerText = this.getDescription(weatherCode);

        this.checkDayOrNight(data.daily.sunrise[0], data.daily.sunset[0]);
    }

    checkDayOrNight(sunrise, sunset) {
        const now = new Date();
        const rise = new Date(sunrise);
        const set = new Date(sunset);
        const icon = document.getElementById('day-icon');
        const text = document.getElementById('day-status');

        if (now > rise && now < set) {
            if (icon) icon.className = 'fa-solid fa-sun';
            if (text) text.innerText = 'Día';
        } else {
            if (icon) icon.className = 'fa-solid fa-moon';
            if (text) text.innerText = 'Noche';
        }
    }

    getDescription(code) {
        const weatherCodes = {
            0: '☀️ Cielo despejado',
            1: '🌤️ Mayormente despejado',
            2: '⛅ Parcialmente nublado',
            3: '☁️ Nublado',
            45: '🌫️ Niebla',
            48: '🌫️ Niebla con escarcha',
            51: '🌦️ Llovizna ligera',
            61: '🌧️ Lluvia ligera',
            63: '🌧️ Lluvia moderada',
            65: '🌧️ Lluvia fuerte',
            71: '🌨️ Nieve ligera',
            80: '🌦️ Chubascos',
            95: '⛈️ Tormenta'
        };
        return weatherCodes[code] || '🌡️ Clima desconocido';
    }

    showError(message) {
        // ✅ FIX v4.0.1: ID actualizado
        const descElement = document.getElementById('weather-desc');
        if (descElement) {
            descElement.innerText = message;
        }
    }
}