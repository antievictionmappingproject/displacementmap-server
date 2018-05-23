const util = require('util'),
      config = require('/config'),
      Q = require('q'),
      _ = require('underscore'),
      pg = require('pg'),
      configVars = [ 'user', 'pass', 'host', 'port', 'name' ],
      [ user, pass, host, port, name ] = configVars.map(v => config.get(`db.${v}`)),
      connString = `postgres://${user}:${pass}@${host}:${port}/${name}`,
      pgClient = new pg.Client(connString);

pgClient.connect();

function makePledge(req, res, next) {
  //TODO: check for empty
  if (!req.params || Object.keys(req.params).length === 0) {
    res.status(404).send("pledger info required");
  } else {
    var params = req.params;
    var firstName = params.firstName || '';
    var lastName = params.lastName || '';
    var email = params.email || '';
    var reason = params.reason || '';
    var anonymous = (typeof params.anonymous === 'undefined') ? false : (params.anonymous.toLowerCase() === 'true');
    var timestamp = new Date();

    //todo: move to db class
    pgClient.query("INSERT INTO pledges(first_name, last_name, email, reason, anonymous, pledge_timestamp) VALUES (cast(nullif($1, '') AS text), cast(nullif($2, '') AS text), cast(nullif($3, '') AS text), cast(nullif($4, '') AS text), cast($5 AS boolean), $6)",
      [firstName,
      lastName,
      email,
      reason,
      anonymous,
      timestamp],
      function(err, query_rows, results) {
        if (err) {
          res.status(500).send(err);
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
  //todo: move to db class
  pgClient.query("select first_name, last_name, reason, anonymous, pledge_timestamp from pledges order by pledge_timestamp desc OFFSET $2 LIMIT $1",
    [limit, skip],
    function(err, results) {
      if (err) {
        res.status(500).send(err);
      } else {
        var pledges = results.rows.map(function(row) {
          return constructPledge(row.anonymous, row.first_name, row.last_name, row.reason, row.pledge_timestamp);
        });
        res.send(pledges);
      }
    });
}

function getPledgeTotal(req, res, next) {
  pgClient.query("select count(*) from pledges",
    [],
    function(err, results) {
      if (err) {
        res.status(500).send(err);
      } else {
        if (results.rows.length > 0) {
          res.send(results.rows[0].count);
        } else {
          res.status(500).send("count not found");
        }
      }
    });
}

function property(req, res, next) {
  var dbError = function(error){
    res.status(500).send(error);
  }
  var query = req.query;
  var num = query.num;
  var st = query.st;
  if (num !== undefined && st !== undefined) {
    getByAddress(num, st, res);
  } else if (query.latLon) {
    allEvictionsLatLonOnly.then(function (value) {
      res.send(value);
    }, dbError);
  } else {
    allEvictions.then(function (value) {
      res.send(value);
    }, dbError);
  }
};

function processEvictions(query_rows) {
  var evictions = query_rows.map( function(row) {
    var eviction = {};
    eviction.date = row.date;
    eviction.units = row.units;
    eviction.landlords = (row.landlord || "").split("\n");
    if (row.protected) {
      eviction.protected = row.protected;
    }
    if (row.dirty_dozen) {
      eviction.dirty_dozen = row.dirty_dozen;
    }
    if (row.eviction_type) {
      eviction.eviction_type = row.eviction_type;
    }
    if (row.owner_name) {
      eviction.owner_name = row.owner_name;
    }
    if (row.apt) {
      eviction.apt = row.apt;
    }
    if (row.petition) {
      eviction.petition = row.petition;
    }
    return eviction;
  });
  return evictions.filter(distinct);
}

function addEvictionsToPin(evictions, pin) {
  var allEvictions = evictions.sort(function(a, b){
    var keyA = new Date(a.date),
    keyB = new Date(b.date);
    if(keyA > keyB) return -1;
    if(keyA < keyB) return 1;
    return 0;
  });

  if (allEvictions.length > 0) {
    var protected_tenants_array = allEvictions.map(function(eviction){return (eviction.protected || 0) });
    var protected_tenants = Math.max.apply(null, protected_tenants_array);
    pin.protected_tenants = (protected_tenants > 0) ? protected_tenants : '?';
    pin.evictions = allEvictions;

    var dirtyDozen = evictions.filter(function(eviction){
      return eviction.dirty_dozen;
    });

    if (dirtyDozen.length > 0) {
      pin.dirty_dozen = dirtyDozen[0].dirty_dozen;
    }

  }
  return pin;
}

function getByAddress(streetNumber, streetName, res) {
  var dbError = function(error){
    res.status(500).send(error);
  }
  // TBD: not working when street_type is empty for example in case '1400 BROADWAY'
  pgClient.query("SELECT id, address, latitude, longitude FROM properties WHERE (street::text || ' ' || st_type::text) = $1::text and addr_num = $2::integer",
    [streetName.toUpperCase().trim(),
    streetNumber.trim()]).then(function(result) {
      var query_rows = result.rows;
      if (query_rows.length > 0) {
        var addresses = query_rows.map(function(row) {
          return row.address;
        });
        var pin = {};
        pin.addresses = addresses.filter(distinct).sort();
        evictions = pgClient.query("SELECT distinct(evictions.petition), evictions.dirty_dozen, evictions.date, evictions.protected, evictions.eviction_type," +
                  "evictions.landlord, evictions.units, evictions.apt from evictions join properties on (properties.id = evictions.property_id)" +
                    " WHERE (properties.street:: text || ' ' || properties.st_type:: text) = $1::text and properties.addr_num = $2::integer",
                    [streetName.toUpperCase().trim(),
                      streetNumber.trim()]).then(function(result) {
                        var query_rows = result.rows;
                        return processEvictions(query_rows);
      }, dbError);
        Q.all(evictions).then(function(evictionResults) {
                res.send(addEvictionsToPin(evictionResults, pin));
              }, dbError);
      } else {
        res.status(404).send(error);
      }
  }, dbError);
}

var express    = require('express'),
fileUpload = require('express-fileupload');
app        = express();

// default options
app.use(fileUpload());
app.use('/styles', express.static(__dirname));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS,HEAD');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

var cors = require('cors');
app.use(cors({credentials: false, origin: true}));
var basicAuth = require('basic-auth');
var auth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.status(401).send();
  };
  var user = basicAuth(req);
  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  };
  promiseToCheckUser(user.name, user.pass).then(function(isExist) {
    if (isExist) {
      return next();
    }
    else {
      return unauthorized(res);
    }
  });
};

let promiseToCheckUser = function(user, pass) {
  return new Promise (function (resolve, reject) {
    const csvFilePath = 'username_password.csv';
    const csv = require('csvtojson');
    var flag = false;
    csv()
      .fromFile(csvFilePath)
        .on('json',(jsonObj, rowIndex)=>{
        // combine csv header row and csv line to a json object
        // jsonObj.a ==> 1 or 4
        if (user == jsonObj.username && pass == jsonObj.password) {
          flag = true;
        }
      })
      .on('done',(error)=>{
            resolve(flag);
      })
  });
}


function IsExistUser(user, pass) {
  const csvFilePath = 'username_password.csv';
  const csv = require('csvtojson');
  var flag = false;
  csv()
    .fromFile(csvFilePath)
      .on('json',(jsonObj, rowIndex)=>{
      // combine csv header row and csv line to a json object
      // jsonObj.a ==> 1 or 4
      if (user == jsonObj.username && pass == jsonObj.password) {
        flag = true;
      }
    })
    .on('done',(error)=>{
          return flag;
    })
}


app.post('/upload', auth, function (req, res, next) {
  req.setTimeout(300);
  var sampleFile, uploadPath;
  if (!req.files) {
    res.status(400).send('No files were uploaded.');
    return;
  }
  sampleFile = req.files.sampleFile;
  if (sampleFile == undefined) {
    res.status(500).send("The imported file is empty.");
    return;
  }
  uploadPath = __dirname + '/uploadedfiles/' + sampleFile.name;

  if (!fs.existsSync(__dirname + '/uploadedfiles/')){
      fs.mkdirSync(__dirname + '/uploadedfiles/');
  }
  sampleFile.mv(uploadPath, function(err) {
    if (err) {
      res.status(400).send(err);
    }
    else {
        if (GetExtension(sampleFile.name) !== 'CSV'){
          res.status(500).send("The imported file is not of CSV type.");
        } else {
          ProcessCSV(sampleFile, uploadPath, sampleFile.name, res, req.body.dryRun);
        }
    }
  });
  require('rimraf')(__dirname + '/uploadedfiles/', function(){});
});

var pg = require('pg');
var fs = require('fs');
var GeoJSON = require('geojson');

// JOI
const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const joi = BaseJoi.extend(Extension);

function GetExtension(filename) {
  if (filename.indexOf('.') !== -1) {
    var parts = filename.split('.');
    return parts[parts.length - 1].toUpperCase();
  }
  return '';
}

let schemaAddresses = {

    'EAS BaseID': joi.number().allow(''),
    'EAS SubID': joi.number().allow(''),
    'CNN': joi.string().allow(''),
    'Address': joi.string(),
    'Address Number': joi.number(),
    'Address Number Suffix': joi.string().allow(''),
    'Street Name': joi.string(),
    'Street Type': joi.string().allow(''),
    'Unit Number': joi.string().allow(''),
    'Zipcode': joi.string().allow(''),
    'Block Lot': joi.string().allow(''),
    'Longitude': joi.number().allow(''),
    'Latitude': joi.number().allow(''),
    'Location': joi.string().allow(''),

 };

function ProcessCSV(sampleFile, uploadPath, fileName, res, isDryRun) {

  var numberOfLines = sampleFile.data.toString().split('\n').length - 1;

  if (fileName.match(/addresses.*/) !== null && fileName.match(/addresses.*/).index == 0) {
   ProcessAddresses(uploadPath, res, isDryRun, numberOfLines);
  } else {
    if (fileName.match(/evictions.*/) !== null && fileName.match(/evictions.*/).index == 0) {
      ProcessTempEvictions(uploadPath, res, isDryRun, numberOfLines);
    }
    else {
      if (fileName.match(/owners.*/) !== null && fileName.match(/owners.*/).index == 0) {
        ProcessOwners(uploadPath, res, isDryRun, numberOfLines);
      }
      else {
        res.status(500).send("Import file should start with one of the following names: addresses, evictions or owners. Please rename.");
      }
    }
  }
}

let schemaOwners = {

    'owner_name': joi.string().required(),
    'address': joi.string().required(),
    'owner_mailing_address': joi.string().required(),

 };

function ProcessAddressRow(jsonObj, rowNumber, isDryRun, errorMessage){

     var data = joi.validate(jsonObj, schemaAddresses, { abortEarly: false });
     if (data.error) {
       errorMessage[rowNumber] = data.error.details;
     } else {
        let isDry = (isDryRun == 'true');

        let checkIfPropertyNotExist = function() {
          return new Promise (function (resolve, reject) {
            let property_id;
            let address = jsonObj['Address'].toUpperCase();
            pgClient.query("SELECT id FROM properties WHERE address = $1 AND blklot = $2 LIMIT 1", [address, jsonObj['Block Lot']],
              function(err, result) {
                if (err) {
                  errorMessage[rowNumber] = err;
                  reject(errorMessage);
                } else {
                    if (result.rows.length  > 0){
                      errorMessage[rowNumber] = "There is a property registered with " + jsonObj['Block Lot'] + " blklot and " + jsonObj['Address'] + " address.";
                      reject(errorMessage);
                    }
                    else {
                      resolve();
                    }
                 }
              });
          })
       }

      let insertToProperty = function(){
        if (! isDry) {
          pgClient.query("INSERT INTO properties(blklot, street, st_type, addr_n_sfx, addr_num, address, latitude, longitude, unit_num, zipcode) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [jsonObj['Block Lot'], jsonObj['Street Name'], jsonObj['Street Type'], jsonObj['Address Number Suffix'], jsonObj['Address Number'], jsonObj['Address'], jsonObj['Latitude'], jsonObj['Longitude'], jsonObj['Unit Number'], jsonObj['Zipcode']],
            function(err, query_rows, results) {
              if (err) {
                errorMessage[rowNumber] = "err inserting properties: " + err;
              }
          });
        }
      }

      checkIfPropertyNotExist().then(function() {
          insertToProperty();
      }).catch(function(errorMessage){
      });
    }
}

let schemaEvictions = {

    'the_geom': joi.string().allow('').required(),
    'petition': joi.string().allow('').required(),
    'date': joi.date().allow('').required(),
    'month': joi.number().integer().min(1).max(12).required(),
    'day': joi.number().integer().min(1).max(31).required(),
    'year': joi.number().integer().min(1990).max(2100).required(),
    'type': joi.string().required(),
    'address': joi.string().required(),
    'apt': joi.string().allow('').required(),
    'Zip': joi.string().allow('').required(),
    'units': joi.string().allow('').required(),
    'blk_lot': joi.string().allow('').required(),
    'owner': joi.string().allow('').required(),
    'people involved': joi.string().allow('').required(),
    'yearbuilt': joi.number().integer().positive().allow('').required(),
    'latitude': joi.number().allow('').required(),
    'longitude': joi.number().allow('').required(),
 };

function getNumberOfLines(sampleFile, filePath, callback) {
  var i;
  var count = 0;
  sampleFile // process.argv[2]
    .on('data', function(chunk) {
      for (i=0; i < chunk.length; ++i)
        if (chunk[i] == 10) count++;
    })
    .on('end', function() {
      return callback(++count);
    });
}


function ProcessTempEvictionRows(jsonObj, rowNumber, isDryRun, errorMessage){
  var data = joi.validate(jsonObj, schemaEvictions, { abortEarly: false });
  if (data.error) {
    errorMessage[rowNumber] = data.error.details;
  } else {
    let isDry = (isDryRun == 'true');
    let address = modifyAddress(jsonObj['address']);
    let date =  jsonObj['date'];
    let property_id;
    let selectPropertyId = function(callback) {
      return new Promise (function (resolve, reject) {
        pgClient.query("SELECT id FROM properties WHERE addr_num = $1 AND street = $2 LIMIT 1", [getAddressNumber(address), getAddressStreet(address)],
          function(err, result) {
            if (err) {
              errorMessage[rowNumber] = err;
              reject(errorMessage);
            } else {
                if (result.rows.length  > 0){
                  property_id = result.rows[0].id;
                  resolve(property_id);
                } else {
                  errorMessage[rowNumber] = jsonObj['address'] + " address is not found in properties table. Please import it into addresses.csv file first.";
                  reject(errorMessage);
                }
            }
        });
      });
    }
    let checkIfNotExistEviction = function(property_id) {
      return new Promise (function (resolve, reject) {
        pgClient.query("SELECT * FROM evictions WHERE petition = $1 AND date = $2 AND property_id = $3 LIMIT 1", [jsonObj['petition'], jsonObj['date'], property_id],
          function(err, result) {
            if (err) {
              errorMessage[rowNumber] = err;
              reject(errorMessage);
            } else {
                if (result.rows.length > 0){
                  errorMessage[rowNumber] = "There is an eviction registered for " + jsonObj['address'] + ' and ' + jsonObj['date'] + " date.";
                  reject(errorMessage);
                } else {
                  resolve(property_id);
                }
            }
        });
      });
    }
    let insertEviction = function(property_id) {
      if (! isDry) {
        let arr = [];
        arr = getEvictionTypes(jsonObj['type']);
        arr.forEach(function(item) {
            pgClient.query("INSERT INTO evictions(petition, units, landlord, date, dirty_dozen, eviction_type, property_id) VALUES (cast(nullif($1, '') AS text), cast(nullif($2, '') AS text), cast(nullif($3, '') AS text), CAST($4 AS DATE), cast(nullif($5, '') AS text), cast(nullif($6, '') AS text), $7)",
                [jsonObj.petition, jsonObj.units, jsonObj.owner, date, jsonObj.dirty_dozen, item, property_id],
              function(err, query_rows, results) {
                if (err) {
                  errorMessage[rowNumber] = err;
                }
            });
        });
      }
    }
    selectPropertyId().then(function(property_id){
      checkIfNotExistEviction(property_id).then(function() {
        insertEviction(property_id);
      }).catch(function(errorMessage){
      });
    }).catch(function(errorMessage){
    });
  }
}

// Add data to properties and owners tables.
function ProcessAddresses(uploadPath, res, isDryRun, numberOfLines) {
  const csvFilePath = String(uploadPath);
  const csv = require('csvtojson');
  var forEach = require('async-foreach').forEach;
  errorMessage = {};
  csv()
    .fromFile(csvFilePath)
      .on('end_parsed',(jsonArrObj)=>{
        forEach(jsonArrObj, function(item, index, arr) {
          ProcessAddressRow(item, index + 2, isDryRun, errorMessage);
          var done = this.async()
          setTimeout(function() {
            done(index !== jsonArrObj.length - 1);
          }, 500);
        }, allDone)
      })
      // Generic "done" callback.
    function allDone(err) {
      sendMessage(errorMessage);
    }
    function sendMessage(errorMessage) {
      if (! (Object.keys(errorMessage).length === 0 && errorMessage.constructor === Object)) {
        res.status(500).send(errorMessage);
      } else {
        res.status(200).send('The data was successfully parsed.');
      }
    }
}

function ProcessOwnerRows(jsonObj, rowNumber, isDryRun, errorMessage){
    var data = joi.validate(jsonObj, schemaOwners, {allowUnknown : true, abortEarly: false });
    if (data.error) {
      errorMessage[rowNumber] = data.error.details;
    } else {
      var isDry = (isDryRun == 'true');
      var property_id;
      let promiseToSelectPropertyID = function() {
        return new Promise(function (resolve, reject) {
          var address = jsonObj.address.toUpperCase();
          pgClient.query("SELECT id FROM properties WHERE address = $1 LIMIT 1", [address],
            function(err, result) {
              if (err) {
                errorMessage[rowNumber] = err;
                reject(errorMessage);
              } else {
                  if (result.rows.length  > 0){
                    property_id = result.rows[0].id;
                    resolve(result.rows[0].id);
                  }
                  else {
                    errorMessage[rowNumber] = "The " +  jsonObj.address + " address is not found in properties table. Please import it into addresses.csv file first.";
                    reject(errorMessage);
                  }
               }
            });
        });
      }

      let promiseToCheckoOwnerNotExist = function(property_id) {
        return new Promise(function (resolve, reject) {
          var owner_id;
          pgClient.query("SELECT id FROM owners WHERE owner_name = $1 AND owner_mail_address = $2 LIMIT 1", [jsonObj['owner_name'], jsonObj['owner_mailing_address']],
            function(err, result) {
              if (err) {
                errorMessage[rowNumber] = err;
                reject(errorMessage);
              } else {
                  if (result.rows.length  > 0){
                    owner_id = result.rows[0].id;
                    reject([owner_id, property_id]);
                  }
                  else {
                    resolve();
                  }
              }
          });
        });
      }

      let promiseToCheckOwnerToPropertyNotExist = function(owner_id, property_id) {
        return new Promise (function (resolve, reject) {
          pgClient.query("SELECT * FROM owner_to_property WHERE owner_id = $1 AND property_id = $2 LIMIT 1", [owner_id, property_id],
            function(err, result) {
              if (err) {
                errorMessage[rowNumber] = err;
                reject(errorMessage);
              } else {
                  if (result.rows.length  > 0){
                    errorMessage[rowNumber] = jsonObj['owner_name'] + " is registered for " + jsonObj['address'] + " address.";
                    reject(errorMessage);
                  }
                  else {
                    resolve();
                  }
              }
          });
        });
      }

      promiseToSelectPropertyID().then(function(property_id) {
        promiseToCheckoOwnerNotExist(property_id).then(function() {
            InsertOwner(function(owner_id) {
              InsertOwnerToProperty(owner_id, property_id);
            });
        }).catch(function(values){
          promiseToCheckOwnerToPropertyNotExist(values[0], values[1]).then(function(){
              InsertOwnerToProperty(values[0], values[1]);
          }).catch(function(){
            })
          })
        }).catch(function(){
      });

      let InsertOwner = function(callback){
        if (! isDry) {
          pgClient.query("INSERT INTO owners(owner_name, owner_mail_address) VALUES ($1, $2) RETURNING id", [jsonObj['owner_name'], jsonObj['owner_mailing_address']],
              function(err, result) {
                if (err) {
                  errorMessage[rowNumber] = err;
                } else {
                  callback(result.rows[0].id);
                }
          });
        }
      }

      let InsertOwnerToProperty = function(owner_id, property_id) {
        if (! isDry) {
           let today = getDate();
           pgClient.query("INSERT INTO owner_to_property (owner_id, property_id, date) VALUES ($1, $2, CAST($3 AS DATE))", [owner_id, property_id, today],
              function(err, result) {
                if (err) {
                  errorMessage[rowNumber] = err;
                }
            });
        }
      }
  }

}

function ProcessOwners(uploadPath, res, isDryRun, numberOfLines) {
  const csvFilePath = String(uploadPath);
  const csv = require('csvtojson');
  var forEach = require('async-foreach').forEach;
  errorMessage = {};
  csv()
    .fromFile(csvFilePath)
      .on('end_parsed',(jsonArrObj)=>{
        forEach(jsonArrObj, function(item, index, arr) {
          ProcessOwnerRows(item, index + 2, isDryRun, errorMessage);
          var done = this.async()
          setTimeout(function() {
            done(index !== jsonArrObj.length - 1);
          }, 5000);
        }, allDone)
      })

    // Generic "done" callback.
  function allDone(err) {
    sendMessage(errorMessage);
  }

  function sendMessage(errorMessage) {
    if (! (Object.keys(errorMessage).length === 0 && errorMessage.constructor === Object)) {
      res.status(500).send(errorMessage);
    } else {
      res.status(200).send('The data was successfully parsed.');
    }
  }

}

// Add data to evictions table.
function ProcessTempEvictions(uploadPath, res, isDryRun, numberOfLines) {
  const csvFilePath = String(uploadPath);
  const csv = require('csvtojson');
  var forEach = require('async-foreach').forEach;
  errorMessage = {};
  csv()
    .fromFile(csvFilePath)
      .on('end_parsed',(jsonArrObj)=>{
        forEach(jsonArrObj, function(item, index, arr) {
          ProcessTempEvictionRows(item, index + 2, isDryRun, errorMessage);
          var done = this.async()
          setTimeout(function() {
            done(index !== jsonArrObj.length - 1);
          }, 500);
        }, allDone)
      })

    // Generic "done" callback.
  function allDone(err) {
    sendMessage(errorMessage);
  }

  function sendMessage(errorMessage) {
    if (! (Object.keys(errorMessage).length === 0 && errorMessage.constructor === Object)) {
      res.status(500).send(errorMessage);
    } else {
      res.status(200).send('The data was successfully parsed.');
    }
  }
}

function getDate() {

  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear();

  if(dd < 10) {
      dd = '0'+dd
  }

  if(mm < 10) {
      mm = '0'+mm
  }

  return yyyy + '-' + mm + '-' + dd;

}

app.get('/properties', property);

app.post('/pledges', makePledge);
app.get('/pledges', getPledges);
app.get('/pledges/total', getPledgeTotal);

app.listen(process.env.PORT || 8888, function() {
  console.log('Express server listening on port ', process.env.PORT || 8888);
})

function distinct(value, index, self) {
  return self.indexOf(value) === index;
}

function modifyAddress(evictionAddress) {
  var address = evictionAddress.trim().toUpperCase();
  var array = [];
  array = address.split(" ");

  var lastIndex = address.lastIndexOf(' ');
  var firstIndex = address.indexOf(' ');
  var addressNumber = address.substring(0, firstIndex);
  var streetName = address.substring(firstIndex + 1, lastIndex);
  var streetType = address.substring(lastIndex + 1);

  if (array.length - 1 < 2) {
    return address;
  } else {
    if (streetType.indexOf('AVENUE') !== -1) {
      streetType = streetType.replace('AVENUE', 'AVE');
    }
    else if (streetType.indexOf('STREET') !== -1) {
      streetType = streetType.replace('STREET', 'ST');
    }
    else if (streetType.indexOf('HIGHWAY') !== -1) {
      streetType = streetType.replace('HIGHWAY', 'HWY');
    }
    else if (streetType.indexOf('COURT') !== -1) {
      streetType = streetType.replace('COURT', 'CT');
    }
    else if (streetType.indexOf('CIRCLE') !== -1) {
      streetType = streetType.replace('CIRCLE', 'CIR');
    }
    else if (streetType.indexOf('DRIVE') !== -1) {
      streetType = streetType.replace('DRIVE', 'DR');
    }
    else if (streetType.indexOf('PLACE') !== -1) {
      streetType = streetType.replace('PLACE', 'PL');
    }
    else if (streetType.indexOf('BOULEVARD') !== -1) {
      streetType = streetType.replace('BOULEVARD', 'BLVD');
    }
    else if (streetType.indexOf('ALLEY') !== -1) {
      streetType = streetType.replace('ALLEY', 'ALY');
    }
    else if (streetType.indexOf('TERRACE') !== -1) {
      streetType = streetType.replace('TERRACE', 'TER');
    }
    else if (streetType.indexOf('STAIRWAY') !== -1) {
      streetType = streetType.replace('STAIRWAY', 'STWY');
    }
    else if (streetType.indexOf('LANE') !== -1) {
      streetType = streetType.replace('LANE', 'LN');
    }
    else if (streetType.indexOf('PLAZA') !== -1) {
      streetType = streetType.replace('PLAZA', 'PL');
    }
    else if (streetType.indexOf('ROAD') !== -1) {
      streetType = streetType.replace('ROAD', 'RD');
    }
    else if (streetType.indexOf('HILL') !== -1) {
      streetType = streetType.replace('HILL', 'HL');
    }
    return addressNumber + " " + streetName + " " + streetType;
  }
}

function getAddressNumber(evictionAddress) {

  var address = evictionAddress.trim().toUpperCase();
  var lastIndex = address.lastIndexOf(' ');
  var firstIndex = address.indexOf(' ');
  var addressNumber = address.substring(0, firstIndex);

  return parseInt(addressNumber);
}

function getAddressStreet(evictionAddress) {

  var address = evictionAddress.trim().toUpperCase();
  var lastIndex = address.lastIndexOf(' ');
  var firstIndex = address.indexOf(' ');
  var streetName = address.substring(firstIndex + 1, lastIndex);

  return streetName;
}

function getEvictionTypes(evictionType) {

  // Non Payment - Non-payment of Rent
  // Breach - Breach of Lease Agreement
  // Nuisance - Nuisance
  // Illegal Use - Illegal Use of Unit
  // Failure to Sign Renewal - Failure to Sign Lease Renewal
  // Access Denial - Denial of Access to Unit
  // Unapproved Subtenant - Unapproved Subtenant
  // Owner Move In - Owner move in, omi
  // Demolition - Demolition
  // Capital Improvement - Capital Improvement
  // Substantial Rehab - Substantial Rehabilitation
  // Ellis Act WithDrawal - Ellis Act WithDrawal, ellis
  // Condo Conversion - Condo Conversion
  // Roommate Same Unit - Roommate Living in Same Unit
  // Other Cause - Other
  // Late Payments - Habitual Late Payment of Rent
  // Lead Remediation - Lead Remediation
  // Development - Development Agreement
  // Good Samaritan Ends - Good Samaritan Tenancy Ends
  var eviction = evictionType.toUpperCase();
/*  var array = ["NON-PAYMENT OF RENT", "BREACH OF LEASE AGREEMENT", "NUISANCE", "ILLEGAL USE OF UNIT", "FAILURE TO SIGN LEASE RENEWAL", "DENIAL OF ACCESS TO UNIT",
              "UNAPPROVED SUBTENANT", "OWNER MOVE IN", "OMI", "DEMOLITION", "CAPITAL IMPROVEMENT", "SUBSTANTIAL REHABILITATION", "ELLIS ACT WITHDRAWAL",
              "ELLIS", "CONDO CONVERSION", "ROMMATE LIVING IN SAME UNIT", "OTHER", "HABITUAL LATE PAYMENT OF RENT", "LEAD REMEDIATION", "DEVELOPMENT AGREEMENT",
              "GOOD SAMARITAN TENANCY ENDS"];*/

  var obj = {"NON-PAYMENT OF RENT": "Non Payment", "BREACH": "Breach", "BREACH OF LEASE AGREEMENT": "Breach", "NUISANCE": "Nuisance", "ILLEGAL USE OF UNIT": "Illegal Use",
          "FAILURE TO SIGN LEASE RENEWAL": 'Failure to Sign Renewal', "DENIAL OF ACCESS TO UNIT": "Access Denial", "UNAPPROVED SUBTENANT": "Unapproved Subtenant",
          "OWNER MOVE IN": "Owner Move In", "OMI": "Owner Move In", "DEMOLITION": "Demolition", "CAPITAL IMPROVEMENT": "Capital Improvement",
          "SUBSTANTIAL REHABILITATION": "Substantial Rehab", "ELLIS ACT WITHDRAWAL": "Ellis Act WithDrawal", "ELLIS": "Ellis Act WithDrawal",
          "CONDO CONVERSION": "Condo Conversion", "ROMMATE LIVING IN SAME UNIT": "Roommate Same Unit", "OTHER": "Other Cause", "HABITUAL LATE PAYMENT OF RENT": "Late Payments",
          "LEAD REMEDIATION": "Lead Remediation", "DEVELOPMENT AGREEMENT": "Development", "GOOD SAMARITAN TENANCY ENDS": "Good Samaritan Ends"};

  var array = Object.keys(obj);
  var result = [];

  result = array.filter(function(strEviction) {
    return eviction.indexOf(strEviction) !== -1;
  });

  result = result.map(function(strEviction) {
    return obj[strEviction];
  });

  return result;
}
