require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || '';

const databaseUrlRequiresSsl = (() => {
  if (!databaseUrl) return false;
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_SSL === 'true') return true;

  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get('sslmode');
    if (sslMode && sslMode !== 'disable') return true;
    return !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
})();

const sharedDatabaseOptions = databaseUrlRequiresSsl
  ? {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
        keepAlive: true,
      },
    }
  : {};

const schemaOptions = process.env.DB_SCHEMA
  ? {
      schema: process.env.DB_SCHEMA,
      migrationStorageTableSchema: process.env.DB_SCHEMA,
    }
  : {};

module.exports = {
  development: {
    dialect: 'postgres',
    use_env_variable: 'DATABASE_URL',
    ...sharedDatabaseOptions,
    ...schemaOptions,
    logging: false,
  },
  test: {
    dialect: 'postgres',
    use_env_variable: 'DATABASE_URL',
    ...sharedDatabaseOptions,
    ...schemaOptions,
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      keepAlive: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    ...schemaOptions,
    logging: false,
  },
};
