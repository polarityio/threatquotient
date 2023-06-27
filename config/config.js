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
  entityTypes: ['IPv4', 'IPv4CIDR', 'IPv6', 'hash', 'domain', 'email'],
  defaultColor: 'light-pink',
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
    proxy: ""
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
      key: 'allowEditingStatus',
      name: 'Enable Editing of Indicator Status',
      description:
        'If checked, users will be able to edit the "status" of an indicator (e.g., Active, WhiteListed, Review etc.)',
      default: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'allowEditingScore',
      name: 'Enable Manual Editing of Indicator Score',
      description:
        'If checked, users will be able to edit the "score" of an indicator.  Note that manually setting the score of an indicator is not a recommended best practice.  Setting the score manually prevents ThreatQuotient from setting an automatic indicator score.',
      default: false,
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
          value: '100', // the max score in the ThreatQ interface is 10 but the actual max is 100 which is hidden by the server
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
    {
      key: 'maximumScore',
      name: 'Maximum Score',
      description: 'The maximum indicator score required for indicators to be returned by the integration',
      default: {
        value: '100',
        display: '10 - Very High'
      },
      type: 'select',
      options: [
        {
          value: '100', // the max score in the ThreatQ interface is 10 but the actual max is 100 which is hidden by the server
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
      type: 'select',

      /** STEP 1
       * An array of ThreatQ status objects. You can add additional custom
       * statuses that you have added to your ThreatQ instance here.
       *
       * To review all custom statuses you can use the following endpoint
       * NOTE: Must be queried as an admin
       *
       * GET https://<your-threatq-server>/api/indicator/statuses
       *
       * display {String} The Display value for the status
       * value {String} the ID value for the given status
       */
      options: [
        {
          display: 'Active',
          value: '1'
        },
        {
          display: 'Expired',
          value: '2'
        },
        {
          display: 'Indirect',
          value: '3'
        },
        {
          display: 'Review',
          value: '4'
        },
        {
          display: 'Whitelisted',
          value: '5'
        }
      ],
      /** STEP 2
       * An array of the ThreatQ status objects from the STEP 1 above
       * that will be set as the default `Indicator Statuses` on startup of the
       * integration for users
       */
      default: [
        {
          display: 'Active',
          value: '1'
        },
        {
          display: 'Review',
          value: '4'
        }
      ],
      multiple: true,
      userCanEdit: true,
      adminOnly: false
    }
  ],
  /** STEP 3
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
    // {
    //   name: 'Investigation',
    //   editable: false
    // },
    // {
    //   name: 'Confidence',
    //   editable: true
    // },
    // {
    //   name: 'False Positive',
    //   editable: true,
    //   values: ['true', 'false']
    // }
  ]
};
