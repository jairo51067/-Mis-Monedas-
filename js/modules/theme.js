// Manejo de temas (modo oscuro/claro)
export class Theme {
    constructor() {
        this.themeKey = 'app-theme';
        this.currentTheme = this.getSavedTheme();
    }

    getSavedTheme() {
        const saved = localStorage.getItem(this.themeKey);
        if (saved) return saved;

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    apply() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', this.currentTheme === 'dark' ? '#1a1b21' : '#eef3fa');
        this.updateToggleButton();
        console.log(`✅ Theme applied: ${this.currentTheme}`);
    }

    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem(this.themeKey, this.currentTheme);
        this.apply();
    }

    updateToggleButton() {
        const icon = document.querySelector('#theme-toggle .theme-toggle-icon')
            || document.querySelector('#theme-toggle i');
        const label = document.querySelector('#theme-toggle .theme-toggle-label');

        if (icon) {
            icon.className = this.currentTheme === 'dark'
                ? 'fa-solid fa-sun'
                : 'fa-solid fa-moon';
        }
        if (label) {
            label.textContent = this.currentTheme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
        }
    }

    setupListeners() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.themeKey)) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.apply();
            }
        });
    }
}