# 🔐 Guía de Configuración OAuth - Google, Microsoft y GitHub

Esta guía te explica paso a paso cómo obtener las credenciales necesarias para cada proveedor OAuth.

---

## 📋 Resumen de Credenciales Necesarias

Para cada proveedor necesitas:
- **Client ID** (público)
- **Client Secret** (privado - nunca lo compartas)
- **Callback URL** configurada en el proveedor

---

## 🔵 1. GOOGLE OAUTH

### Credenciales necesarias:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Pasos para obtenerlas:

1. **Ve a Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Inicia sesión con tu cuenta de Google

2. **Crea un nuevo proyecto (o selecciona uno existente)**
   - Click en el selector de proyectos (arriba)
   - Click en "NUEVO PROYECTO"
   - Nombre: "Artix Hub" (o el que prefieras)
   - Click en "CREAR"

3. **Habilita Google+ API**
   - En el menú lateral: "APIs y servicios" > "Biblioteca"
   - Busca "Google+ API" o "Google Identity"
   - Click en "HABILITAR"

4. **Crea credenciales OAuth 2.0**
   - Ve a "APIs y servicios" > "Credenciales"
   - Click en "+ CREAR CREDENCIALES" > "ID de cliente de OAuth 2.0"
   - Tipo de aplicación: "Aplicación web"
   - Nombre: "Artix Hub Web Client"

5. **Configura las URLs autorizadas**
   - **Orígenes JavaScript autorizados:**
     ```
     http://localhost:5173
     http://localhost:4000
     ```
   - **URI de redirección autorizados:**
     ```
     http://localhost:4000/auth/google/callback
     ```
   - ⚠️ **IMPORTANTE:** Para producción, agrega también:
     ```
     https://tudominio.com/auth/google/callback
     ```

6. **Copia las credenciales**
   - Después de crear, verás:
     - **ID de cliente** → Este es tu `GOOGLE_CLIENT_ID`
     - **Secreto de cliente** → Este es tu `GOOGLE_CLIENT_SECRET`
   - ⚠️ **Guarda el secreto inmediatamente**, solo se muestra una vez

7. **Agrega al archivo `.env`**
   ```env
   GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-client-secret-aqui
   ```

---

## 🟢 2. GITHUB OAUTH

### Credenciales necesarias:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### Pasos para obtenerlas:

1. **Ve a GitHub Settings**
   - URL: https://github.com/settings/developers
   - O: Tu perfil > Settings > Developer settings

2. **Crea una nueva OAuth App**
   - Click en "OAuth Apps" (menú lateral izquierdo)
   - Click en "New OAuth App"

3. **Completa el formulario**
   - **Application name:** Artix Hub
   - **Homepage URL:**
     ```
     http://localhost:5173
     ```
   - **Authorization callback URL:**
     ```
     http://localhost:4000/auth/github/callback
     ```
   - ⚠️ **IMPORTANTE:** Para producción, usa:
     ```
     https://tudominio.com/auth/github/callback
     ```

4. **Copia las credenciales**
   - Después de crear, verás:
     - **Client ID** → Este es tu `GITHUB_CLIENT_ID`
     - **Client Secret** → Click en "Generate a new client secret"
     - Copia el secreto → Este es tu `GITHUB_CLIENT_SECRET`
   - ⚠️ **Guarda el secreto inmediatamente**

5. **Agrega al archivo `.env`**
   ```env
   GITHUB_CLIENT_ID=tu-client-id-aqui
   GITHUB_CLIENT_SECRET=tu-client-secret-aqui
   ```

---

## 🔷 3. MICROSOFT OAUTH (Azure AD)

### Credenciales necesarias:
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

### Pasos para obtenerlas:

1. **Ve a Azure Portal**
   - URL: https://portal.azure.com/
   - Inicia sesión con tu cuenta de Microsoft

