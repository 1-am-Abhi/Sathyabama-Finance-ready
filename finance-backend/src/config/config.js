require('dotenv').config();
const { makeSequelizeOptions } = require('./sequelizeOptions');

const sequelizeOptions = makeSequelizeOptions();

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    ...sequelizeOptions
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    ...sequelizeOptions
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    ...sequelizeOptions
  }
};
