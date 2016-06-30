const level = require('level');
const Cache = require('levelup-cache');
const sublevel = require('level-sublevel');

const METASTORE = '__metastore';

const db = level('./mydb');
const sub = sublevel(db);
const metastore = sub.sublevel(METASTORE);

const options = {};

metastore.put('username','Nicolas2bert');

const cache = new Cache(metastore, function(key, cb) {
}, options);

metastore.put('username','Coco');

//db.close();


setTimeout(function() {

	metastore.get('username', function(err,value){
		console.log(value);
	});
	cache.get('username', function(err, value) {
		console.log('username s value',value);
	});

}, 3000);