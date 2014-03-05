// Modules

module.exports = function(app) {

  // Setup Controllers
  var Controllers = {};

  // Crud
  Controllers.user = require('./controllers/user');

  // Automagically hook up all routes defined in controllers
  _.each(Controllers, function(Controller) {
    var controller = new Controller();
    var routes = controller.routes;

    _.each(routes, function(route, method) {
      _.each(route, function(options, path) {
        if (!options.action) {
          return _.warn("route: [" + method + "]", path, ' is not defined');
        }

        app[method](path, options.middleware || [], controller.before || [], function(req, res, next) {
          options.action.call(controller, req, res, next);
        }, controller.after || []);

        _.verbose(controller.className.green + " [".magenta + method.toUpperCase().magenta + "] ".magenta + path.cyan);
      });
    });
  });

  // Root Route
  app.get("/", function(req, res, next) {
    var context = {
      title: config.title,
      layout: 'home/layout'
    };
    
    return _.render(req, res, 200, 'home/index', context);
  });

  // Root Route
  app.get("/about", function(req, res, next) {
    var context = {
      title: config.title,
      layout: 'home/layout'
    };
    
    return _.render(req, res, 200, 'home/about', context);
  });

};
