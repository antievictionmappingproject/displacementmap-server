var restify = require('restify');
var util = require("util")
var config = require('./config');

var dbQuery = require('pg-query');

var connString = 'postgres://'+ config.db.user + ':' + config.db.pass + '@'+ config.db.host + ':' + config.db.port + '/' + config.db.name;
dbQuery.connectionParameters = connString;

function property(req, res, next) {
  var query = req.query;
  var num = query.num;
  var st = query.st;

  if (num !== undefined && st !== undefined) {
    getByAddress(num, st, res);
  } else {
    //get all
    res.send("getting all, eventually")
  }
};

function makePledge(req, res, next) {
  //TODO: check for empty
  var params = req.params;

  console.log("pledge received: " + util.inspect(params, false, null));

  var firstName = params.firstName || '';
  var lastName = params.lastName || '';
  var email = params.email || '';
  var reason = params.reason || '';
  var anonymous = (typeof params.anonymous === 'undefined') ? false : params.anonymous;
  var timestamp = new Date();

  //todo: move to db class
  dbQuery("INSERT INTO pledges(first_name, last_name, email, reason, anonymous, pledge_timestamp) VALUES (cast(nullif($1, '') AS text), cast(nullif($2, '') AS text), cast(nullif($3, '') AS text), cast(nullif($4, '') AS text), cast($5 AS boolean), $6)", 
    [firstName,
    lastName,
    email,
    reason,
    anonymous,
    timestamp],
    function(err, query_rows, results) {
      if (err) {
        console.log("err inserting pledge: " + err);
        res.send(500, err);
      } else {
        var newPledge = constructPledge(anonymous, firstName, lastName, reason, timestamp);
        res.send(newPledge);
      }
    });
}

function constructPledge(anonymous, first_name, last_name, reason, timestamp) {
  var pledge = {};
  if (anonymous) {
    pledge.name = "Anonymous";
  } else {
    var firstName = first_name || ""
    if (last_name && last_name.trim()) {
      pledge.name = firstName + " " + last_name.trim().charAt(0) + ".";
    } else if (first_name && first_name.trim()) {
      pledge.name = firstName;
    } else {
      pledge.name = "Anonymous";
    }
  }
  if (reason) {
      pledge.reason = reason; //todo: truncate
   }
  pledge.timestamp = new Date(timestamp);
  return pledge;
}

function getPledges(req, res, next) {
  //todo: move to db class
  dbQuery("select first_name, last_name, reason, anonymous, pledge_timestamp from pledges order by pledge_timestamp desc", 
    [],
    function(err, query_rows, results) {
      if (err) {
        console.log("err retrieving pledges: " + err);
        res.send(500, err);
      } else {
        console.log(query_rows);
        var pledges = query_rows.map( function(row) {
          return constructPledge(row.anonymous, row.first_name, row.last_name, row.reason, row.pledge_timestamp);
        });
        console.log(pledges);
        res.send(pledges);
      }
    });
}


function propertyById(req, res, next) {
  var blklot = req.params.blklot;
    //todo: move to db class
    dbQuery("SELECT blk_lot, address, latitude, longitude FROM address_blklot WHERE blk_lot = $1:: text", 
      [blklot],
      function(err, query_rows, results) {        //todo: check for result
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

  function getByAddress(streetNumber, streetName, res) {
    console.log('address received: ' + streetNumber + ' ' + streetName);
    //todo: move to db class, do as joins
    dbQuery("SELECT blk_lot FROM address_blklot WHERE (st_name:: text || ' ' || st_type:: text) = $1::text and addr_num = $2::integer", 
      [streetName.toUpperCase().trim(), streetNumber.trim()],
      function(err, query_rows, results) {
        if (err) {
          console.log("err querying for blkLot: " + err);
          res.send(500, err);
        } else {
          console.log("length: " + query_rows.length);
          if (query_rows.length > 0) {
            var mappedrows = query_rows.map( function(row) {
              return row.blk_lot;
            });
            var params = mappedrows.map(function(item, idx) {return '$' + (idx + 1) +'::text'});

            dbQuery("SELECT blk_lot, address, latitude, longitude FROM address_blklot WHERE blk_lot IN(" + params.join(',') + ')',
              mappedrows,
              function(err, query_rows, results) {
                if (err) {
                  console.log("err querying for addresses: " + err);
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
                        var petitions = query_rows.map( function(row) {
                          return row.petition;
                        });
                        var evictions = petitions.filter(distinct);
                        if (evictions.length > 0) {
                          var evictionParams = evictions.map(function(item, idx) {return '$' + (idx + 1) +'::text'});
                          dbQuery("SELECT * FROM evictions WHERE petition IN(" + evictionParams.join(',') + ')',
                            evictions,
                            function(err, query_rows, results) {
                              var evictions = query_rows.map( function(row) {
                                var eviction = {};
                                eviction.date = row.date;
                                eviction.units = row.units;
                                eviction.landlord = row.landlord;
                                return eviction;
                              });

                              pin.evictions = evictions.filter(distinct).sort(function(a, b){
                                var keyA = new Date(a.updated_at),
                                keyB = new Date(b.updated_at);
                                if(keyA < keyB) return -1;
                                if(keyA > keyB) return 1;
                                return 0;
                              });

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
};

var server = restify.createServer();

server.use(restify.queryParser());
server.use(restify.fullResponse());
server.use(restify.bodyParser());

  //ummm?
  server.use(restify.CORS());

  server.get('/properties', property);
  server.get('/properties/:blklot', propertyById);

  server.post('/pledges', makePledge);
  server.get('/pledges', getPledges);

  server.listen(process.env.PORT || 8888, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  function distinct(value, index, self) { 
    return self.indexOf(value) === index;
  }