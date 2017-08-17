const wtf = require('wtfnode'),
       _ = require('lodash'),
      path = require('path');

const _runTest = (file) => {
  console.log(`${file.toUpperCase()}:`);
  return require(path.join(__dirname, file))
};

const allTests = Promise.all([
  _runTest('models'),
  _runTest('base-queries'),
  _runTest('advanced-queries')
]);

allTests.then( () => {
  // wtf.dump();
  // Ellis.knex().destroy().then(wtf.dump)
});
