var basicCSV = require('basic-csv');
var fs = require('graceful-fs');

// //for entry in data
// petition = entry.shift
//   entry.each do |e|
//     lst = res[e] ||= []
//     lst << petition
//   end
// end

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
	
/*
sorting to manually clean data
	keys = Object.keys(res),
    i, len = keys.length;

keys.sort();

for (i = 0; i < len; i++)
{
    k = keys[i];
    console.log(k + ':' + res[k]);
}
*/

/*
	puts "CREATE (p:Person {name: \"#{person}\"})"
  	for petition in petitions
      puts "MATCH (e:Eviction {petition_number: \"#{petition}\"})"
      puts "(e)-[:EVICTOR]->(p);"
      */



count = 0;

for(var name in res) {
	evictions = res[name];
	
	fs.appendFile('evictors.cql', 'begin \nMATCH ', function(err) {
    	if(err) {
    	    console.log(err);
    	}
	}); 
	
	eviction = "";
	for (k = 0; k < evictions.length; k++) {
		eviction += '(e' + k + ':Eviction {petition_number: "' + evictions[k] + '"}),\n';
	}
	eviction = eviction.substring(0, eviction.length -2);

	fs.appendFile('evictors.cql', eviction, function(err) {
   		 if(err) {
       		console.log(err);
   		 }
  	});
	
	fs.appendFile('evictors.cql', '\nCREATE (p:Person {name: "' + name + '"}),\n', function(err) {
    if(err) {
        console.log(err);
    }
    });

	createStatement = "";
	for (l = 0; l < evictions.length; l++) {
		createStatement += '(p)-[:EVICTOR]->(e' + l + '),\n';
	}
	createStatement = createStatement.substring(0, createStatement.length -2);
	
	fs.appendFile('evictors.cql', createStatement, function(err) {
   		 if(err) {
       		console.log(err);
   		 }
  	});

	fs.appendFile('evictors.cql', '\ncommit \nexit \n', function(err) {
    	if(err) {
     	   console.log(err);
    	}
	}); 
}
});

// basicCSV.readCSV('properties.csv', {
//   dropHeader: true
// }, function (error, rows) {
//   fs.appendFile('properties.cql', 'CREATE ', function(err) {
//     if(err) {
//         console.log(err);
//     }
//    }); 
//    
//   for(i=0; i < rows.length; i ++) {
//   var row = rows[i];
//   var createStatement = ',(p' +i + ':Property {address: "' + row[1] + '", ' + 
//        hasValue("lat", row[2]) + 
//        hasValue("lon", row[3]) + 
//       'addresses: "' + row[4] + '"}),' +
//       '(e' + i + ':Eviction {petition_number: "'+ row[0] + '", date: "' + row[5] + '",' +
//       hasValue("units", row[6]) +
//       'landlord: "' + row[7] + '"}),' +
//       '(e' + i + ')-[r' + i +':EVENT]->(p' + i +')\n';
//   if (i == 0) createStatement = createStatement.substring(1);
//   fs.appendFile('properties.cql', createStatement, function(err) {
//     if(err) {
//         console.log(err);
//     }
//    }); 
//  };
// });
// 
// function hasValue(label, n){
//     if (typeof(n) != "boolean" && !isNaN(n)) {
//        return label +': ' + n + ', ';
//     } else {
//        return '';
//     };
// }

var express = require('express');
var neo4j = require('node-neo4j');

db = new neo4j('http://localhost:7474');
var app = express();
console.log('hello world!');

app.get('/hello.txt', function(req, res){
  res.send('Hello World');
});

//app.listen(3000);
//console.log('Listening on port 3000');
