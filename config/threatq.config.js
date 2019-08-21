module.exports = {
    /**
     * An array of ThreatQ status objects.  The config includes the default statuses.  You can add additional custom
     * statuses that you have added to your ThreatQ instance here.
     *
     * To review all custom statuses you can use the following endpoint (must be queried as an admin)
     *
     * GET https://<your-threatq-server>/api/indicator/statuses
     *
     * value {String} the ID value for the given status
     * display {String} The Display value for the status
     * default {Boolean} Whether the given status should be set as a default status to lookup
     */
  threatQStatuses: [
      {
          value: '1',
          display: 'Active',
          default: true
      },
      {
          value: '2',
          display: 'Expired',
          default: false
      },
      {
          value: '3',
          display: 'Indirect',
          default: false
      },
      {
          value: '4',
          display: 'Review',
          default: true
      },
      {
          value: '5',
          display: 'Whitelisted',
          default: false
      }
  ],
  /**
   * name {String} name of the attribute you wish to display.  Must match exactly and is case sensitive.
   * editable {Boolean} true if you want this attribute to be editable, false if not
   * values {Array|String} an array of string options to set the attribute to.  If empty or not provided the
   *       attribute values will be a free form input.
   *
   * Example:
   *
   * threatQAttributes: [{
   *   name: 'Investigation',
   *   editable: false
   * },
   * {
   *   name: 'Confidence',
   *   editable: ['low', 'medium', 'high']
   * },
   * {
   *   name: 'False Positive',
   *   editable: true,
   *   values: ['true', 'false']
   * }]
   */
  threatQAttributes: [
    {
      name: 'Investigation',
      editable: false
    },
    {
      name: 'Confidence',
      editable: true
    },
    {
      name: 'False Positive',
      editable: true,
      values: ['true', 'false']
    }
  ],
  /**
   * Each threatQ instance has different IDs for typical indicators.  The following configuration property is used
   * to setup the unique IDs for each supported indicator type.  The supported indicator types are:
   *
   * ipv4, email, domain, md5, sha1, sha256, url
   *
   * Each type should have a corresponding numeric ID.  If you are a threatQ admin you can find a list of types
   * navigating to the following URL after authenticating with your ThreatQ instance:
   *
   * https://<your-threatq-server>/api/indicator/types
   *
   * Note that if this endpoint returns an empty result `{}` your account does not have access to view the indicator
   * types.
   *
   * Please contact your ThreatQ administrator for these values if you are unable to access the above endpoint.
   *
   * Example Values:
   *
   * threatQIndicatorTypes: {
   *  ipv4: 11,
   *  email: 3,
   *  domain: 8,
   *  md5: 12,
   *  sha1: 16,
   *  sha256: 17,
   *  url: 21
   * }
   */
  threatQIndicatorTypes: {
    ipv4: 11,
    email: 3,
    domain: 8,
    md5: 12,
    sha1: 16,
    sha256: 17,
    url: 21,
    ipv4cidr: 1
  }
};
