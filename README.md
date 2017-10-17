# Polarity ThreatQuotient Integration

Polarity's ThreatQuotient integration gives users access to automated MD5, SHA1, SHA256, IPv4, IPv6, CIDR, and Domain lookups within the ThreatQ threat operations and management platform.

ThreatQuotient is the industry’s first threat intelligence platform designed to enable threat operations and management for your security organization. ThreatQ™ is the only solution with an integrated threat library, adaptive workbench and open exchange that help you to act upon the most relevant threats facing your organization and to get more out of your existing security infrastructure.  For more information please visit [https://www.threatq.com/](https://www.threatq.com/)

| ![image](https://user-images.githubusercontent.com/306319/31645591-e11e8654-b2ca-11e7-862c-7c3e6ba331bf.png) |
|---|
|*ThreatQ Example Screenshot* |

## ThreatQuotient Integration Options

### ThreatQuotient Server URL

The URL for your ThreatQ server which should include the schema (i.e., http, https) and port if required.

### Username

Your TQ username you want the integration to authenticate as (typically an email address).

### Lookup Files (Hashes)

If checked, the VirusTotal integration will send MD5, SHA1, and SHA256 hashes to VirusTotal for lookup.

### Password

The password for the provided username you want the integration to authenticate as.

### Client ID

The Client ID for your ThreatQ deployment. (accessible at `https://<yourserver>/assets/js/config.js)`

### Ignore Private IPs

If set to true, private IPs (RFC 1918 addresses) will not be looked up (includes 127.0.0.1, 0.0.0.0, and 255.255.255.255)

## Installation Instructions

Installation instructions for integrations are provided on the [PolarityIO GitHub Page](https://polarityio.github.io/).

## Polarity

Polarity is a memory-augmentation platform that improves and accelerates analyst decision making.  For more information about the Polarity platform please see: 

https://polarity.io/
