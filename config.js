const config = {};

config.user     = process.env.DB_USER || 'postgres'
config.password = process.env.DB_PASS || ''
config.host     = process.env.DB_HOST || 'localhost'
config.port     = 5432
config.database = process.env.DB_NAME || 'displacement_map'

module.exports = config;
