var fs = require('graceful-fs');
var config = require('../config')
var dbQuery = require('pg-query');
var restify = require('restify');
var util = require("util");
var async = require("async");

var connString = 'postgres://'+ config.db.user + ':' + config.db.pass + '@'+ config.db.host + ':' + config.db.port + '/' + config.db.name;
dbQuery.connectionParameters = connString;

fs.writeFileSync('blklot_neweviction.sql', '');

	//dbQuery("select omi_address_temp.petition, omi_address_temp.address_orig, omi_address_temp.zipcode from omi_address_temp left outer join blklot_omi on (omi_address_temp.petition = blklot_omi.petition) where blklot_omi.blk_lot is null", 
		dbQuery("select ellis_act_evictions.petition, blklot_ellis.blk_lot, petition_address_temp.address_orig, address_blklot.addr_num, address_blklot.st_name, address_blklot.st_type, address_blklot.unit_num from ellis_act_evictions left outer join blklot_ellis on (ellis_act_evictions.petition = blklot_ellis.petition) left outer join petition_address_temp on (ellis_act_evictions.petition = petition_address_temp.petition) left outer join address_blklot on (blklot_ellis.blk_lot = address_blklot.blk_lot) where blklot_ellis.blk_lot is null and address_orig is not null", 
			[],
			function(err, query_rows, results) {
				if (err) {
					console.log(err);
				} else {
					console.log("addresses found: " + query_rows.length);
					query_rows.map(function(row) {
						var petition = row.petition;	
			//	var theAddresses = row.address_orig.replace(/\//g, ",").replace(/\\/g, ",").split(",");
			//    var addresses = [];


			function getBlkLots(row, callback) {
				var address_orig = row.address_orig;
				console.log("getting blklots for address: " + address_orig);
				var address = address_orig.trim();
				var range = address.substring(0, address.indexOf(' ')).trim().split('-');
				var st_nums = [parseInt(range[0])];
				if(range[1] !== undefined){
					var next_num = parseInt(range[0]) + 2;
					while (next_num <= parseInt(range[1])){
						st_nums.push(next_num);
						next_num = next_num +2;
					};
				};
				if (range[0]) {
					var st_name = address.substring(address.indexOf(' '), address.lastIndexOf(' ')).trim().toUpperCase();
					var nums = st_nums.join(',');
					console.log("abouut to call for: " + nums + " " + st_name);
					dbQuery('SELECT blk_lot from address_blklot WHERE st_name = $1:: text AND addr_num IN (' + nums + ')', //AND zipcode = $2', 
						[st_name],
						function(err, query_rows, results) {
							console.log("st name: " + st_name.toUpperCase() );
							console.log("st num: " + st_nums.join(','));
							if (err) {
								console.log(err);
							} else {
								console.log("query_rows: " + query_rows);
								callback(null, query_rows.map(function(row){return row.blk_lot}));
							}
						});
				}
			};

			async.concatSeries([row], getBlkLots, function(err, results) {
				console.log("concat happening");
				if (err){
					console.log("err in concat: " + err);
				} else {
					console.log("results reached in concat: " + results);
					var blk_lots = results.filter(distinct);
					blk_lots.map(function(blk_lot){
						fs.appendFileSync('blklot_neweviction.sql', 
							"INSERT INTO blklot_ellis (blk_lot, petition) VALUES ('"+blk_lot + "', '" + petition + "');\n");
					});
				}
			});
		});
}
});

function distinct(value, index, self) { 
	return self.indexOf(value) === index;
}