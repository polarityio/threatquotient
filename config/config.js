module.exports = {
  /**
   * Name of the integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @required
   */
  name: 'ThreatQ',
  /**
   * The acronym that appears in the notification window when information from this integration
   * is displayed.  Note that the acronym is included as part of each "tag" in the summary information
   * for the integration.  As a result, it is best to keep it to 4 or less characters.  The casing used
   * here will be carried forward into the notification window.
   *
   * @type String
   * @required
   */
  acronym: 'TQ',
  /**
   * Description for this integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @optional
   */
  description: "Threat Quotient integration for IP's, hashes, domains, and email",
  entityTypes: ['IPv4', 'IPv6', 'hash', 'domain', 'email'],
  /**
   * An array of style files (css or less) that will be included for your integration. Any styles specified in
   * the below files can be used in your custom template.
   *
   * @type Array
   * @optional
   */
  styles: ['./styles/tq.less'],
  /**
   * Provide custom component logic and template for rendering the integration details block.  If you do not
   * provide a custom template and/or component then the integration will display data as a table of key value
   * pairs.
   *
   * @type Object
   * @optional
   */
  block: {
    component: {
      file: './component/tq.js'
    },
    template: {
      file: './templates/tq.hbs'
    }
  },
  request: {
    // Provide the path to your certFile. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    cert: '',
    // Provide the path to your private key. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    key: '',
    // Provide the key passphrase if required.  Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    passphrase: '',
    // Provide the Certificate Authority. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    ca: '',
    // An HTTP proxy to be used. Supports proxy Auth with Basic Auth, identical to support for
    // the url parameter (by embedding the auth info in the uri)
    proxy: '',
    /**
     * If set to false, the integration will ignore SSL errors.  This will allow the integration to connect
     * to the ThreatQ server without valid SSL certificates.  Please note that we do NOT recommending setting this
     * to false in a production environment.
     */
    rejectUnauthorized: true
  },
  logging: {
    level: 'info' //trace, debug, info, warn, error, fatal
  },
  /**
   * Options that are displayed to the user/admin in the Polarity integration user-interface.  Should be structured
   * as an array of option objects.
   *
   * @type Array
   * @optional
   */
  options: [
    {
      key: 'url',
      name: 'ThreatQ Server URL',
      description:
        'The URL for your ThreatQ server which should include the schema (i.e., http, https) and port if required',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'username',
      name: 'Username',
      description: 'Your TQ username you want the integration to authenticate as (typically an email address)',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'password',
      name: 'Password',
      description: 'The password for the provided username you want the integration to authenticate as',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'client',
      name: 'Client ID',
      description:
        'The Client ID for your ThreatQ deployment.  (accessible at https://<yourserver>/assets/js/config.js)',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'allowAddingTag',
      name: 'Enable Adding Tags',
      description: 'If checked, users will be able to add new tags from the overlay window',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'allowDeletingTags',
      name: 'Enable Deleting Tags',
      description: 'If checked, users will be able to delete tags from the overlay window',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'minimumScore',
      name: 'Minimum Score',
      description: 'The minimum indicator score required for indicators to be returned by the integration',
      default: {
        value: '5',
        display: 'Low'
      },
      type: 'select',
      options: [
        {
          value: '10',
          display: '10 - Very High'
        },
        {
          value: '9',
          display: '9 - High'
        },
        {
          value: '8',
          display: '8 - Medium'
        },
        {
          value: '7',
          display: '7 - Medium'
        },
        {
          value: '6',
          display: '6 - Low'
        },
        {
          value: '5',
          display: '5 - Low'
        },
        {
          value: '4',
          display: '4 - Very Low'
        },
        {
          value: '3',
          display: '3 - Very Low'
        },
        {
          value: '2',
          display: '2 - Very Low'
        },
        {
          value: '1',
          display: '1 - Very Low'
        },
        {
          value: '0',
          display: '0 - Very Low/Generated Score'
        }
      ],
      multiple: false,
      userCanEdit: true,
      adminOnly: false
    },
      /**
       * Please note that the below indicator statuses are the default ThreatQ statuses.  You may need to modify these
       * values for your particular installation.
       */
    {
      key: 'indicatorStatuses',
      name: 'Indicator Statuses',
      description:
        'Select 1 or more indicator status types to return.  The integration will only search and return indicators with the specified statuses',
      default: [
        {
          value: '1',
          display: 'Active'
        },
        {
          value: '4',
          display: 'Review'
        }
      ],
      type: 'select',
      options: [
        {
          value: '1',
          display: 'Active'
        },
        {
          value: '2',
          display: 'Expired'
        },
        {
          value: '3',
          display: 'Indirect'
        },
        {
          value: '4',
          display: 'Review'
        },
        {
          value: '5',
          display: 'Whitelisted'
        }
      ],
      multiple: true,
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
