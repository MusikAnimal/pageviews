<?php
// Define the root of the project directory so that the vendor and messages directories
// can be accessed with non-relative paths.
define( 'ROOTDIR', '/data/project/pageviews' );

// Domain where the meta API lives.
// This is used to track usage of the apps. See Pv.patchUsage()
// If you are working on a local machine you can set this to an empty string.
define( 'METAROOT', 'tools.wmflabs.org/musikanimal/api/usage' );

// Database credentials
define( 'DB_HOST', '127.0.0.1' );
define( 'DB_USER', 'username' );
define( 'DB_PASSWORD', 'password' );
define( 'DB_PORT', 3306 );
