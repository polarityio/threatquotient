# Polarity ThreatQuotient Integration

Polarity's ThreatQuotient integration gives users access to automated MD5, SHA1, SHA256, IPv4, IPv6, CIDR, and Domain lookups within the ThreatQ threat operations and management platform.

> ThreatQ™ is a threat intelligence platform designed to enable threat operations and management for your security organization. For more information please visit [https://www.threatq.com/](https://www.threatq.com/)

| ![image](images/indicator-tab.png) | ![image](images/comment-tab.png) |
|---|---|
|*ThreatQ Indicator Tab* | *ThreatQ Comments Tab* |

## Feature Summary

* View Indicator details including type, status, class, sources, attributes, tags, description, related adversaries, and comments
* Enable adding and removing tags
* Enable updating Indicator Status and Score
* View/Add/Edit Comments

** Upgrading

When upgrading this integration don't forget to make a copy of your `config/threatq.config.js` file so you can copy
any settings over to the upgraded integration.

## Configuring Attributes

The ThreatQ integration supports providing a list of Indicator Attributes you would like displayed in the Overlay Window.
These attributes are configured in the `config/threatq.config.js` file under the `threatQAttributes` property.

The `threatQAttributes` property is an array of attribute objects where each attribute object has the following required
and optional properties:

* `name` (Required) - A string name for the attribute which should match the name of the attribute in ThreatQ (case sensitive)
* `editable` (Required) - A boolean indicating whether the attribute can be edited by users (including deletion)
* `values` (Optional) - An array of possible string values for the attribute

```
{
    threatQAttributes: [{
        name: 'Investigation',
        editable: false
    },
    {
      name: 'Confidence',
      editable: ['low', 'medium', 'high']
    },
    {
      name: 'False Positive',
      editable: true,
      values: ['true', 'false']
   }]
}
```

## Configuring Custom Statuses

This integration comes pre-configured with the default ThreatQ Indicator Statuses

* Active
* Expired
* Indirect
* Review
* Whitelisted

You can add additional custom statuses, or remove default statuses by modifying the `threatQStatuses` property in 
the `config/threatq.config.js` configuration file.  The `threatQStatuses` property is an array of status objects
where each status object contains the following properties:

* `value` {String} The id for the status as a string (e.g., '1').  The id value is set by the ThreatQ server.
* `display` {String} The display value for the status (e.g., 'Active')
* `default` {Boolean} A true or false value indicating whether the status value should be set as a default search option

To view a list of all valid statuses in your ThreatQ deployment you can query the following endpoint with a GET request

```
https://<your-threatq-server>/api/indicator/statuses
```

> If this endpoint returns an empty result `{}` your account does not have access to view the indicator types and
you will need to rerun the query while logged in as a ThreatQuotient admin. 

## ThreatQuotient Integration Options

### ThreatQuotient Server URL

The URL for your ThreatQ server which should include the schema (i.e., http, https) and port if required.

### Username

Your TQ username you want the integration to authenticate as (typically an email address).

### Password

The password for the provided username you want the integration to authenticate as.

### Client ID

The Client ID for your ThreatQ deployment. (accessible at `https://<yourserver>/assets/js/config.js)`

### Enable Adding Tags

If checked, users will be able to add new tags from the overlay window

### Enable Deleting Tags

If checked, users will be able to delete tags from the overlay window

### Enable Editing of Indicator Status

If checked, users will be able to edit the "status" of an indicator (e.g., Active, WhiteListed, Review etc.)

### Enable Manual Editing of Indicator Score

If checked, users will be able to edit the "score" of an indicator. 
 
>  !!! Note that manually setting the score of an indicator is not a recommended best practice. Setting the score manually prevents ThreatQuotient from setting an automatic indicator score.

### Minimum Score

The minimum indicator score required for indicators to be returned by the integration

### Maximum Score

The maximum indicator score required for indicators to be returned by the integration

As an example, if the minimum indicator score is set to 4 and the maximum indicator score is set to 8, the integration
will only return indicators that have a score between 4 and 8 inclusive (i.e., including score values 4 and 8)

### Indicator Statuses

Select 1 or more indicator status types to return. The integration will only search and return indicators with the specified statuses.
Indicator status options are taken from your `config/threatq.config.js` file.  For more information see the section on configuring custom statuses.

## Installation Instructions

Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).

## Polarity

Polarity is a memory-augmentation platform that improves and accelerates analyst decision making.  For more information about the Polarity platform please see:

https://polarity.io/
