const _ = require('lodash'),
      test = require('tape');

const models = require('../models/models'),
    { Address, Ellis, BlockLotEllis } = models,
    { Addresses, Ellises, BlockLotEllises } = models;

test('Address query', assert => {
  const streetName = 'BUCHANAN',
        streetType = 'ST',
        addrNum = 1010;
  Address.query()
    .where({st_name: streetName, st_type: streetType, addr_num: addrNum})
    .then( collection => {
      const blockLot = collection[0].blk_lot;
      return Address.query().where({blk_lot: blockLot});
    }).then( collection => {
      assert.equal(collection.length, 63);
      assert.end();
    });
});

test('Ellis query', assert => {
  const landlord = 'Temple Hotel LLC';

  Ellis.query()
    .where('ellis_act_evictions.landlord', landlord)
    .then(models => {
      const model = models[0];
      assert.equal(model.units, 88);
      assert.end();
    });
});

test('Ellis has many blockLots', assert => {
  Ellis.query()
    .eager('blockLots')
    .then(models => {
      const someModelsHaveMultipleBlockLots =
        _.filter(models, model => model.blockLots.length > 1).length > 0;

      assert.true(someModelsHaveMultipleBlockLots)
      assert.end();
    });
})

test('BlockLotEllis has many addresses', assert => {
  BlockLotEllis.query()
    .eager('addresses')
    .then(models => {
      const someModelsHaveMultipleAddresses =
        _.filter(models, model => model.addresses.length > 1).length > 0;

      assert.true(someModelsHaveMultipleAddresses)
      assert.end();
    });
})

test('BlockLotEllis has one eviction', assert => {
  BlockLotEllis.query()
    .eager('eviction')
    .then(models => {
      const allModelsHaveOneEviction =
        _.every(models, model => model.eviction.constructor === Ellis);

      assert.true(allModelsHaveOneEviction);
      assert.end();
    });
});

test('Address has many blockLots', assert => {
  Address.query()
    .eager('blockLots')
    .then(models => {
      const someModelsHaveMultipleBlockLots =
        _.filter(models, model => model.blockLots.length > 1).length > 0;

      assert.true(someModelsHaveMultipleBlockLots);
      assert.end();
    });
})


test('Ellis through to address', assert => {
  const landlord = 'Temple Hotel LLC',
        expectedAddresss = '469 PINE ST';;

  Ellis.query()
    .eager('addresses')
    .where('ellis_act_evictions.landlord', landlord)
    .then( models => {
      assert.true(models[0].addresses[0].constructor === Address);
      const actualAddress = models[0].addresses[0].address;
      assert.equal(actualAddress, expectedAddresss);
      assert.end()
    });
});

module.exports = new Promise( (resolve, reject) => {
  test.onFinish(resolve);
});
