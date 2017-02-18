<?php
// Define the root of the project directory so that the vendor and messages directories
// can be accessed with non-relative paths.
define( 'ROOTDIR', '/data/project/pageviews' );

// Database credentials
define( 'DB_HOST', '127.0.0.1' );
define( 'DB_USER', 'username' );
define( 'DB_PASSWORD', 'password' );
define( 'DB_PORT', 3306 );

// Database credentials for the 'meta' database, where usage stats are stored
//   along with Topviews false positives
define( 'META_DB_HOST', '127.0.0.1' );
define( 'META_DB_USER', 'username' );
define( 'META_DB_PASSWORD', 'password' );
define( 'META_DB_PORT', 3006 );
define( 'META_DB_NAME', 'database_name' );
