# Artix Hub — Análisis Arquitectónico

> Documento de referencia técnica para entender la estructura, decisiones de diseño y flujos del sistema.

---

## 1. Visión General

Artix Hub es una plataforma académica y de comunidad que permite publicar artículos, investigaciones, blog posts y eventos con capacidades de colaboración, suscripciones por tier, pagos y asistencia por IA.

**Stack principal:**

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + React Router DOM 6 |
| Estilos | Tailwind CSS + Framer Motion |
| Editor | Quill (react-quill) |
| Backend | Node.js + Express 4 |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL (Neon) |
| Auth | JWT (httpOnly cookies) + Passport.js (OAuth) |
| Tiempo real | Socket.IO 4 |
| Colas | BullMQ (Redis) |
| Pagos | Stripe + MercadoPago |
| IA | OpenAI + Google Gemini (intercambiables) |
| Logger | Pino + Morgan |
| Deploy | Frontend → Vercel / Backend → Render |

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│                    React 18 + Vite + Tailwind                   │
│                                                                 │
│  Pages (37)  →  Components (42+)  →  Context (Auth/Theme/Lang) │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP /api/*  (proxy en dev)
                           │ WebSocket (Socket.IO)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express Server)                      │
│                       localhost:4000                            │
│                                                                 │
│  Middleware Stack:                                              │
│  Helmet → CORS → RateLimit → CookieParser → CSRF → Auth        │
│                                                                 │
│  Routes (26) → Controllers (20) → Services → Repositories      │
│                                                                 │
│  Socket.IO Server  │  BullMQ Jobs (email reminders)            │
└────────────┬────────────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
┌──────────┐  ┌──────────┐
│PostgreSQL│  │  Redis   │
│  (Neon)  │  │ (BullMQ) │
│ Prisma   │  └──────────┘
└──────────┘
```

### Separación frontend / backend

El proyecto **no** usa Next.js. Son dos procesos independientes:

- **`npm run dev`** — Vite dev server en `:5173`, hace proxy de `/api/*` a `localhost:4000` (vite.config.js línea 17-20)
- **`npm run api`** — Express server en `:4000`
- **`npm run dev:full`** — Levanta ambos en paralelo

En producción, el frontend se sirve como SPA estática desde Vercel y el backend corre en Render como servicio web.

---

## 3. Frontend — Estructura y Módulos

### 3.1 Árbol de directorios

```
src/
├── App.jsx                    # Router raíz (React Router DOM)
├── main.jsx                   # Punto de entrada, monta providers
├── index.css                  # Tailwind base + estilos globales
│
├── pages/                     # 37 vistas (una por ruta)
├── components/                # 42+ componentes reutilizables
│   ├── layout/                # PremiumPageLayout
│   ├── reader/                # Componentes de lectura avanzada
│   └── ui/                    # Primitivos UI
│
├── context/                   # Estado global (React Context)
├── hooks/                     # Custom hooks
├── lib/                       # Clientes externos (AI, OAuth, config)
├── utils/                     # Helpers (darkMode, imageCompression, pdfGenerator)
├── layout/                    # Layout.jsx (header + footer wrapper)
├── locales/                   # Archivos i18n por idioma
└── constants/                 # Constantes de la app
```

### 3.2 Páginas por dominio

| Dominio | Páginas |
|---------|---------|
| **Contenido** | Articles, ArticleView, CreateArticle, Research, ResearchView, CreateResearch, Blog, BlogPostView, CreateBlogPost |
| **Eventos** | Events, EventView, CreateEvent, EventLobby |
| **Comunidad** | FeedPage, Discussions, SearchResults |
| **Usuario** | Profile, UserProfile, ProfileSetup, ProfileSettings, Settings, FollowersFollowing, SavedItems, Archived |
| **Auth** | Auth, AuthCallback, Login, SetupUsername, VerifyEmail, ResetPassword, StudentVerification |
| **Monetización** | SubscriptionSettings, PaymentSuccess |
| **Admin** | AdminPanel |
| **Sistema** | Dashboard, Home, NotFound |

### 3.3 Estado global (Context API)

```
AuthContext       → usuario autenticado, token, logout
DarkModeContext   → tema claro/oscuro
LanguageContext   → idioma activo + traducciones
NotificationContext → notificaciones in-app
WallpaperContext  → fondo de pantalla personalizado
```

No usa Redux ni Zustand — el estado se maneja exclusivamente con Context + hooks propios.

### 3.4 Componentes clave

**Editor de contenido:**
- `RichTextEditor.jsx` — Editor Quill base
- `RichTextEditorWithMentions.jsx` — Quill con sistema de menciones (@usuario)
- `AIEditorPanel.jsx` — Panel lateral de asistente IA durante escritura
- `AIValidationPanel.jsx` — Validación de contenido antes de publicar

**Sistema de eventos en vivo:**
- `StreamBroadcaster.jsx` — Transmisión OBS/RTMP desde el navegador
- `StreamViewer.jsx` — Visualizador del stream
- `EventLobby` (página) — Sala de chat en tiempo real vía Socket.IO

**Suscripciones / Pagos:**
- `PricingSection.jsx` / `PricingModal.jsx` — Planes y precios
- `TeamPricingCalculator.jsx` — Calculadora dinámica para plan TEAM

**Lectura:**
- `ReadingMode.jsx` — Modo lectura sin distracciones
- `PaginatedReader.jsx` — Lector con paginación y tracking de progreso
- `CircularProgress.jsx` — Indicador visual de progreso

### 3.5 Utilidades frontend

| Utilidad | Propósito |
|----------|-----------|
| `utils/imageCompression.js` | Reduce tamaño de imágenes antes de subir |
| `utils/pdfGenerator.js` | Genera PDF desde HTML (html2canvas + jsPDF) |
| `lib/ai/aiClient.js` | Cliente unificado para OpenAI / Gemini |
| `lib/auth/oauth.js` | Flujo OAuth (Google, GitHub, Azure) |

---

## 4. Backend — Estructura y Módulos

### 4.1 Árbol de directorios

```
server/src/
├── index.js                   # Punto de entrada — monta todo
├── prismaClient.js            # Singleton del cliente Prisma
│
├── auth/
│   ├── authRoutes.js          # /auth/* (login, register, OAuth callbacks)
│   └── passport.js            # Estrategias: Google, GitHub, Azure AD
│
├── routes/                    # 26 archivos de rutas
├── controllers/               # 20 controladores (lógica HTTP)
├── services/                  # Lógica de negocio desacoplada
├── repositories/              # Data access layer (artículos, usuarios)
├── middleware/                 # Interceptores HTTP
├── socket/
│   └── socketServer.js        # Servidor Socket.IO (lobbies, notificaciones)
├── jobs/
│   └── emailReminderJob.js    # BullMQ — recordatorios de eventos
├── integrations/queue/        # Configuración BullMQ / Redis
├── lib/
│   ├── logger.js              # Pino logger
│   └── ai/                    # Cliente IA + proveedores
└── config/
    └── urls.js                # ALLOWED_ORIGINS (whitelist CORS)
```

### 4.2 Middleware Stack (orden de ejecución)

```
Request entrante
      │
      ▼
  helmet()              → Headers de seguridad (CSP, HSTS, etc.)
      │
  morgan()              → HTTP request logging → Pino
      │
  Stripe webhook raw    → PRIMERO antes de express.json() (firma criptográfica)
      │
  express.json(10mb)    → Parse JSON + base64 images
      │
  cookieParser()        → Lee cookies httpOnly
      │
  cors(whitelist)       → Strict origin whitelist, no NODE_ENV bypass
      │
  generalLimiter        → 500 req / 15 min en /api/*
      │
  passport.initialize() → Estrategias OAuth disponibles
      │
  [ruta específica]
      │
  protect (JWT)         → Verifica token en cookie httpOnly
      │
  verifyCsrf            → Token CSRF en mutaciones
      │
  checkTier             → Verifica suscripción para rutas premium
      │
  checkAdmin            → Verifica rol ADMIN
      │
  Controller
```

### 4.3 Capas de la arquitectura backend

```
Routes       →  definen endpoints y aplican middlewares
Controllers  →  manejan Request/Response, validan entrada
Services     →  lógica de negocio (orquestación, reglas)
Repositories →  queries Prisma (artículos, usuarios)
PrismaClient →  conexión a PostgreSQL
```

> Nota: la separación en repositories solo existe para `articleRepository.js` y `userRepository.js`. El resto de los controladores consultan Prisma directamente — área de mejora futura.

### 4.4 Mapa de rutas completo

| Prefijo | Archivo | Descripción |
|---------|---------|-------------|
| `/auth` | `auth/authRoutes.js` | Login, register, OAuth callbacks, refresh token |
| `/api/articles` | `articleRoutes.js` | CRUD artículos |
| `/api/research` | `researchRoutes.js` | CRUD investigaciones |
| `/api/events` | `eventRoutes.js` | CRUD eventos + registro + waitlist + live |
| `/api/blog` | `blogRoutes.js` | CRUD blog posts |
| `/api/comments` | `commentRoutes.js` | Comentarios anidados |
| `/api/reactions` | `reactionRoutes.js` | Like, clap, heart |
| `/api/follow` | `followRoutes.js` | Follow / unfollow |
| `/api/feed` | `feedRoutes.js` | Feed personalizado por follows |
| `/api/saved` | `savedItemRoutes.js` | Guardar y recuperar items |
| `/api/reading-progress` | `readingProgressRoutes.js` | Progreso de lectura |
| `/api/notifications` | `notificationRoutes.js` | Notificaciones in-app |
| `/api/reminders` | `reminderRoutes.js` | Recordatorios de eventos |
| `/api/search` | `searchRoutes.js` | Búsqueda global multi-tipo |
| `/api/users` | `userRoutes.js` | Perfiles de usuarios |
| `/api` | `collaborationRoutes.js` | Invitaciones de co-autoría |
| `/api/repost` | `repostRoutes.js` | Reposteo de contenido |
| `/api/subscription` | `subscriptionRoutes.js` | Gestión de tiers |
| `/api/payments` | `paymentRoutes.js` | Stripe + MercadoPago |
| `/api/payments/stripe/webhook` | `stripeWebhook.js` | Webhook con raw body |
| `/api/ai` | `aiRoutes.js` | Validación y asistencia IA |
| `/api/validate` | `validationRoutes.js` | Validación de contenido |
| `/api/dashboard` | `dashboardRoutes.js` | Stats del dashboard |
| `/api/admin` | `adminRoutes.js` | Panel de administración |
| `/api/student` | `studentRoutes.js` | Verificación de estudiante |
| `/api` | `epubRoutes.js` | Exportación a EPUB |

---

## 5. Base de Datos — Schema Prisma

### 5.1 Diagrama de entidades

```
User ────────────────────────────────────────────────────────────
  │                                                              │
  ├── Article[] ──→ ArticleCollaborator[], Comment[],            │
  │                 Reaction[], SavedItem[], ReadingProgress[],  │
  │                 Repost[]                                     │
  │                                                              │
  ├── Research[] ──→ ResearchCollaborator[], Comment[],          │
  │                  Reaction[], SavedItem[], ReadingProgress[],  │
  │                  Repost[]                                     │
  │                                                              │
  ├── BlogPost[] ──→ Comment[], Reaction[], SavedItem[],         │
  │                  ReadingProgress[], Repost[]                  │
  │                                                              │
  ├── Event[] ────→ EventCollaborator[], EventRegistration[],    │
  │                 EventWaitlist[], EventLobbyMessage[],         │
  │                 EventReminder[], SavedItem[], Repost[]        │
  │                                                              │
  ├── Discussion[] ──→ Comment[]                                 │
  │                                                              │
  ├── Follow[] (following / followers — self-referencial)        │
  ├── Notification[]                                             │
  ├── DailyUsage[] (límites por tier)                            │
  ├── ReadingProgress[]                                          │
  ├── StudentVerification? (1:1)                                 │
  ├── PasswordResetToken[]                                        │
  └── EmailVerificationToken[]                                   │
                                                                 │
StripeEvent (idempotencia webhooks Stripe)                       │
MpEvent (idempotencia webhooks MercadoPago)                      │
```

### 5.2 Modelos por dominio

**Usuarios y Auth:**

| Modelo | Propósito |
|--------|-----------|
| `User` | Usuario con OAuth provider, roles, tier, tokenVersion |
| `StudentVerification` | Documento + estado de verificación estudiantil |
| `PasswordResetToken` | Token SHA-256 hasheado con expiración |
| `EmailVerificationToken` | Token SHA-256 hasheado con expiración |

**Contenido:**

| Modelo | Estados |
|--------|---------|
| `Article` | draft → reviewing → published → archived |
| `Research` | draft → reviewing → published → archived |
| `BlogPost` | activo / archived (boolean) |
| `Discussion` | sin ciclo de estados |

**Eventos:**

| Modelo | Descripción |
|--------|-------------|
| `Event` | Título, fecha, capacidad, ticketPrice, streamUrl, isLive |
| `EventRegistration` | M:N User ↔ Event |
| `EventWaitlist` | Lista de espera cuando event.maxAttendees se alcanza |
| `EventLobbyMessage` | Chat en tiempo real (persiste en BD) |
| `EventCollaborator` | Co-organizadores con rol y estado de invitación |
| `EventReminder` | `day_before` / `morning_of`, marcado como `sent` |

**Interacciones (polimórficas via optional FKs):**

| Modelo | Aplica a |
|--------|---------|
| `Comment` | Article, Research, BlogPost, Discussion + replies anidadas |
| `Reaction` | Article, Research, BlogPost (tipo: like/clap/heart/etc.) |
| `SavedItem` | Article, Research, BlogPost, Event |
| `Repost` | Article, Research, BlogPost, Event |
| `ReadingProgress` | Article, Research, BlogPost |

**Suscripciones y Pagos:**

| Modelo | Descripción |
|--------|-------------|
| `DailyUsage` | Contador de artículos leídos por día por usuario |
| `StripeEvent` | Registro de IDs procesados (idempotencia) |
| `MpEvent` | Registro de x-request-id de MercadoPago (idempotencia) |

### 5.3 Enum: SubscriptionTier

```
OBSERVER    →  usuario básico sin pago
MEMBER      →  suscripción base
STUDENT     →  requiere StudentVerification APPROVED
RESEARCHER  →  acceso a funciones avanzadas de investigación
TEAM        →  organizacional (TeamPricingCalculator)
VISIONARY   →  tier máximo
```

### 5.4 Índices definidos

El schema define índices explícitos en las columnas de mayor cardinalidad de búsqueda:

- `User`: `username`, `email`
- `Article`: `authorId`, `category`, `status`, `title`
- `Research`: `authorId`, `category`, `status`
- `BlogPost`: `authorId`, `category`, `archived`
- `Event`: `creatorId`, `date`, `type`, `archived`, `isLive`
- `Comment`: `authorId`, más todos los FKs de contenido
- `Reaction`: `userId`, `postId`, `articleId`, `researchId`
- `EventLobbyMessage`: `eventId`, `createdAt`
- `ReadingProgress`: `userId`, `updatedAt`
- `Notification`: `userId`, `read`, `createdAt`

---

## 6. Autenticación y Autorización

### 6.1 Flujo de autenticación

```
Email/Password:
  POST /auth/login
    → bcrypt.compare(password, hash)
    → genera accessToken (JWT, 15 min) + refreshToken (JWT, 7 días)
    → ambos en httpOnly cookies

OAuth (Google / GitHub / Azure AD):
  GET /auth/google → Passport → callback → mismo flujo de tokens

Refresh:
  POST /auth/refresh
    → verifica refreshToken cookie
    → chequea tokenVersion (invalida si el usuario cambió contraseña)
    → emite nuevo accessToken

Logout:
  POST /auth/logout → borra cookies
```

### 6.2 Invalidación de tokens

El modelo `User` tiene campo `tokenVersion: Int`. Cada vez que el usuario cambia contraseña o se hace logout global, `tokenVersion` se incrementa. El middleware `protect` verifica que el `tokenVersion` en el JWT coincida con el de la BD — si no, el token es rechazado aunque no haya expirado.

### 6.3 Niveles de autorización

```
público          → lectura de contenido publicado
protect          → JWT válido requerido
checkTier(tier)  → subscriptionTier >= tier requerido
checkAdmin       → role === 'ADMIN'
verifyCsrf       → en todas las mutaciones autenticadas
```

---

## 7. Tiempo Real (Socket.IO)

### 7.1 Uso actual

`socketServer.js` implementa salas de evento (event lobbies):

```
Usuario se conecta al socket
  → join(room: `event-${eventId}`)
  → emite mensajes en tiempo real al room
  → mensajes también se persisten en EventLobbyMessage (PostgreSQL)
```

### 7.2 Alcance

Socket.IO se usa exclusivamente para los lobbies de eventos. Las notificaciones in-app se sirven via polling HTTP regular, no via WebSocket.

---

## 8. Sistema de Colas (BullMQ)

Solo hay un job configurado:

```
emailReminderJob.js
  → se ejecuta en background al iniciar el servidor
  → procesa EventReminder[] donde sent=false y scheduledFor <= now()
  → envía email via Nodemailer (emailService.js)
  → marca reminder.sent = true
```

La integración con Redis/BullMQ está en `server/src/integrations/queue/` pero el sistema de jobs es mínimo — solo recordatorios de eventos.

---

## 9. Integración de IA

### 9.1 Arquitectura del cliente IA

```
lib/ai/aiClient.js          ← interfaz unificada
    │
    ├── providers/openai.js    ← OpenAI API
    └── providers/gemini.js    ← Google Gemini API
```

El cliente es intercambiable entre proveedores — se puede cambiar el proveedor sin modificar el código que lo consume.

### 9.2 Puntos de uso

| Endpoint | Uso |
|----------|-----|
| `POST /api/ai/validate` | Validación de calidad de contenido |
| `POST /api/validate` | Validación antes de publicar |
| `AIEditorPanel.jsx` | Sugerencias en tiempo real mientras se escribe |
| `AIAssistantOverlay.jsx` | Overlay flotante de asistencia |
| `useAIValidation.js` | Hook que encapsula llamadas al endpoint de validación |

---

## 10. Sistema de Pagos

### 10.1 Stripe

```
Frontend                  Backend
PricingModal ──POST──→  /api/payments/stripe/create-session
                              │
                              └→ stripe.checkout.sessions.create()
                                    │
                                    ▼
                              redirect a Stripe Checkout
                                    │
                                    ▼
                         POST /api/payments/stripe/webhook (raw body)
                              │
                              ├→ StripeEvent.findUnique(event.id) ← idempotencia
                              ├→ subscriptionService.updateTier()
                              └→ StripeEvent.create(event.id)
```

**Idempotencia:** antes de procesar cualquier webhook, se busca `event.id` en la tabla `StripeEvent`. Si ya existe, se ignora. Esto previene doble cobro o doble activación ante reintentos de Stripe.

El webhook debe recibir el body **sin parsear** (raw bytes) para poder verificar la firma con `stripe.webhooks.constructEvent()`. Por eso se registra **antes** de `express.json()` en `index.js` (línea 49-53).

### 10.2 MercadoPago

Mismo patrón de idempotencia usando `x-request-id` en la tabla `MpEvent`.

---

## 11. Patrón de Contenido Polimórfico

Un diseño recurrente en el schema: `Comment`, `Reaction`, `SavedItem`, `Repost` y `ReadingProgress` usan **optional foreign keys** para apuntar a distintos tipos de contenido:

```prisma
model Comment {
  articleId    String?
  researchId   String?
  postId       String?
  discussionId String?
  parentId     String?  // replies anidadas (self-reference)
}
```

Ventaja: una sola tabla para cada tipo de interacción, sin tablas de unión adicionales.
Implicación: las queries deben siempre incluir el FK correcto y los endpoints deben validar que solo uno esté presente.

---

## 12. Deploy

```
┌─────────────┐         ┌─────────────┐
│   Vercel    │         │   Render    │
│  (Frontend) │         │  (Backend)  │
│             │         │             │
│  React SPA  │──HTTP──→│  Express    │
│  + /api/*   │         │  :4000      │
│  proxy cdn  │         │             │
└─────────────┘         └──────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────┴─────┐        ┌──────┴──────┐
              │   Neon    │        │   Redis     │
              │PostgreSQL │        │  (BullMQ)   │
              └───────────┘        └─────────────┘
```

**Archivos de configuración de deploy:**
- `vercel.json` — Configuración SPA (rewrites a `index.html`)
- `render.yaml` — Servicio web + comando de inicio con `db push`
- `.env.production` — `VITE_API_URL` apuntando al backend de Render

**Startup del backend en Render:**
```
prisma db push && node server/src/index.js
```

Se usa `db push` en lugar de `migrate deploy` — sincroniza el schema sin historial de migraciones.

---

## 13. Observaciones Arquitectónicas

### Fortalezas

- **Seguridad de auth sólida**: httpOnly cookies, tokenVersion para invalidación, CSRF en mutaciones, Helmet, CORS con whitelist estricta
- **Idempotencia de pagos**: tablas `StripeEvent` y `MpEvent` previenen procesamiento duplicado
- **IA intercambiable**: patrón provider abstrae OpenAI vs Gemini
- **Índices bien definidos**: el schema cubre los patrones de búsqueda más comunes
- **Rate limiting global**: 500 req/15min en toda la API

### Áreas de mejora potencial

- **Repositories incompletos**: solo `article` y `user` tienen repository pattern; los demás controladores usan Prisma directamente
- **Socket.IO limitado**: solo cubre lobbies de eventos; las notificaciones podrían beneficiarse de WebSocket
- **Jobs mínimos**: BullMQ está configurado pero solo tiene un job (email reminders)
- **`db push` en producción**: riesgo en ambientes multi-instancia; migrar a `migrate deploy` sería más seguro
- **Migración de logging**: la mayoría de controladores usan `console.error`; el estándar es `logger.error()` de Pino (los middleware críticos ya fueron corregidos)
- **Legacy endpoint**: `/profile/update` (POST) coexiste con `/api/auth/me` (PUT) — duplicidad de lógica

---

## 14. Flujo de Datos — Publicar un Artículo

```
Usuario escribe en RichTextEditor
        │
        ▼
AIEditorPanel (sugerencias opcionales)
        │
        ▼
Usuario hace clic en "Publicar"
        │
AIValidationPanel → POST /api/ai/validate
        │
        ▼ (si validación pasa)
POST /api/articles
  → authMiddleware (JWT)
  → verifyCsrf
  → checkTier (si requiere tier mínimo)
  → articleController.create()
        │
        ├→ Prisma: Article.create({ status: 'draft' })
        ├→ notificationService → Notification para seguidores
        └→ res.json({ ok: true, article })
                │
                ▼
        ArticleView.jsx renderiza el artículo
        PaginatedReader.jsx trackea progreso
        POST /api/reading-progress (al hacer scroll)
```

---

## 15. Atributos de Calidad — ISO/IEC 25010

El modelo ISO/IEC 25010 define las características de calidad del software. A continuación se documenta el estado real de cada atributo en este sistema.

### 15.1 Adecuación Funcional

| Sub-característica | Evidencia |
|-------------------|-----------|
| Completitud funcional | 26 rutas REST cubren todos los dominios del negocio |
| Corrección funcional | Validación en `validationMiddleware.js` + lógica de negocio en services |
| Pertinencia | Cada endpoint tiene un propósito único; no hay endpoints huérfanos documentados |

### 15.2 Eficiencia de Desempeño

| Atributo | Implementación | Objetivo |
|----------|---------------|---------|
| Tiempo de respuesta | Índices Prisma en columnas de alta cardinalidad | < 200 ms P95 en queries simples |
| Utilización de recursos | Rate limiting 500 req/15 min (`generalLimiter`) | Protege recursos ante picos |
| Capacidad | PostgreSQL en Neon (escalado automático) | Hasta 10 000 usuarios concurrentes por plan |

**Estrategia de caché (actual):** No hay caché de aplicación implementado. Las queries se ejecutan directamente contra PostgreSQL. Área de mejora: Redis para datos calientes (feed, conteos de reacciones).

### 15.3 Compatibilidad

- **Co-existencia**: Frontend (Vercel) y Backend (Render) son procesos independientes — sin acoplamiento de runtime
- **Interoperabilidad**: API REST sobre HTTP/1.1; OAuth 2.0 (RFC 6749) para integración con Google, GitHub, Azure AD
- **Portabilidad de IA**: Cliente unificado `aiClient.js` abstrae OpenAI y Gemini — intercambiables sin cambiar código consumidor

### 15.4 Usabilidad

- Manejo de errores consistente devuelve mensajes legibles al usuario (no stack traces)
- Modo oscuro/claro via `DarkModeContext`
- i18n via `LanguageContext` + archivos en `src/locales/`
- Accesibilidad: **WCAG 2.1 AA** — pendiente auditoría formal

### 15.5 Fiabilidad

| Atributo | Implementación |
|----------|---------------|
| Disponibilidad | Render y Vercel con SLA de 99.9% en planes pagos |
| Tolerancia a fallos | Global error handler en `index.js:305-313` — el servidor no cae ante errores no manejados |
| Recuperabilidad | BullMQ con Redis persiste jobs no procesados ante reinicios |
| Idempotencia de pagos | Tablas `StripeEvent` y `MpEvent` previenen doble procesamiento |

**RTO/RPO objetivo (sin DR formal implementado):**
- RTO: < 15 min (Render reinicia el servicio automáticamente)
- RPO: < 24 h (backups automáticos de Neon PostgreSQL en plan pago)

### 15.6 Seguridad

Ver sección 16 (OWASP Top 10) para el mapeo completo.

| Atributo | Implementación |
|----------|---------------|
| Confidencialidad | JWT en httpOnly cookies — inaccesible desde JavaScript |
| Integridad | CSRF double-submit cookie en todas las mutaciones |
| No repudio | `tokenVersion` en User — invalida sesiones anteriores al cambiar contraseña |
| Autenticidad | `bcryptjs` para hashing de passwords; firma JWT con `JWT_SECRET` |
| Responsabilidad | Morgan + Pino logean todas las requests HTTP con timestamp |

### 15.7 Mantenibilidad

| Atributo | Implementación |
|----------|---------------|
| Modularidad | Capas Routes → Controllers → Services → Repositories |
| Reusabilidad | Middleware reutilizable (protect, checkTier, verifyCsrf, rateLimiters) |
| Analizabilidad | Pino con JSON estructurado en producción; pino-pretty en desarrollo |
| Modificabilidad | Provider pattern para IA — cambiar proveedor sin tocar consumidores |
| Capacidad de prueba | Vitest en frontend y backend; tests unitarios de middleware sin dependencias externas |

### 15.8 Portabilidad

- **Adaptabilidad**: Stack Node.js/React corre en cualquier entorno con Node ≥ 20
- **Instalabilidad**: `npm install` en raíz y `server/` — sin pasos manuales adicionales
- **Reemplazabilidad**: Cada servicio externo (Stripe → MP, OpenAI → Gemini, Neon → cualquier PostgreSQL) es intercambiable via variables de entorno

---

## 16. Seguridad — Mapeo OWASP Top 10 (2021)

| # | Riesgo OWASP | Estado | Mitigación implementada |
|---|-------------|--------|------------------------|
| A01 | Broken Access Control | ✅ Mitigado | `protect` (JWT), `checkTier`, `checkAdmin`, propiedad verificada por controlador |
| A02 | Cryptographic Failures | ✅ Mitigado | HTTPS en producción (Vercel/Render), bcryptjs para passwords, JWT firmado |
| A03 | Injection | ✅ Mitigado | Prisma ORM con queries parametrizadas — no hay SQL crudo |
| A04 | Insecure Design | ⚠️ Parcial | Arquitectura en capas bien definida; falta threat model formal |
| A05 | Security Misconfiguration | ✅ Mitigado | Helmet con defaults seguros, CORS whitelist estricta, env vars validadas al inicio |
| A06 | Vulnerable Components | ⚠️ Pendiente | No hay proceso automatizado de `npm audit`; se ejecuta manualmente |
| A07 | Auth Failures | ✅ Mitigado | `tokenVersion` para invalidación, httpOnly cookies, `authLimiter` (20 req/15 min) |
| A08 | Integrity Failures | ✅ Mitigado | Verificación de firma en webhooks Stripe (`stripe.webhooks.constructEvent`) |
| A09 | Logging & Monitoring Failures | ⚠️ Parcial | Pino + Morgan activos; falta alerting centralizado y correlationId por request |
| A10 | SSRF | ✅ Bajo riesgo | No hay endpoints que hagan fetch a URLs arbitrarias provistas por el usuario |

### Gestión de secretos

```
Variables sensibles declaradas en: server/.env.example
Validación en inicio:             index.js:24-35 — el servidor no arranca si faltan
Secrets en CI:                    GitHub Actions Secrets (nunca en código)
Rotación:                         Manual — no hay proceso automatizado definido (área de mejora)
```

### Rate limiting por endpoint

| Limiter | Ventana | Máximo | Endpoints |
|---------|---------|--------|-----------|
| `authLimiter` | 15 min | 20 req | Login, register |
| `checkUsernameLimiter` | 60 s | 30 req | Verificación de username |
| `passwordResetLimiter` | 15 min | 3 req | Solicitud de reset de password |
| `generalLimiter` | 15 min | 500 req | Todos los endpoints `/api/*` |

---

## 17. Estándares de API

### 17.1 Convenciones REST

El API sigue el modelo REST Level 2 (Richardson Maturity Model):
- **Level 1** ✅ — Recursos individuales por URL (`/api/articles/:id`)
- **Level 2** ✅ — Uso correcto de verbos HTTP (GET, POST, PUT, DELETE, PATCH)
- **Level 3** ✗ — Sin HATEOAS (no requerido para este tipo de SPA)

### 17.2 Formato de respuesta estándar

Todas las respuestas siguen la forma:

```json
// Éxito
{ "ok": true, "<recurso>": { ... } }
{ "ok": true, "message": "Operación completada" }

// Error de validación
{ "ok": false, "errors": ["Field X is required", "..."] }

// Error de negocio / autorización
{
  "ok": false,
  "message": "Descripción legible",
  "error": "ERROR_CODE",
  "currentTier": "OBSERVER",
  "requiredPermission": "READ_PREMIUM"
}

// Error de servidor (500)
{ "ok": false, "message": "Internal server error" }
```

El campo `error` es un código de máquina (snake_case en mayúsculas) para que el frontend pueda branching sin comparar strings de mensajes.

### 17.3 Códigos HTTP utilizados

| Código | Uso |
|--------|-----|
| 200 | GET exitoso, operaciones de actualización |
| 201 | POST que crea un recurso nuevo |
| 400 | Validación fallida (campos inválidos o faltantes) |
| 401 | Sin autenticación o token inválido |
| 403 | Autenticado pero sin permisos (tier, rol, CSRF) |
| 404 | Recurso no encontrado |
| 429 | Rate limit excedido |
| 500 | Error interno de servidor |

### 17.4 Versionado de API

**Estado actual:** sin versionado explícito en URLs (`/api/articles`, no `/api/v1/articles`).

**Estrategia adoptada:** el frontend y el backend son co-deployed — los cambios de API se coordinan en el mismo PR. Si en el futuro se requiere versionado independiente, se agregará el prefijo `/v1/` como primer segmento de ruta.

### 17.5 Paginación

Los endpoints de listado (artículos, investigaciones, eventos) admiten:

```
GET /api/articles?page=1&limit=10&category=Tech&status=published
```

La respuesta incluye metadatos de paginación cuando aplica:
```json
{ "ok": true, "articles": [...], "total": 120, "page": 1, "limit": 10 }
```

---

## 18. Estrategia de Testing

### 18.1 Pirámide de testing

```
         /\
        /E2E\          ← No implementado (Playwright/Cypress pendiente)
       /──────\
      /Integrac.\      ← No implementado (supertest + DB de test pendiente)
     /────────────\
    / Unitarios    \   ← IMPLEMENTADO
   /────────────────\
```

### 18.2 Tests unitarios — Backend (Vitest)

**Configuración:** `server/vitest.config.mjs`
**Ejecución:** `npm test` (desde `/server`) o `npm run test:backend` (desde raíz)

Archivos de test en `server/src/__tests__/`:

| Archivo | Qué prueba | Tests |
|---------|-----------|-------|
| `middleware/csrf.test.js` | Lógica completa del CSRF double-submit | 5 |
| `middleware/validation.test.js` | Validadores de artículo, evento, blog, comentario | 11 |

**Cobertura mínima objetivo:** 80% en middleware y services.

**Principios de los tests:**
- No requieren base de datos ni servicios externos
- Usan mocks de `req`/`res` de Express con `vi.fn()`
- Prueban comportamiento observable (status codes, cuerpo de respuesta), no implementación interna

### 18.3 Tests unitarios — Frontend (Vitest + Testing Library)

**Configuración:** `vite.config.js` (sección `test`)
**Ejecución:** `npm test` (desde raíz)

Setup en `src/setupTests.js`:
- `@testing-library/jest-dom` para matchers de DOM
- Mock de `window.matchMedia` para componentes con media queries

**Estado:** infraestructura configurada, tests de componentes pendientes de implementar.

### 18.4 Estrategia de mocks

Los tests unitarios **no** mockean módulos de forma global. En cambio:
- Los middlewares reciben objetos `req`/`res` construidos manualmente
- Los servicios con dependencias externas (Prisma, Stripe) serán testeados con mocks de Vitest (`vi.mock()`) cuando se implementen tests de integración

### 18.5 CI integration

Los tests corren automáticamente en GitHub Actions en cada push a `main` y en cada PR (ver sección 20).

---

## 19. Estándares de Código

### 19.1 Linter — ESLint

**Configuración:** `eslint.config.js` (ESLint v10 flat config)
**Ejecución:** `npm run lint` / `npm run lint:fix`

Reglas principales:

| Regla | Nivel | Razón |
|-------|-------|-------|
| `no-console` | `warn` | Usar `logger` de Pino en producción |
| `no-unused-vars` | `error` | Evitar dead code |
| `prefer-const` | `error` | Inmutabilidad por defecto |
| `no-var` | `error` | Scoping predecible con `let`/`const` |
| `eqeqeq` | `error` | Evitar coerciones implícitas |
| `no-throw-literal` | `error` (backend) | Solo lanzar instancias de Error |
| `react/react-in-jsx-scope` | `off` | React 17+ no requiere import |
| `react/prop-types` | `off` | Sin TypeScript; validación en runtime |

**Alcance:**
- `server/src/**/*.js` — CJS Node.js, globals de Node
- `src/**/*.{js,jsx}` — ESM browser + React + React Hooks

### 19.2 Formatter — Prettier

**Configuración:** `.prettierrc`
**Ejecución:** `npm run format` / `npm run format:check`

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### 19.3 Convenciones de nombrado

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos de componente | PascalCase | `ArticleView.jsx` |
| Archivos de utilidad/servicio | camelCase | `articleService.js` |
| Variables y funciones | camelCase | `getUserById()` |
| Constantes globales | UPPER_SNAKE_CASE | `JWT_SECRET` |
| Modelos Prisma | PascalCase | `Article`, `EventRegistration` |
| Rutas API | kebab-case | `/api/reading-progress` |
| Eventos Socket.IO | camelCase | `joinRoom`, `newMessage` |

### 19.4 Commits — Conventional Commits 1.0

Formato: `type(scope): subject`

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `chore` | Mantenimiento sin cambio funcional |
| `docs` | Documentación |
| `refactor` | Refactoring sin cambio de comportamiento |
| `test` | Agregar o corregir tests |
| `ci` | Cambios en pipeline CI/CD |

Scopes usados: `auth`, `payments`, `deploy`, `db`, `ui`, `api`, `brand`.

---

## 20. Pipeline CI/CD

### 20.1 GitHub Actions — `.github/workflows/ci.yml`

Se ejecuta en: push a `main` o `develop`, y en Pull Requests hacia `main`.

```
Push / PR
    │
    ├── Job: lint
    │     ├── npm ci --legacy-peer-deps
    │     ├── npm run lint          ← ESLint sobre src/ y server/src/
    │     └── npm run format:check  ← Prettier en modo check
    │
    ├── Job: test-frontend
    │     ├── npm ci --legacy-peer-deps
    │     └── npm test              ← Vitest frontend
    │
    └── Job: test-backend
          ├── cd server && npm ci
          └── npm test              ← Vitest backend (16 tests)
