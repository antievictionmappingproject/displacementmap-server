var restify = require('restify');
var util = require('util')
var config = require('./config');
var Q = require('q');

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
  if (!req.params || Object.keys(req.params).length === 0) {
    res.send(400, "pledger info required")
  } else {
    var params = req.params;

    console.log("pledge received: " + util.inspect(params, false, null));

    var firstName = params.firstName || '';
    var lastName = params.lastName || '';
    var email = params.email || '';
    var reason = params.reason || '';
    var anonymous = (typeof params.anonymous === 'undefined') ? false : (params.anonymous.toLowerCase() === 'true');
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
    if (reason.length > 1000) {
      pledge.reason = reason.substring(0, 500) + "...";
    } else {
      pledge.reason = reason; 
    }
  }
  pledge.timestamp = new Date(timestamp);
  return pledge;
}

function getPledges(req, res, next) {
  var limit = parseInt(req.params.limit) || 30;
  var skip = parseInt(req.params.skip) || 0;
  console.log("skip: " + skip)
  //todo: move to db class
  dbQuery("select first_name, last_name, reason, anonymous, pledge_timestamp from pledges order by pledge_timestamp desc OFFSET $2 LIMIT $1", 
    [limit, skip],
    function(err, query_rows, results) {
      if (err) {
        console.log("err retrieving pledges: " + err);
        res.send(500, err);
      } else {
        console.log(query_rows);
        var pledges = query_rows.map( function(row) {
          return constructPledge(row.anonymous, row.first_name, row.last_name, row.reason, row.pledge_timestamp);
        });
        res.send(pledges);
      }
    });
}

function getPledgeTotal(req, res, next) {
  dbQuery("select count(*) from pledges", 
    [],
    function(err, query_rows, results) {
      if (err) {
        console.log("err retrieving pledge count: " + err);
        res.send(500, err);
      } else {
        if (query_rows.length > 0) {
          res.send(query_rows[0].count);
        } else {
          res.send(500, "count not found")
        }
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

    var dbError = function(error){
      console.log("err querying for evictions: " + error);
      res.send(500, error)
    }

    dbQuery("SELECT blk_lot, address, latitude, longitude FROM address_blklot WHERE blk_lot IN " +
      "(SELECT blk_lot FROM address_blklot WHERE (st_name:: text || ' ' || st_type:: text) = $1::text and addr_num = $2::integer)",
      [streetName.toUpperCase().trim(), 
      streetNumber.trim()]).then(function(result) {
        var query_rows = result.rows;
        if (query_rows.length > 0) {
          var addresses = query_rows.map( function(row) {
            return row.address;
          });

          var pin = {};
          pin.addresses = addresses.filter(distinct).sort();
          pin.lat = query_rows[0].latitude;
          pin.lon = query_rows[0].longitude;

          var blk_lots = query_rows.map( function(row) {
            return row.blk_lot;
          }).filter(distinct);

          var blk_lotParams = blk_lots.map(function(item, idx) {return '$' + (idx + 1) +'::text'});

          //ellis act evictions
          var ellises = dbQuery("SELECT distinct(ellis_act_evictions.petition), ellis_act_evictions.date, ellis_act_evictions.landlord, ellis_act_evictions.units from ellis_act_evictions join blklot_ellis on (blklot_ellis.petition = ellis_act_evictions.petition) where blklot_ellis.blk_lot IN(" + blk_lotParams.join(',') + ')',
            blk_lots).then(function(result) {
              var query_rows = result.rows;

              var evictions = query_rows.map( function(row) {
                var eviction = {};
                eviction.date = row.date;
                eviction.units = row.units;
                eviction.landlords = row.landlord.split("\n");
                eviction.eviction_type = "ellis";
                return eviction;
              });

              if (evictions.length > 0) {
               // pin.protected_tenants = '?'; //todo: actual data
                if (parseInt(streetNumber.trim()) % 2 === 0) {
                  pin.dirty_dozen = "https://antievictionmap.squarespace.com/dirty-dozen/";
                }
              }
              return evictions;
            }, dbError);

            //omi evictions
            var omis = dbQuery("SELECT distinct(omi_evictions.petition), omi_evictions.date, omi_evictions.address, omi_evictions.unit from omi_evictions join blklot_omi on (blklot_omi.petition = omi_evictions.petition) where blklot_omi.blk_lot IN(" + blk_lotParams.join(',') + ')',
              blk_lots).then(function(result) {
                var query_rows = result.rows;
                var evictions = query_rows.map( function(row) {
                  var eviction = {};
                  eviction.date = row.date;
                  eviction.address = row.address;
                  if (row.unit) {
                    eviction.unit = row.unit;
                  }
                  eviction.eviction_type = "omi";
                  return eviction;
                });
                return evictions;
              }, dbError);

              Q.all([ellises, omis]).then(function(evictionResults) {
                var allEvictions = evictionResults[0].concat(evictionResults[1]).sort(function(a, b){
                  var keyA = new Date(a.date),
                  keyB = new Date(b.date);
                  if(keyA > keyB) return -1;
                  if(keyA < keyB) return 1;
                  return 0;
                });

                if (allEvictions.length > 0) {
                  pin.evictions = allEvictions;
                }
                res.send(pin); 
              }, dbError);

            } else {
              res.send(404);
            }
          }, dbError);
}

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
  server.get('/pledges/total', getPledgeTotal);

  server.listen(process.env.PORT || 8888, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  function distinct(value, index, self) { 
    return self.indexOf(value) === index;
  }