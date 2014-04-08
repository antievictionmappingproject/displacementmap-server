var fs = require('graceful-fs');
var config = require('../config')
var dbQuery = require('pg-query');
var restify = require('restify');
var util = require("util");
var async = require("async");
var basicCSV = require('basic-csv');

var connString = 'postgres://'+ config.db.user + ':' + config.db.pass + '@'+ config.db.host + ':' + config.db.port + '/' + config.db.name;
dbQuery.connectionParameters = connString;

fs.writeFileSync('srdisabled.cql', '');
fs.writeFileSync('notfoundsrdisabled.cql', '');


basicCSV.readCSV('seniors.csv', {
	dropHeader: true
}, function (error, rows) {
	var res = {};
	rows.map(function(row){
		dbQuery("select * from ellis_act_evictions where petition = $1 :: text", 
			[row[0]],
			function(err, query_rows, result) {
				if (query_rows.length > 0) {
					var numEvictions = parseInt(row[8]) || Math.ceil(parseInt(row[7]) * .75);
					fs.appendFileSync('srdisabled.cql', 'UPDATE ellis_act_evictions set protected = ' + numEvictions + " where petition = '" + query_rows[0].petition + "';\n");
				}
				else fs.appendFileSync('notfoundsrdisabled.cql', row[0] + "\n");
			})
	})
});