```

**Variables de entorno en CI:**
Los secrets sensibles (JWT_SECRET, DATABASE_URL, keys de APIs) se configuran en **GitHub Actions Secrets** — nunca en el repositorio. El CI de tests de backend usa valores stub que no acceden a servicios reales.

### 20.2 Deploy — Flujo actual

```
main branch
    │
    ├── Vercel (auto-deploy en push)
    │     ├── npm run build  → Vite → dist/
    │     ├── Output: React SPA estática
    │     └── vercel.json: rewrites /* → /index.html
    │
    └── Render (auto-deploy en push)
          ├── npm install && npx prisma generate
          ├── prisma db push  ← sincroniza schema con Neon
          └── node server/src/index.js
```

### 20.3 Estrategia de rollback

**Vercel:** rollback instantáneo a cualquier deployment anterior desde el dashboard.
**Render:** re-deploy del commit anterior via UI o git revert + push.

**Pendiente:** blue-green deployment o canary releases para cambios de schema riesgosos.

---

## 21. Cumplimiento 12-Factor App

| Factor | Descripción | Estado | Evidencia |
|--------|-------------|--------|-----------|
| I. Codebase | Un repositorio, múltiples deploys | ✅ | Mono-repo raíz → Vercel + Render |
| II. Dependencias | Declaradas explícitamente, sin asumir globales | ✅ | `package.json` + `server/package.json` con lockfiles |
| III. Config | Config en variables de entorno | ✅ | `server/.env.example` (40+ vars), validación en `index.js:24-35` |
| IV. Backing services | Tratados como recursos adjuntos | ✅ | PostgreSQL, Redis, Stripe, email — todos via URL/key en env |
| V. Build/release/run | Fases separadas | ⚠️ | Build y start están combinados en Render (`npm install && node`) |
| VI. Procesos | Sin estado, sin sticky sessions | ✅ | JWT en cookies, no hay sesión en memoria del servidor |
| VII. Port binding | El servidor exporta su propio servicio HTTP | ✅ | `app.listen(PORT)` en `index.js:318` |
| VIII. Concurrencia | Escalar via procesos | ✅ | Express sin estado — puede correr múltiples instancias |
| IX. Descartabilidad | Inicio rápido, shutdown limpio | ✅ | BullMQ cierra conexiones; Express cierra el servidor |
| X. Dev/Prod parity | Entornos lo más similares posible | ⚠️ | Dev usa SQLite/Neon local vs Neon prod; Redis puede diferir |
| XI. Logs | Tratar logs como streams de eventos | ✅ | Pino emite JSON a stdout; Morgan a `logger.info()` |
| XII. Admin processes | Ejecutar tareas admin como procesos únicos | ✅ | `prisma db push` como proceso de inicio separado |

---

## 22. Gestión de Dependencias

### 22.1 Versiones

| Paquete crítico | Versión | Política de update |
|----------------|---------|-------------------|
| Express | 4.18.2 | Seguir LTS de Node.js |
| Prisma | 5.0.0 | Actualizar en minor releases con revisión de migration |
| Stripe | 22.1.0 | Actualizar cuando Stripe deprece endpoints usados |
| Socket.IO | 4.8.1 | Mantener paridad cliente/servidor |
| Vitest | 2.1.6 (frontend) / 4.1.11 (backend) | Actualizar por major |

### 22.2 Auditoría de seguridad

```bash
# Ejecutar manualmente antes de cada release
npm audit
cd server && npm audit
```

**Objetivo:** cero vulnerabilidades de severidad `high` o `critical` en producción.
**Pendiente:** automatizar `npm audit` como paso obligatorio en el CI pipeline.

### 22.3 Gestión de peer deps

ESLint v10 y `eslint-plugin-react` tienen conflicto de peer deps (el plugin requiere ESLint ≤ 9). Se instala con `--legacy-peer-deps`. Este flag está documentado en el CI para que el install no falle.

---

## 23. Manejo de Errores — Estándar

### 23.1 Global error handler

`server/src/index.js:305-313` captura cualquier error no manejado en Express:

```javascript
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error')
  res.status(err.status || 500).json({
    ok: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  })
})
```

En producción el stack trace nunca se expone al cliente.

### 23.2 Jerarquía de manejo de errores

```
Express Router
    │
    ├── Middleware (protect, checkTier, verifyCsrf)
    │     └── Errores conocidos → res.status(4xx).json({ ok: false, ... })
    │
    ├── Controller
    │     ├── Errores de validación → 400 con errors[]
    │     ├── Not found → 404
    │     └── catch(error) → logger.error() + 500
    │
    └── Global error handler (catch-all)
          └── Cualquier error no capturado → 500 sin detalles en prod
```

### 23.3 Formato de error de negocio con código de máquina

Para errores donde el frontend necesita ramificar lógica (ej: mostrar modal de upgrade de plan):

```json
{
  "ok": false,
  "message": "Se requiere suscripción RESEARCHER para acceder a este contenido",
  "error": "PLAN_REQUIRED",
  "currentTier": "OBSERVER",
  "requiredPermission": "READ_RESEARCH"
}
```

El campo `error` es procesable por código. El campo `message` es para mostrar al usuario.

### 23.4 Dead letter queue (BullMQ)

Jobs fallidos en BullMQ quedan en estado `failed` en Redis. No hay dead letter queue configurada explícitamente — los jobs fallidos se pueden reinspeccionar y re-encolar manualmente via Bull Board (pendiente de implementar).

---

## 24. Recuperación ante Desastres

### 24.1 Backups de base de datos

**Neon PostgreSQL:**
- Backups automáticos en planes pagos (point-in-time recovery hasta 7 días)
- Para restauración: `pg_restore` o Neon console

**Redis (BullMQ):**
- Los jobs persistidos sobreviven reinicios si Redis usa AOF persistence
- En el plan de Render, Redis se reinicia sin persistencia — los jobs pendientes se pierden ante caídas largas

### 24.2 Procedimiento de recuperación

```
1. Verificar estado en Render dashboard (backend) y Vercel (frontend)
2. Si el backend está caído:
   a. Revisar logs en Render → "Logs" tab
   b. Verificar variables de entorno (DATABASE_URL, JWT_SECRET)
   c. Forzar re-deploy desde Render dashboard
3. Si la base de datos está corrupta:
   a. Acceder a Neon console → "Branches" → restaurar desde backup
   b. Actualizar DATABASE_URL si cambió el endpoint
   c. Ejecutar prisma db push para verificar schema
4. Verificar que los webhooks de Stripe apuntan al nuevo endpoint si cambió la URL
```

### 24.3 Objetivos (informales)

| Métrica | Objetivo |
|---------|---------|
| RTO (Recovery Time Objective) | < 30 min para fallas de infraestructura |
| RPO (Recovery Point Objective) | < 24 h (último backup de Neon) |
| Disponibilidad objetivo | 99.5% mensual |
