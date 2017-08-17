const _ = require('lodash'),
      test = require('tape');

const models = require('../models/models'),
    { Address, Ellis, BlockLotEllis, Pledge } = models,
    { Addresses, Ellises, BlockLotEllises } = models;

test('test some more sql', assert => {
  /*
  SELECT
    blklot_ellis.petition,
    units,
    landlord,
    date,
    protected,
    dirty_dozen,
    address,
    latitude::text || '|' || longitude::text AS loc
  FROM blklot_ellis
  JOIN ellis_act_evictions
    ON (blklot_ellis.petition = ellis_act_evictions.petition)
  JOIN address_blklot
    ON (blklot_ellis.blk_lot = address_blklot.blk_lot)
  ORDER BY (address_blklot.latitude, address_blklot.longitude)

  // generates 2975 rows
*/
  assert.end();
});

test.skip('makePledge', assert => {
  // stuff
});

test.skip('constructPledge', assert => {
  // stuff
});

test('getPledges', assert => {
  // console.log('fdasfds');
  // const limit = 10,
  //       offset = 20;
  // Pledge.query()
  //   .select('first_name', 'last_name', 'reason', 'anonymous', 'pledge_timestamp')
  //   .orderBy('pledge_timestamp', 'desc')
  //   .offset(offset)
  //   .limit(limit)
  //   .then( collection => {
  //     debugger
  //     // const blockLot = collection[0].blk_lot;
  //     // return Address.query().where({blk_lot: blockLot});
  //     assert.end();
  //   });
  /*
    select from pledges order by pledge_timestamp desc OFFSET $2 LIMIT $1",
  */
  assert.pass();
  assert.end();
});

test.skip('getPledgeTotal', assert => {
  // stuff
});

test.skip('propertyById', assert => {
  // stuff
});

test.skip('getAllProperties', assert => {
  // stuff
});

module.exports = new Promise( (resolve, reject) => {
  test.onFinish(resolve);
});
