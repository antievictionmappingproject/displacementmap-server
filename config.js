var config = {};

config.db = {};

config.db.user = process.env.DB_USER || 'antievictionmap';
config.db.pass = process.env.DB_PASS || 'deathly_hallows';
config.db.host = process.env.DB_HOST || 'aemp.cyhe3h4dkx9j.us-west-1.rds.amazonaws.com';
config.db.port = process.env.DB_PORT || 5432;
config.db.name = process.env.DB_NAME || 'aemp';

module.exports = config;
