// Create Server
// heroku config:add NODE_ENV="production"
// heroku config:add TZ="America/Los_Angeles"
// http://heroku-buildpack-nodejs.s3.amazonaws.com/manifest.nodejs (node.js versions heroku supports)
// http://heroku-buildpack-nodejs.s3.amazonaws.com/manifest.npm (npm versions heroku supports)

// Modules

// Cluster and Domain
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var env = process.env['NODE_ENV'] || 'development';
var pid = process.pid;


// Use Clusters (Master / Fork)
if (cluster.isMaster && (env === 'production' || env === 'staging' || env === 'sandbox')) {
  // Start 1 fork per CPU
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart the fork if it disconnects
  cluster.on('disconnect', function(worker) {
    cluster.fork();
  });

  // Fork successfully started
  cluster.on('online', function(worker) {
  });
} else {
  require('./app');
}
