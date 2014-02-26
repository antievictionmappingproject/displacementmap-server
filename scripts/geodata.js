var neo4j = require('neo4j');
var util = require('util');
var request = require('request');

var neo4jDomain = 'http://localhost:7474'

var db = new neo4j.GraphDatabase(neo4jDomain);
console.log('hello world!');

var query = 
  ['MATCH (e: Property) return e'].join('\n');

console.log(query);

db.query(query, null, function (err, results) {
  if (err) throw err;
  var nodes = results.map(function (result) {
  var nodeURL = result['e']._data.self;
    
//    node.data.addresses = '566-576 Lombard St';
// //    node.save(function (err) {
// //         console.log(err);
// //     });
  var nodeId = parseInt(nodeURL.substring(nodeURL.lastIndexOf('/') + 1));
  
request.post(
    neo4jDomain + '/db/data/ext/SpatialPlugin/graphdb/addNodeToLayer',
    { json: {layer: "geom", "node": nodeURL}},
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body)
        }
    }
);

// curl -X POST -d '{"layer":"geom","node":"http://localhost:7474/db/data/node/40"}' --header "Content-Type:application/json" http://localhost:7474/db/data/ext/SpatialPlugin/graphdb/addNodeToLayer
//   
//     db.getNodeById(nodeId, function (error, nodeResult) { 
//        console.log(nodeId);
//        console.log(nodeResult.toString);
//     	console.log(util.inspect(nodeResult, false, null));
//     });
     });
  console.log("length: " + results.length);
});