2. **Crea un nuevo registro de aplicación**
   - Busca "Azure Active Directory" en la barra de búsqueda
   - Click en "App registrations" (Registros de aplicaciones)
   - Click en "+ New registration" (Nuevo registro)

3. **Configura la aplicación**
   - **Name:** Artix Hub
   - **Supported account types:** 
     - Selecciona: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI:**
     - Platform: Web
     - URL: `http://localhost:4000/auth/microsoft/callback`
   - Click en "Register"

4. **Copia el Client ID**
   - En la página de Overview verás:
     - **Application (client) ID** → Este es tu `MICROSOFT_CLIENT_ID`
   - Cópialo

5. **Crea un Client Secret**
   - Ve a "Certificates & secrets" (Certificados y secretos)
   - Click en "+ New client secret"
   - Description: "Artix Hub Secret"
   - Expires: Elige una fecha (recomendado: 24 meses)
   - Click en "Add"
   - ⚠️ **IMPORTANTE:** Copia el **Value** inmediatamente (solo se muestra una vez)
     - Este es tu `MICROSOFT_CLIENT_SECRET`

6. **Configura las URLs de redirección**
   - Ve a "Authentication" (Autenticación)
   - En "Redirect URIs", agrega:
     ```
     http://localhost:4000/auth/microsoft/callback
     ```
   - Para producción:
     ```
     https://tudominio.com/auth/microsoft/callback
     ```
   - Click en "Save"

7. **Agrega al archivo `.env`**
   ```env
   MICROSOFT_CLIENT_ID=tu-client-id-aqui
   MICROSOFT_CLIENT_SECRET=tu-client-secret-aqui
   ```

---

## 📝 Configuración Final en `.env`

Una vez que tengas todas las credenciales, tu archivo `.env` en `server/` debería verse así:

```env
# Database
DATABASE_URL=postgresql://luisflores@localhost:5432/artix_db

# JWT
JWT_SECRET=tu-secret-key-super-segura-aqui

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=tu-github-client-id
GITHUB_CLIENT_SECRET=tu-github-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=tu-microsoft-client-id
MICROSOFT_CLIENT_SECRET=tu-microsoft-client-secret

# Server
PORT=4000
NODE_ENV=development
```

---

## ✅ Verificación

Después de configurar todo, reinicia el servidor:

```bash
cd artix-hub/server
npm run dev
```

Deberías ver mensajes como:
- ✅ `Google OAuth configured` (si configuraste Google)
- ✅ `GitHub OAuth configured` (si configuraste GitHub)
- ✅ `Microsoft OAuth configured` (si configuraste Microsoft)

O advertencias si falta alguna:
- ⚠️ `Google OAuth not configured (missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or BACKEND_URL)`

---

## 🔒 Seguridad

1. **NUNCA** subas el archivo `.env` a Git
2. Asegúrate de que `.env` esté en `.gitignore`
3. Los **Client Secrets** son información sensible
4. Para producción, usa variables de entorno del servidor, no archivos `.env`

---

## 🐛 Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que la URL de callback en el proveedor coincida exactamente con la del código
- Incluye el protocolo (`http://` o `https://`)
- Verifica que no haya espacios o caracteres extra

### Error: "invalid_client"
- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de que no haya espacios al copiar/pegar

### Error: "access_denied"
- El usuario canceló la autenticación
- O la aplicación no tiene los permisos necesarios

---

## 📚 Recursos Adicionales

- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2
- **GitHub OAuth:** https://docs.github.com/en/apps/oauth-apps
- **Microsoft OAuth:** https://docs.microsoft.com/en-us/azure/active-directory/develop/

---

## 💡 Nota Importante

**No necesitas configurar los 3 proveedores.** Puedes configurar solo los que necesites:
- Si solo quieres Google → Solo configura `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
- El servidor funcionará con los proveedores que tengas configurados
- Los botones de los proveedores no configurados simplemente no funcionarán

