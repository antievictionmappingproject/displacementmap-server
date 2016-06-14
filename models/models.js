var config = require('./config');
var knex = require('knex')({
  client: 'pg',
  connection: {
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.pass,
    database : config.db.name,
    charset  : 'utf8'
  }
});

var bookshelf = require('bookshelf')(knex);

var Ellis = bookshelf.Model.extend({
  tableName: 'ellis_act_evictions',
  idAttribute: 'petition',
  addresses: function() {
    return this.belongsToMany(Address).through(BlockLotEllis);
  }
});

var Address = bookshelf.Model.extend({
  tableName: 'address_blklot',
  ellisEvictions: function() {
    return this.belongsToMany(Ellis).through(BlockLotEllis);
  }
});

var BlockLotEllis = bookshelf.Model.extend({
  tableName: 'blklot_ellis',
  // idAttribute:
  ellisEviction: function() {
    return this.belongsTo(Ellis, 'ellis_act_evictions', 'petition');
  },
  addresses: function() {
    return this.belongsTo(Address, 'address_blklot', 'blk_lot');
  }
});
var streetName = 'BUCHANAN';
var streetType = 'ST';
var addrNum = 1010;
var result;
Address.where({st_name: streetName, st_type: streetType, addr_num: addrNum}).fetch().then(function(model) {
  var blockLot = model.get('blk_lot');
  return Address.where({blk_lot: blockLot}).fetchAll();
}).then(function(collection) {
  result = collection;
});

/*
addr = new Address({st_name: 'BUCHANAN', st_type: 'ST', addr_num: 1010}).fetch()

new Ellis({petition: 'L071209'}).fetch()

Address
  .query({where: {st_name: 'BUCHANAN', st_type: 'ST', addr_num: 1010}})
  .fetchOne({columns: ['blk_lot', 'address', 'latitude', 'longitude'] });
"SELECT blk_lot, address, latitude, longitude FROM address_blklot WHERE blk_lot IN " +
  "(SELECT blk_lot FROM address_blklot WHERE (st_name:: text || ' ' || st_type:: text) = $1::text and addr_num = $2::integer)",
  [streetName.toUpperCase().trim(),
  streetNumber.trim()]).then(fun

new Address.where('blk_lot', 'IN', )

var streetName = 'BUCHANAN'.toUpperCase().trim()
var streetType = 'ST'.toUpperCase().trim()
var addrNum = 1010;

"SELECT distinct(ellis_act_evictions.petition), ellis_act_evictions.dirty_dozen, ellis_act_evictions.date, ellis_act_evictions.protected, ellis_act_evictions.landlord, ellis_act_evictions.units from ellis_act_evictions join blklot_ellis on (blklot_ellis.petition = ellis_act_evictions.petition) where blklot_ellis.blk_lot IN(" + blk_lotParams.join(',') + ')',
  blk_lots

1 ellis_act_evictions
  tied by blklot_ellis
can cover
2 address_blklot

var ellises = dbQuery("select blklot_ellis.petition, units, landlord, date, protected, dirty_dozen, address, latitude::text || '|' || longitude::text AS loc from blklot_ellis JOIN ellis_act_evictions on (blklot_ellis.petition = ellis_act_evictions.petition) JOIN address_blklot on (blklot_ellis.blk_lot = address_blklot.blk_lot) order by (address_blklot.latitude, address_blklot.longitude)",
  []).then(function(result) {
    var query_rows = result.rows
    return _.groupBy(query_rows, "loc");
  });

  var omis = dbQuery("select blklot_omi.petition, unit, date, omi_evictions.address, address_blklot.address, latitude::text || '|' || longitude::text AS loc from blklot_omi JOIN omi_evictions on (blklot_omi.petition = omi_evictions.petition) join address_blklot on (blklot_omi.blk_lot = address_blklot.blk_lot) order by (address_blklot.latitude, address_blklot.longitude)",
*/
