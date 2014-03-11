var restify = require('restify');
var geocoder = require('geocoder');
var util = require("util")
var config = require('./config');

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

  var limit = require("simple-rate-limiter");
  var geocode = limit(function(address, res, callback) {
    geocoder.geocode(address, function(err, result) {
      if (err) {
        res.send(500, err);
      } else if (result.error_message) {
        res.send(500, result.error_message);
      } else {
        var streetNumber = result.results[0].address_components[0].short_name;
        var streetName = result.results[0].address_components[1].short_name;

        console.log(streetNumber);
        console.log(streetName);
        callback(streetNumber, streetName, res)
      }
    },{"components":"locality:San Francisco"});
  }).to(5).per(1000).evenly(true);

  function getByAddress(address, res) {
    console.log('address received: ' + address);
    //todo: move to db class, do as joins
    function getBlkLot(streetNumber, streetName, res) {
      dbQuery("SELECT blk_lot FROM address_blklot WHERE (st_name:: text || ' ' || st_type:: text) = $1::text and addr_num = $2::integer", 
        [streetName.toUpperCase().trim(), streetNumber.trim()],
        function(err, query_rows, results) {
          if (err) {
            res.send(500, err)
          } else {
            if (query_rows.length >0) {
              var mappedrows = query_rows.map( function(row) {
                return row.blk_lot;
              });
              var params = mappedrows.map(function(item, idx) {return '$' + (idx + 1) +'::text'});

              dbQuery("SELECT blk_lot, address, latitude, longitude FROM address_blklot WHERE blk_lot IN(" + params.join(',') + ')',
                mappedrows,
                function(err, query_rows, results) {
                  if (err) {
                    res.send(500, err)
                  } else {
                    if (query_rows.length > 0) {
                      var addresses = query_rows.map( function(row) {
                        return row.address;
                      });

                      var pin = {};
                      pin.addresses = addresses.filter(distinct).sort();
                      pin.lat = query_rows[0].latitude;
                      pin.lon = query_rows[0].longitude;

                      dbQuery("SELECT petition FROM blklot_ellis WHERE blk_lot IN(" + params.join(',') + ')',
                        mappedrows,
                        function(err, query_rows, results) {
                          console.log(query_rows);
                          var petitions = query_rows.map( function(row) {
                            return row.petition;
                          });
                          var evictions = petitions.filter(distinct);
                          if (evictions.length > 0) {
                            var evictionParams = evictions.map(function(item, idx) {return '$' + (idx + 1) +'::text'});
                            dbQuery("SELECT date FROM evictions WHERE petition IN(" + evictionParams.join(',') + ')',
                              evictions,
                              function(err, query_rows, results) {
                                console.log(query_rows);
                                var dates = query_rows.map( function(row) {
                                  return row.date;
                                });
                                pin.evictions = dates.filter(distinct).sort();
                                res.send(pin);
                              });
                          } else {
                            res.send(pin);
                          }
                        });
} else {
  res.send(500, "blocklot found without address info")
}
}
});
} else {
  res.send(404);
}
}
});
}
geocode(address, res, getBlkLot)
};

var server = restify.createServer();

server.use(restify.queryParser());
server.use(restify.fullResponse());

  //ummm?
  server.use(restify.CORS());

  server.get('/properties', property);
  server.get('/properties/:blklot', propertyById);

  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  function distinct(value, index, self) { 
    return self.indexOf(value) === index;
  }