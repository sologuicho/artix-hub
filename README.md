# Artix Hub

Una plataforma moderna y elegante para explorar competencias científicas y de investigación, inspirada en diseños minimalistas y profesionales.

## 🚀 Características

- **Diseño Moderno**: Interfaz limpia y profesional con TailwindCSS
- **Modo Oscuro/Claro**: Toggle entre temas con un solo clic
- **Búsqueda en Tiempo Real**: Filtra competencias por título, categoría o autor
- **Diseño Responsive**: Adaptado para móviles, tablets y desktop
- **Header Sticky**: Navegación siempre visible al hacer scroll

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- npm o yarn

## 🛠️ Instalación

1. Navega al directorio del proyecto:
```bash
cd artix-hub
```

2. Instala las dependencias:
```bash
npm install
```

## ▶️ Ejecutar el Proyecto

Para iniciar el servidor de desarrollo:

```bash
npm start
```

La aplicación se abrirá automáticamente en [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
artix-hub/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Componente del header con navegación y búsqueda
│   │   └── Competitions.jsx    # Componente principal de competencias
│   ├── App.js                  # Componente principal de la aplicación
│   ├── App.css                 # Estilos globales (mínimos)
│   ├── index.js                # Punto de entrada de React
│   └── index.css               # Estilos con directivas de Tailwind
├── public/                     # Archivos estáticos
├── tailwind.config.js          # Configuración de TailwindCSS
├── postcss.config.js           # Configuración de PostCSS
└── package.json                # Dependencias del proyecto
```

## 🎨 Tecnologías Utilizadas

- **React 19.2.0**: Biblioteca de JavaScript para construir interfaces
- **TailwindCSS 4.1.17**: Framework de CSS utility-first
- **lucide-react**: Librería de íconos moderna y ligera

## ✨ Funcionalidades Implementadas

### Header
- Logo "Artix Hub"
- Navegación: Articles, Events, Discussions, Blog (links preparados)
- Botones: Log In, Sign Up
- Toggle de modo oscuro/claro

### Sección Competitions
- Grid responsive (1 columna móvil, 2 tablet, 3 desktop)
- Tarjetas con:
  - Imagen de portada
  - Categoría
  - Título
  - Descripción
  - Autor con ícono
- Efectos hover elegantes

### Búsqueda
- Filtrado en tiempo real por:
  - Nombre del artículo
  - Categoría
  - Autor
  - Descripción

## 🎯 Próximos Pasos

Los links de navegación (Articles, Events, Discussions, Blog) están preparados pero las páginas aún no están implementadas. Puedes agregarlas siguiendo la misma estructura de componentes.

## 📝 Scripts Disponibles

- `npm start`: Inicia el servidor de desarrollo
- `npm run build`: Crea una versión optimizada para producción
- `npm test`: Ejecuta los tests
- `npm run eject`: Expone la configuración de webpack (irreversible)

## 🌙 Modo Oscuro

El modo oscuro se activa/desactiva mediante el botón de sol/luna en el header. El estado se mantiene durante la sesión.

---

Desarrollado con ❤️ usando React y TailwindCSS
