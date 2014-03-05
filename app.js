// Modules
if(process.env['NODE_ENV'] === "production") {
  require('newrelic');
}

var http = require('http');
var express = require('express');
var cors = require('cors');
var hbs = require('hbs');

var path = require('path');
var port = process.env['PORT'] || 11111;
var env = process.env['NODE_ENV'] || 'development';
var pid = process.pid;

var less = require('less-middleware');

// Initializers
require('./initializers');
require('./initializers/lodash-extensions');
require('./initializers/handlebars');
require('./initializers/bookshelf');

// Config
config.proc = 'APP';

// Start the App
var app = express();

// Load App Middleware
var middleware = require('./middleware');

// Configure App
// All middleware needs to be above the app.router call
app.configure('development', function(){});

app.configure('sandbox', function() {
  app.use(middleware.redirectToSSL);
});

app.configure('staging', function() {
  app.use(middleware.redirectToSSL);
});

app.configure('production', function() {
  app.use(middleware.redirectToSSL);
});

app.configure(function() {

  app.use(less({
      src: __dirname + '/less',
      dest: __dirname + '/public/css',
      prefix: '/css',
      compress: true,
      force: config.test
  }));
  
  // static assets
  var oneDay = 86400000;
  var oneYear = 31536000000;
  app.use(express.static(path.join(__dirname, 'public'), {maxAge: oneDay}));
  app.use(express.static(path.join(__dirname, 'assets'), {maxAge: oneYear}));

  // Configuration
  app.set('port', port);
  app.enable('trust proxy'); // This lets req.ip show the real IP address on Heroku
  app.use(cors()); // enable CORS
  app.use(express.logger('dev')); // TODO use bunyun, enable logging
  app.use(express.compress()); // gzip all responses
  app.use(express.methodOverride());
  app.use(express.timeout(20000)); // default: 5000ms, set a 20s timeout for requests
  app.use(express.responseTime()); // adds X-Response-Time header in response
  app.use(express.favicon()); // support favicon

  app.engine('handlebars', require('hbs').__express);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'handlebars');
  app.set('view options', {layout: false});

  // Preperation
  app.use(middleware.errorDomain);
  app.use(express.query());
  app.use(express.urlencoded()); // parse request body for urlencoded / form
  app.use(express.json()); // parse request body for json

  app.use(app.router); // start the router
  app.use(middleware.responseHandler); // default res handler
  app.use(middleware.errorHandler); // default err handler
  app.use(middleware.finalHandler); // default err handler
});

// Server
var server = http.createServer(app).listen(app.get('port'), function() {
  console.log("=== [SUCCESS] Slave with pid %s listening on port %d in %s mode".green, pid, pid, port, env);

  // Routes
  require('./routes')(app);
});
