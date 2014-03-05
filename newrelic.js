/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : ['Referral-App'],
  /**
   * Your New Relic license key.
   */
  license_key : '38a4c16e59ec8d8bed7daaf025576d09ce3aea62',
  
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'info'
  },

  error_collector : {
    enabled: true
  },
  
  transaction_tracer : {
    enabled: true,
    transaction_threshold: 'APDEX_F',
    TOP_N : 20
  }
};
