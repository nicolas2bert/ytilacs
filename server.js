'use strict'; 

const net = require('net');
// create `db`
const level = require('level');
const sublevel = require('level-sublevel');
const multilevel = require('multilevel');
const cluster = require('cluster');


const METASTORE = '__metastore';

const numCPUs = require('os').cpus().length;

const constants = {usersBucket: 'users..bucket'};

class BucketFileInterface {

	startServer(){
		console.log('tryyyy');
	    const db = level('database');
	    const sub = sublevel(db);
		// extend `db` with a foo(cb) method
		db.methods = db.methods || {};
		db.methods['createSub'] = { type: 'async' };
		sub.createSub = (subName, cb) => {
	        try {
	        	console.log('sub');
	            sub.sublevel(subName);
	            multilevel.writeManifest(sub, __dirname + '/manifest.json');
	 			sub.createReadStream().on('data', console.log);
	            //fs.renameSync(METADATA_PATH + MANIFEST_JSON_TMP,METADATA_PATH + MANIFEST_JSON);
	            cb();
	        } catch (err) {
	            cb(err);
	        }
	    };

	    const metastore = sub.sublevel(METASTORE);
	       /* Since the bucket creation API is expecting the
	           usersBucket to have attributes, we pre-create the
	           usersBucket here */
	    sub.sublevel(constants.usersBucket);
	    const usersBucketAttr = {
	        name: constants.usersBucket,
	        owner: 'admin',
	        ownerDisplayName: 'admin',
	    };
	    metastore.put(constants.usersBucket, JSON.stringify(usersBucketAttr));
	    const stream = metastore.createKeyStream();

	    stream
	   			.on('data', e => {
	                // automatically recreate existing sublevels
	                console.log('E => ',e);
	                sub.sublevel(e);
	            })
	            .on('error', err => {
	                console.log('error listing metastore', { error: err });
	                throw (errors.InternalError);
	            })
	            .on('end', () => {
	                console.log('starting metadata file backend server');
	                // now write the manifest to a file
					multilevel.writeManifest(sub, __dirname + '/manifest.json');

					net.createServer(function (con) {
						//console.log('CON',con);
						console.log('con');
					    con.pipe(multilevel.server(sub)).pipe(con);
					}).listen(3000);
	            });
	};

	startClient(){
		console.log("client");
		const manifest = require('./manifest.json');
		this.subClient = multilevel.client(manifest);
		// now pipe the db to the server
		var net = require('net');
		var con = net.connect(3000);
		con.pipe(this.subClient.createRpcStream()).pipe(con);
		this.metastore = this.subClient.sublevel(METASTORE);
	};

	createBucket(bucketName, bucketMD, cb) {
        //this.ref();
        console.log('create bucket START');
        this.getBucketAttributesNoRef(bucketName, err => {
            if (err && err !== errors.NoSuchBucket) {
                //this.unRef();
                return cb(err);
            }
            if (err === undefined) {
                //this.unRef();
                return cb(errors.BucketAlreadyExists);
            }
            // IF NO SUCH BUCKET
            console.log('NO SUCH BUCKET');
            this.client.createSub(bucketName, err => {
                if (err) {
                    console.error('error creating sublevel', { error: err });
                    //this.unRef();
                    return cb(errors.InternalError);
                }
                // we hold a ref here
                console.log('yesss create sublevel');
                this.putBucketAttributesNoRef(bucketName,
                                              bucketMD,
                                              err => {
                                                  //this.unRef();
                                                  return cb(err);
                                              });
                return undefined;
            });
            return undefined;
        });
        return undefined;
    }

    getBucketAttributesNoRef(bucketName, cb) {
    	//console.log(this.metastore);
        this.metastore.get(bucketName, (err, data) => {
            if (err) {
                if (err.notFound) {
                	console.log('NO SUCH BUCKET getBucketAttributesNoRef');
                    return cb(errors.NoSuchBucket);
                }
                console.error('error getting db attributes',
                          { error: err });
                return cb(errors.InternalError, null);
            }
            console.log('data created :', data);
            return cb(null, JSON.stringify(data));
        });
        console.log('undefined');
        return undefined;
    }

    putBucketAttributesNoRef(bucketName, bucketMD, cb) {
        this.metastore.put(bucketName, bucketMD.serialize(),
                           OPTIONS,
                           err => {
                               if (err) {
                                   console.error('error putting db attributes',
                                             { error: err });
                                   return cb(errors.InternalError);
                               }
                               return cb();
                           });
        return undefined;
    }



};


const BucketFile = new BucketFileInterface();

if (cluster.isMaster){
	console.log('master');
	BucketFile.startServer();
	setTimeout(function() {
		for (var i = 0; i < numCPUs; i++) {
			cluster.fork();
		}
	}, 1000);
}else{
	console.log('forks');
	BucketFile.startClient();
}

setTimeout(function() {
	BucketFile.createBucket('foo', {}, err => {
	    if (err) {
	        console.log('error from metadata', { implName, error: err });
	        //return cb(err);
	    }
	    console.log('bucket created in metadata');
	    //return cb(err);
	});
}, 2000);


 
