# Fase 1 - Instrucciones de Configuración

## ✅ Completado

La Fase 1 ha sido implementada con éxito. Se han creado:

1. ✅ **Schema de Prisma actualizado** con todos los modelos:
   - User (actualizado con nuevos campos)
   - Article
   - Event
   - BlogPost
   - Discussion
   - Comment
   - EventRegistration

2. ✅ **Endpoints CRUD implementados**:
   - `/api/articles` - CRUD completo + comentarios
   - `/api/events` - CRUD completo + registro
   - `/api/blog` - CRUD completo

3. ✅ **Middleware de validación** para todos los endpoints

4. ✅ **OAuth conectado** entre frontend y backend

5. ✅ **AuthContext actualizado** para usar endpoint `/me`

## 📋 Pasos para Completar la Configuración

### 1. Ejecutar Migraciones de Base de Datos

```bash
cd artix-hub/server
npx prisma migrate dev --name add_all_models
```

Esto creará todas las tablas en tu base de datos PostgreSQL.

### 2. Generar Prisma Client

```bash
npx prisma generate
```

### 3. Verificar Variables de Entorno

Asegúrate de que tu archivo `.env` en `server/` tenga:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/artix_db"
JWT_SECRET="your-secret-key-here"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:4000"
```

### 4. Variables de Entorno del Frontend

Crea un archivo `.env.local` en `artix-hub/` con:

```env
VITE_BACKEND_URL=http://localhost:4000
```

### 5. Reiniciar Servidores

```bash
# Terminal 1 - Backend
cd artix-hub/server
npm run dev

# Terminal 2 - Frontend
cd artix-hub
npm run dev
```

## 🧪 Probar los Endpoints

### Artículos

```bash
# Listar artículos
curl http://localhost:4000/api/articles

# Crear artículo (requiere autenticación)
curl -X POST http://localhost:4000/api/articles \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Mi Primer Artículo",
    "content": "Contenido del artículo...",
    "category": "AI Research",
    "tags": ["ai", "research"]
  }'
```

### Eventos

```bash
# Listar eventos
curl http://localhost:4000/api/events

# Crear evento (requiere autenticación)
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Conferencia de IA",
    "description": "Descripción del evento...",
    "date": "2024-12-15T10:00:00Z",
    "location": "Virtual",
    "type": "Conferencia"
  }'
```

### Blog

```bash
# Listar posts
curl http://localhost:4000/api/blog

# Crear post (requiere autenticación)
curl -X POST http://localhost:4000/api/blog \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Mi Primer Post",
    "content": "Contenido del post...",
    "category": "Announcements"
  }'
```

## 🔐 Autenticación OAuth

1. Configura las credenciales OAuth en tu `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`

2. Los botones OAuth en el frontend ahora redirigen correctamente al backend.

3. Después de autenticarse, el usuario será redirigido a `/auth/callback` y luego al dashboard o setup de perfil.

## 📝 Notas Importantes

- **CSRF Protection**: Todas las rutas POST/PUT/DELETE requieren el header `x-csrf-token`
- **Autenticación**: Las rutas protegidas requieren la cookie `session`
- **Validación**: Los campos requeridos son validados antes de crear/actualizar
- **Permisos**: Solo el autor o un admin puede editar/eliminar contenido

## 🐛 Solución de Problemas

### Error: "Table does not exist"
- Ejecuta las migraciones: `npx prisma migrate dev`

### Error: "Prisma Client not generated"
- Ejecuta: `npx prisma generate`

### Error: "CORS error"
- Verifica que `FRONTEND_URL` en `.env` coincida con tu URL del frontend

### Error: "Authentication failed"
- Verifica que las cookies se estén enviando (credentials: 'include')
- Verifica que el JWT_SECRET esté configurado

## ✅ Próximos Pasos (Fase 2)

Una vez que la Fase 1 esté funcionando:

1. Implementar subida de archivos (imágenes, PDFs)
2. Conectar frontend con los nuevos endpoints
3. Reemplazar datos mock con llamadas reales a la API
4. Implementar paginación y filtros en el frontend

