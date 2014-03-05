var Bookshelf = require('../initializers/bookshelf');

var helpers = module.exports = {
  createTable: function(table_name, yield, next) {
    var that = this;
    Bookshelf.primary.knex.schema.hasTable(table_name).then(function(exists) {
      if(exists) {
        console.log(table_name, 'already exists');
        return next();
      }

      Bookshelf.primary.knex.schema.createTable(table_name, function(table) {
        that.common(table);
        yield(table);
      }).then(function(table) {
        console.log('Created', table_name);
        next();
      }).otherwise(function(err) {
        console.error('Error creating', table_name, 'table');
        console.error(err);
      });
    });
  },

  reserved: function(table) {
    var reserved = { 
      "integer": 5, 
      "string": 5,
      "bigInteger": 3,
      "json": 2
    };

    for(var key in reserved) {
      for(var i = 0; i < reserved[key]; i++) {
        table[key]("reserved_" + key + "_" + i);
      }
    }
  },

  common: function(table) {
    table.bigIncrements('id').primary();
    table.string('env').index();
    table.timestamps();
  },

  dropTable: function(table_name, next) {
    Bookshelf.primary.knex.schema.dropTableIfExists(table_name)
    .then(function() {
      console.log("Dropped", table_name, "table");
      next();
    })
    .otherwise(function(err) {
      console.error("Error dropping table: ", err);
      next(err);
    });
  }
};