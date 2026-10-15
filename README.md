# Mis Monedas 🪙

Una aplicación web progresiva (PWA) rápida, ligera y moderna desarrollada en JavaScript vanilla para la gestión, conversión y seguimiento de divisas, oro y datos financieros en tiempo real.

## 🚀 Características

- **Conversor de Divisas:** Cálculo rápido y actualizado entre múltiples monedas.
- **Seguimiento de Oro:** Consulta de valores y tendencias del oro.
- **Noticias Financieras:** Módulo integrado de noticias del sector.
- **Reloj y Clima:** Widgets útiles de hora local y condiciones meteorológicas.
- **Modo Oscuro/Claro:** Interfaz adaptativa con persistencia de tema.
- **Modo Offline:** Funcionalidad optimizada sin conexión gracias a Service Workers (`sw.js`).
- **Almacenamiento Local:** Gestión de preferencias y datos mediante `localStorage`.

## 📁 Estructura del Proyecto

mismonedas/
├── index.html          # Punto de entrada principal
├── offline.html        # Vista alternativa sin conexión
├── manifest.json       # Manifiesto de la PWA
├── sw.js               # Service Worker
├── styles.css          # Estilos globales
├── styles-news.css     # Estilos específicos para noticias
├── js/
│   ├── app.js          # Lógica principal de arranque
│   ├── config.js       # Configuración global
│   └── modules/        # Módulos funcionales (api, converter, gold, storage, etc.)
└── assets/             # Iconos e imágenes

## 🛠️ Tecnologías Utilizadas

HTML5 / CSS3 (Diseño responsivo y moderno)

JavaScript (ES6+) sin dependencias externas

PWA Ready (Service Workers y Web App Manifest)

Vercel (Despliegue y hosting optimizado)

Desarrollado con ❤️ y JavaScript puro.
