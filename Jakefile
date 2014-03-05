desc("Default task does squat");
task("default", function(params) {
  console.log("jake -T to see available tasks");
});


namespace('user', function() {
  var scripts = new require('./tasks/user')
  desc("Create a user");
  task("create", function(params) {
    scripts.create();
  })


  desc("Login as a user");
  task("login", function(params) {
    scripts.login();
  })
});

namespace("products", function() {
  var scripts = new require('./tasks/product');

  desc("Create a product");
  task("create", function(params) {
    scripts.create();
  });

  desc("Update a product");
  task("update", function(params) {
    scripts.update();
  });


  desc("List products");
  task("list", function(params) {
    scripts.list();
  });
});


namespace("customers", function() {
  var scripts = new require('./tasks/customer');

  desc("Create a customer");
  task("create", function(params) {
    scripts.create();
  });

  desc("Update a customer");
  task("update", function(params) {
    scripts.update();
  });


  desc("List customers");
  task("list", function(params) {
    scripts.list();
  });
});


namespace("orders", function() {
  var scripts = new require('./tasks/order');

  desc("Create an orders");
  task("create", function(params) {
    scripts.create();
  });

  desc("Update an order");
  task("update", function(params) {
    scripts.update();
  });


  desc("List orders");
  task("list", function(params) {
    scripts.list();
  });
});

namespace("line_items", function() {
  var scripts = new require('./tasks/line_item');

  desc("Create a line_item");
  task("create", function(params) {
    scripts.create();
  });

  desc("Update a line_item");
  task("update", function(params) {
    scripts.update();
  });


  desc("List line_items");
  task("list", function(params) {
    scripts.list();
  });
});

namespace("addresses", function() {
  var scripts = new require('./tasks/address');

  desc("Create an address");
  task("create", function(params) {
    scripts.create();
  });

  desc("Update an address");
  task("update", function(params) {
    scripts.update();
  });


  desc("List addresses");
  task("list", function(params) {
    scripts.list();
  });
});