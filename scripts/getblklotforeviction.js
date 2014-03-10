var fs = require('graceful-fs');
var config = require('../config')
var dbQuery = require('pg-query');
var restify = require('restify');
var util = require("util");
var async = require("async");


dbQuery.connectionParameters = 'postgres://'+ config.db.user + ':' + config.db.pass + '@'+ config.db.host + ':' + config.db.port + '/' + config.db.name;

fs.writeFileSync('blklot_eviction.output', '');

dbQuery("select evictions.petition, blklot_ellis.blk_lot, petition_address_temp.address_orig, address_blklot.addr_num, address_blklot.st_name, address_blklot.st_type, address_blklot.unit_num from evictions left outer join blklot_ellis on (evictions.petition = blklot_ellis.petition) left outer join petition_address_temp on (evictions.petition = petition_address_temp.petition) left outer join address_blklot on (blklot_ellis.blk_lot = address_blklot.blk_lot) where blklot_ellis.blk_lot is null and address_orig is not null", 
	[],
	function(err, query_rows, results) {
		query_rows.map(function(row) {
			var petition = row.petition;	
			var addresses = row.address_orig.replace(/\//g, ",").replace(/\\/g, ",").split(",");

			function getBlkLots(address_orig, callback) {
				var address = address_orig.trim();
				var range = address.substring(0, address.indexOf(' ')).trim().split('-');
				var st_nums = [range[0]];
				if(range[1] !== undefined){
					var next_num = parseInt(range[0]) + 2;
					while (next_num <= parseInt(range[1])){
						st_nums.push(next_num);
						next_num = next_num +2;
					};
				};
				var st_name = address.substring(address.indexOf(' '), address.lastIndexOf(' ')).trim();
				dbQuery('SELECT blk_lot from address_blklot WHERE st_name = \'' + st_name.toUpperCase() + '\' AND addr_num IN (' + st_nums.join(',') + ')', 
					[],
					function(err, query_rows, results) {
						if (err) {
							console.log(err);
						} else {
							callback(null, query_rows.map(function(row){return row.blk_lot}));
						}
					});
			};

			async.concat(addresses, getBlkLots, function(err, results) {
				var blk_lots = results.filter(distinct);
				blk_lots.map(function(blk_lot){
					fs.appendFileSync('blklot_eviction.output', 
						"INSERT INTO blklot_ellis (blk_lot, petition) VALUES ('"+blk_lot + "', '" + petition + "');\n");
				});
			});
		});
});

function distinct(value, index, self) { 
	return self.indexOf(value) === index;
}