var multilevel = require('multilevel');
var manifest = require('./manifest.json');

var db = multilevel.client(manifest);

// now pipe the db to the server
var net = require('net');
var con = net.connect(3000);
con.pipe(db.createRpcStream()).pipe(con);

// and you can call the custom `foo` method!
db.foo(function (err, res) {
  console.log(res); // => "bar"
});