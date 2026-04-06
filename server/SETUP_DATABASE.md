# Configuración de Base de Datos

## ⚠️ PostgreSQL no está corriendo

Para ejecutar las migraciones, necesitas tener una base de datos PostgreSQL disponible.

## Opciones

### Opción 1: Usar Supabase (Recomendado - Gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a Settings > Database
4. Copia la "Connection String" (URI)
5. Actualiza tu `.env`:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
```

### Opción 2: Usar Railway (Gratis)

1. Ve a [railway.app](https://railway.app)
2. Crea un nuevo proyecto
3. Agrega PostgreSQL
4. Copia la DATABASE_URL
5. Actualiza tu `.env`

### Opción 3: PostgreSQL Local

#### macOS (con Homebrew):
```bash
brew install postgresql@14
brew services start postgresql@14
createdb artix_db
```

#### Linux:
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb artix_db
```

#### Windows:
- Descarga desde [postgresql.org](https://www.postgresql.org/download/windows/)
- Instala y crea la base de datos `artix_db`

## Después de configurar la base de datos

Una vez que tengas PostgreSQL corriendo:

```bash
cd artix-hub/server
npx prisma migrate dev --name add_all_models
npx prisma generate
```

## Verificar conexión

```bash
npx prisma db pull
```

Si funciona, la conexión está correcta.

