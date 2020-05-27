<?php
// Define the root of the project directory so that the vendor and messages directories
// can be accessed with non-relative paths.
define( 'ROOTDIR', '/data/project/pageviews' );

// Whatever your localhost (or production) base path is set to.
// On local, the following should work if you start the server with
//   `php -S localhost:8000` within the public_html directory.
// On Toolforge, this should be 'https://pageviews.toolforge.org'
define( 'BASE_PATH', 'http://localhost:8000' );

// Replica database credentials.
define( 'DB_HOST', '127.0.0.1' );
define( 'DB_USER', 'username' );
define( 'DB_PASSWORD', 'password' );
define( 'DB_PORT', 3306 );

// Database credentials for the 'meta' database, where usage stats are stored
// along with Topviews false positives. If you don't care about this,
// just leave these blank, but Topviews may not work correctly.
// On Toolforge, use 'tools.db.svc.eqiad.wmflabs' as the host.
define( 'META_DB_HOST', '127.0.0.1' );
define( 'META_DB_USER', 'username' );
define( 'META_DB_PASSWORD', 'password' );
define( 'META_DB_PORT', 3006 );
define( 'META_DB_NAME', 'database_name' );
