const test = require('tape');

const models = require('../models/models'),
    { Address, Ellis, BlockLotEllis, Pledge } = models,
    { Addresses, Ellises, BlockLotEllises } = models;

test('models correctly imported', assert => {
  assert.ok(Ellis);
  assert.ok(Address);
  assert.ok(BlockLotEllis);
  assert.ok(Pledge);

  assert.end();
});

test.skip('collections correctly imported', assert => {
  assert.ok(Ellises);
  assert.ok(Addresses);
  assert.ok(BlockLotEllises);
  assert.ok(Pledges);

  assert.end();
});

module.exports = new Promise( (resolve, reject) => {
  test.onFinish(resolve);
});
