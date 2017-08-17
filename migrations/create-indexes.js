const models = require('../models/models'),
    { Address, Ellis, BlockLotEllis, knex } = models;

const _ = require('lodash');

[Address, Ellis, BlockLotEllis].forEach(model => {
  const { tableName, idColumn } = model;

  knex.raw(`SELECT * FROM pg_indexes WHERE tablename = '${tableName}';`).then( resp => {
    if (resp.rows.length === 0) {
      console.log(`no indexes on ${tableName} yet`);
      return knex.schema.table(tableName, table => {
        if (_.isString(idColumn)) {
          table.index(idColumn);
        } else if (_.isArray(idColumn)) {
          idColumn.forEach(col => table.index(col));
        }
      })
    } else {
      console.log(`${tableName} already indexed`);
    }
  }).then( result => {
    if (result) {
      console.log(`indexes added on ${tableName}`);
    }
  });
});
