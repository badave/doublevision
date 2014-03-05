var Bookshelf = require('../initializers/bookshelf');

exports.up = function(next){
  Bookshelf.primary.knex.schema.hasTable('users').then(function(exists) {
    if(!exists) {
      Bookshelf.primary.knex.schema.createTable('users', function(table) {

        table.bigIncrements('id').primary();
        table.string('email')
          .notNullable()
          .index()
          .unique();

        table.string('first_name').index();
        table.string("middle_name").index();
        table.string("last_name").index();
        table.string("type").index();
        table.string("hash");
        table.string("salt");

        table.json('data');
        table.json("metadata");
        table.uuid("unique_id");

        table.string("timezone").defaultTo("utc");
        table.string('currency').defaultTo("usd");
        table.boolean('admin');
        
        table.timestamps();

        var reserved = { 
          "integer": 5, 
          "string": 5,
          "bigInteger": 3,
          "json": 2
        };

        for(var key in reserved) {
          for(var i = 0; i < reserved[key]; i++) {
            table[key]("reserved_" + key + "_" + i    );
          }
        }

      }).then(function(table) {
        console.log("Completed creating users table");
        next();
      });
    } else {
      console.log("Users table already exists.  Drop table if you wish to create");
      next();
    }
  });
};

exports.down = function(next){
  Bookshelf.primary.knex.schema.dropTableIfExists("users")
  .then(function() {
    console.log("Dropped users table");
    next();
  });
};
