var basicCSV = require('basic-csv');
var fs = require('graceful-fs');
var config = require('./config')

var dbQuery = require('pg-query');

dbQuery.connectionParameters = 'postgres://'+ config.db.user + ':' + config.db.pass + '@'+ config.db.host + ':' + config.db.port + '/' + config.db.name;

basicCSV.readCSV('evictors.csv', {
   dropHeader: false
}, function (error, rows) {
    var res = {};
	for(i=0; i < rows.length; i ++) {
	   var row = rows[i];
	   for(j=1; j < row.length; j++) {
	     var field = row[j].trim();
	     if (field && field != "#VALUE!") {
	  		 if (res.hasOwnProperty(field)) {
	   			res[field].push(row[0]);
	 	 	 } else {
	 		  	var arr = [];
	 		  	arr.push(row[0]);
	 		  	res[field] = arr;
	 		  }
	 	  }
	   }
	}

  query("SELECT * FROM properties ORDER BY properties.geom <-> ST_GeomFromText('POINT(-122.44301 37.724046)', 4326) LIMIT 5;", function(err, query_rows, result) {
  console.log(query_rows)
});
  });