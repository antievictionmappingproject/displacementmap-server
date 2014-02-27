var restify = require('restify');
var geocoder = require('geocoder');
var util = require("util")
var config = require('./config')

var dbQuery = require('pg-query');

dbQuery.connectionParameters = 'postgres://'+ config.db.user + ':' + config.db.pass + '@'+ config.db.host + ':' + config.db.port + '/' + config.db.name;

function property(req, res, next) {
  var query = req.query;
  var address = query.address;

  if (address !== undefined) {
    getByAddress(address, res);
  } else {
    //get all
    res.send("getting all, eventually")
  }
};

function propertyById(req, res, next) {
    var blklot = req.params.blklot;
    //todo: move to db class
    dbQuery("SELECT blk_lot, address, latitude, longitude FROM address_blklot WHERE blk_lot = $1:: text", 
      [blklot],
      function(err, query_rows, results) {
        console.log(query_rows);
        //todo: check for result
        var property = {};
        property.id = blklot;
        var addresses = query_rows.map( function(row) {
            return row.address;
          });
        property.addresses = addresses;
        property.lat = query_rows[0].latitude;
        property.lon = query_rows[0].longitude;
        res.send(property);
       });
};

function getByAddress(address, res) {
    geocoder.geocode(address, function(err, result) {
    var streetNumber = result.results[0].address_components[0].short_name;
    var streetName = result.results[0].address_components[1].short_name;

    console.log(streetNumber);
    console.log(streetName);

    //todo: move to db class
    dbQuery("SELECT blk_lot FROM address_blklot WHERE (st_name:: text || ' ' || st_type:: text) = $1::text and addr_num = $2::integer", 
      [streetName.toUpperCase().trim(), streetNumber.trim()],
      function(err, query_rows, results) {
        console.log(query_rows);
        res.send(query_rows.map( function(row) {
            return row.blk_lot;
          }));
       });
    },{"components":"locality:San Francisco"}
  );
};

var server = restify.createServer();
server.use(restify.queryParser());

server.get('/properties', property);
server.get('/properties/:blklot', propertyById);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});