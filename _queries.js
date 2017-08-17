var _ = require('lodash');

Ellis.query().then( ellises => {
  var byPetition = _.map(ellises, 'petition');
  console.log('ellises.length', ellises.length);
  console.log('byPetition.length', byPetition.length);
  var uniqByPetition = _.uniq(byPetition);
  console.log('uniqByPetition.length', uniqByPetition.length);
});

BlockLotEllis.query().then( ble => {
  console.log('ellises.length', ble.length);
  console.log('ble[0]', ble[0]);
})


BlockLotEllis.query().joinRelation('ellisActiEviction').then( blk_lots => {
  var blk_lot = blk_lots.find( blk_lot => blk_lot.petition === 'L010044');
  console.log(blk_lot)
})

var e = new Ellis();
var r;
e.$relatedQuery('ellisActEviction').then(a => r = a);


// Ellises
"select blklot_ellis.petition, units, landlord, date, protected, dirty_dozen, address, latitude::text || '|' || longitude::text AS loc from blklot_ellis join ellis_act_evictions on (blklot_ellis.petition = ellis_act_evictions.petition) join address_blklot on (blklot_ellis.blk_lot = address_blklot.blk_lot) order by (address_blklot.latitude, address_blklot.longitude)"
// blklot_ellis
// ellis_act_evictions
// address_blklot
// 2975 rows
// petition, units, landlord, date, protected, dirty_dozen, address, loc
"select * from ellis_act_evictions as ellis "

// OMIs
"select blklot_omi.petition, unit, date, omi_evictions.address, address_blklot.address, latitude::text || '|' || longitude::text AS loc from blklot_omi join omi_evictions on (blklot_omi.petition = omi_evictions.petition) join address_blklot on (blklot_omi.blk_lot = address_blklot.blk_lot) order by (address_blklot.latitude, address_blklot.longitude)"
