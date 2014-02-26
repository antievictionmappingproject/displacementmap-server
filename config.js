var config = {}

config.db = {};

config.db.user = process.env.DB_USER || 'postgres'
config.db.pass = process.env.DB_PASS || ''
config.db.host = process.env.DB_HOST || 'localhost'
config.db.port = 5432
config.db.name = process.env.DB_NAME || 'postgres'

module.exports = config;