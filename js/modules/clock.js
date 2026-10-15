// Manejo de reloj y fecha
import { Utils } from './utils.js';

export class Clock {
    constructor() {
        this.intervalId = null;
    }

    /**
     * Inicia el reloj
     */
    start() {
        this.update();
        this.intervalId = setInterval(() => this.update(), 1000);
    }

    /**
     * Detiene el reloj
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    /**
     * Actualiza la visualización del reloj
     */
    update() {
        const now = new Date();

        const dayName = now.toLocaleDateString('es-ES', { weekday: 'long' });
        const date = now.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const time = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const dayNameElement = document.getElementById('day-name');
        const dateElement = document.getElementById('date');
        const timeElement = document.getElementById('time');

        if (dayNameElement) {
            dayNameElement.innerText = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        }
        if (dateElement) {
            dateElement.innerText = date;
        }
        if (timeElement) {
            timeElement.innerText = time;
        }
    }
}