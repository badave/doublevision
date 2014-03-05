var _ = require('lodash');
var Base = require('./base');

module.exports = Base.extend({
  className: "UserRenderer",
  
  schema: function() {
  	var waitlist_number = this.model.get("data") && this.model.get("data").waitlist_number;
  	
    return {
    	id: this.model.get("id"),
      email: this.model.get('email'),
      name: this.model.get('first_name'),
      waitlist_number: waitlist_number
    };
  }
  
});