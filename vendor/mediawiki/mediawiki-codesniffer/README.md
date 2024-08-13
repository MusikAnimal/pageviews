MediaWiki coding conventions
============================

Abstract
--------
This project implements a set of rules for use with [PHP CodeSniffer][0].

See [MediaWiki conventions][1] on our wiki for a detailed description of the
coding conventions that are validated by these rules. :-)

How to install
--------------
1. Create a composer.json which adds this project as a dependency:

    ```
    {
    	"require-dev": {
    		"mediawiki/mediawiki-codesniffer": "40.0.1"
    	},
    	"scripts": {
    		"test": [
    			"phpcs -p -s"
    		],
    		"fix": "phpcbf"
    	}
    }
    ```
2. Create a .phpcs.xml with our configuration:

    ```
    <?xml version="1.0"?>
    <ruleset>
    	<rule ref="./vendor/mediawiki/mediawiki-codesniffer/MediaWiki"/>
    	<file>.</file>
    	<arg name="bootstrap" value="./vendor/mediawiki/mediawiki-codesniffer/utils/bootstrap-ci.php"/>
    	<arg name="extensions" value="php"/>
    	<arg name="encoding" value="UTF-8"/>
    </ruleset>
    ```
3. Install: `composer update`
4. Run: `composer test`
5. Run: `composer fix` to auto-fix some of the errors, others might need
   manual intervention.
6. Commit!

Note that for most MediaWiki projects, we'd also recommend adding a PHP linter
to your `composer.json` – see the [full documentation][2] for more details.

Configuration
-------------
Some of the sniffs provided by this codesniffer standard allow you to configure details of how they work.

* `MediaWiki.Classes.FullQualifiedClassName`: This sniff is disabled by default.

    ```
    <rule ref="MediaWiki.Classes.FullQualifiedClassName">
        <severity>5</severity>
        <properties>
            <property name="allowMainNamespace" value="false" />
            <property name="allowInheritance" value="false" />
            <property name="allowFunctions" value="false" />
        </properties>
    </rule>
    ```

* `MediaWiki.Usage.ExtendClassUsage`: This sniff lets you exclude globals from being reported by the sniff, in case they
  cannot be replaced with a Config::getConfig() call. Examples that are already in the list include `$wgTitle` and
  `$wgUser`.

    ```
    <rule ref="MediaWiki.Usage.ExtendClassUsage">
        <properties>
            <property name="nonConfigGlobals[]" type="array" value="$wg...,$wg..." />
        </properties>
    </rule>
    ```

* `MediaWiki.Commenting.ClassLevelLicense`: This sniff does nothing by default.

    ```
    <rule ref="MediaWiki.Commenting.ClassLevelLicense">
        <properties>
            <property name="license" value="GPL-2.0-or-later" />
        </properties>
    </rule>
    ```

* `MediaWiki.NamingConventions.PrefixedGlobalFunctions`: This sniff lets you define a list of ignored global
  functions and a list of allowed prefixes. By default the only allowed prefix is 'wf', corresponding
  to the global function `wf...()`.

    ```
    <rule ref="MediaWiki.NamingConventions.PrefixedGlobalFunctions">
        <properties>
            <property name="allowedPrefixes[]" value="wf,..." />
            <property name="ignoreList[]" value="...,..." />
        </properties>
    </rule>
    ```

* `MediaWiki.NamingConventions.ValidGlobalName`: This sniff lets you define a list of ignored globals and a list of allowed
  prefixes. By default the only allowed prefix is 'wg', for global variables `$wg...`.

    ```
    <rule ref="MediaWiki.NamingConventions.ValidGlobalName">
        <properties>
            <property name="allowedPrefixes[]" value="wg,..." />
            <property name="ignoreList[]" value="...,..." />
        </properties>
    </rule>
    ```

* `MediaWiki.Arrays.TrailingComma`: This sniff lets you enforce that multi-line arrays have trailing commas,
  which makes Git diffs nicer.
  It can also enforce that single-line arrays have no trailing comma.
  By default, it does nothing.

    ```
    <rule ref="MediaWiki.Arrays.TrailingComma">
        <properties>
            <property name="singleLine" value="false" />
            <property name="multiLine" value="true" />
        </properties>
    </rule>
    ```

---
[0]: https://packagist.org/packages/squizlabs/php_codesniffer
[1]: https://www.mediawiki.org/wiki/Manual:Coding_conventions/PHP
[2]: https://www.mediawiki.org/wiki/Continuous_integration/Entry_points#PHP
