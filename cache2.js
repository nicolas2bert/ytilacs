const level = require('level');
const Cache = require('levelup-cache');
const sublevel = require('level-sublevel');

const db = level('./mydb');
const sub = sublevel(db);
const subCache = sub.sublevel('subCache');
const options = { refreshEvery: 1000, checkToSeeIfItemsNeedToBeRefreshedEvery: 10 };

const METASTORE = '__metastore';

const metastore = sub.sublevel(METASTORE);

metastore.put('firstname','Nicolas');
metastore.put('username','nicolas2bert');

const source = {};
// fulfill source with metastore datas
metastore.createReadStream()
  .on('data', function (data) {
    source[data.key] = data.value;
  })
  .on('error', function (err) {
    console.log('Oh my!', err);
  })
  .on('close', function () {
    console.log('Stream closed');
  })
  .on('end', function () {
    console.log('source',source);
  })
// fetch from source
function fetchFromSomewhere(key, cb) {
    setTimeout(function() {
        cb(false, source[key])
    }, 100)
}

const cache = new Cache(subCache, fetchFromSomewhere , options);

metastore.close();
//metastore.put('firstname','Jean');

//cache is still working after metastore died
setTimeout(function() {
	cache.get('firstname', function(err,res){
		console.log('Nicolas => ', res);
	});
}, 2000);