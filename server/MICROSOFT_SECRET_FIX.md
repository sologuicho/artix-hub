# 🔧 Solución: Error de Microsoft Client Secret

## ❌ El Problema

El error dice:
```
Invalid client secret provided. Ensure the secret being sent in the request 
is the client secret value, not the client secret ID
```

Esto significa que estás usando el **Secret ID** en lugar del **Secret Value**.

## 🔍 Cómo Identificar el Problema

En Azure Portal, cuando creas un Client Secret, ves DOS valores diferentes:

1. **Secret ID** (GUID) - Ejemplo: `8d56a59a-eb31-4056-8941-4fa502d01bf9`
   - ❌ Este NO es el que necesitas
   - Es solo un identificador

2. **Secret Value** (Cadena larga) - Ejemplo: `abc123~XYZ789-def456_ghi012`
   - ✅ Este ES el que necesitas
   - Solo se muestra UNA VEZ cuando lo creas

## ✅ Solución: Obtener el Secret Value Correcto

### Opción 1: Si ya lo copiaste antes
- Busca en tus notas o donde lo guardaste
- El Secret Value es una cadena larga, no un GUID

### Opción 2: Crear un nuevo Secret (Recomendado)

1. **Ve a Azure Portal**
   - https://portal.azure.com/
   - Azure Active Directory > App registrations
   - Busca tu app: `bae3847b-8e15-4646-9417-2de99d4b6c50`

2. **Ve a "Certificates & secrets" (Certificados y secretos)**
   - Menú lateral izquierdo

3. **Crea un nuevo Client Secret**
   - Click en "+ New client secret"
   - Description: "Artix Hub Secret" (o cualquier nombre)
   - Expires: Elige una fecha (recomendado: 24 meses)
   - Click en "Add"

4. **⚠️ IMPORTANTE: Copia el VALUE inmediatamente**
   - Verás una tabla con:
     - **Name** (nombre que le diste)
     - **Value** ← **ESTE ES EL QUE NECESITAS**
     - **Expires** (fecha de expiración)
   - El **Value** es una cadena larga tipo: `abc123~XYZ789-def456_ghi012`
   - ⚠️ **Solo se muestra UNA VEZ** - cópialo inmediatamente
   - Si lo pierdes, tendrás que crear otro

5. **Elimina el Secret anterior (opcional)**
   - Si el anterior no funcionaba, puedes eliminarlo
   - O déjalo expirar

## 📝 Actualizar el .env

Una vez que tengas el **Secret Value** correcto (no el ID), actualiza el `.env`:

```env
MICROSOFT_CLIENT_SECRET=el-secret-value-aqui-no-el-id
```

El Secret Value típicamente se ve así:
- Longitud: ~40-50 caracteres
- Puede contener letras, números, guiones, guiones bajos, tildes
- Ejemplo: `~abc123XYZ789-def456_ghi012jkl345`

## 🔄 Reiniciar el Servidor

Después de actualizar el `.env`:

```bash
cd artix-hub/server
# Detener el servidor actual
pkill -f "nodemon.*src/index.js"

# Reiniciar
npm run dev
```

## ✅ Verificación

Después de reiniciar, intenta de nuevo:
- Ve a: `http://localhost:4000/auth/microsoft`
- Debería redirigirte a Microsoft sin errores

## 🆘 Si sigues teniendo problemas

1. Verifica que copiaste el **Value** completo (sin espacios)
2. Verifica que no haya caracteres extra al inicio/final
3. Asegúrate de que el Secret esté **habilitado** (Status: Enabled)
4. Verifica que la URL de callback esté configurada en Azure







