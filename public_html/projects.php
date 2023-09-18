<?php

require_once __DIR__ . '/../config.php';

header( 'Content-type: application/json' );

// First determine if we should pull from cache or re-fetch.
$projectsCache = json_decode( file_get_contents( ROOTDIR . '/disk_cache/projects.json' ), true );

// Expires once a week.
if ( strtotime( $projectsCache['fetched'] ) > time() - ( 60 * 60 * 24 * 7 ) ) {
    echo json_encode( $projectsCache['projects'] );
    return;
}

// Fetch the TSV file from GitHub.
$ch = curl_init();
curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
curl_setopt( $ch, CURLOPT_HTTPHEADER, ['Accept: application/json'] );
curl_setopt( $ch, CURLOPT_URL, 'https://raw.githubusercontent.com/wikimedia/analytics-refinery/master/static_data/pageview/allowlist/allowlist.tsv' );
$rows = explode( "\n", curl_exec( $ch ) );
curl_close( $ch );

// Collect the valid projects.
$projects = [];
foreach ( $rows as $row ) {
    [ $type, $project, ] = explode( "\t", $row );
    if ( $type === 'project' ) {
        $projects[] = "https://$project.org";
    }
}

// Get the database domains using meta_p.
$client = new mysqli( DB_S7_HOST, DB_USER, DB_PASSWORD, 'meta_p', DB_S7_PORT );
if (mysqli_connect_errno()) {
    printf( "Connect failed: %s\n", mysqli_connect_error() );
    exit();
}
$urlQuery = implode( ',', str_split( str_repeat( '?', count( $projects ) ) ) );
$stmt = $client->prepare( "SELECT url, dbname FROM meta_p.wiki WHERE url IN ($urlQuery)" );
$stmt->bind_param( str_repeat( 's', count( $projects ) ), ...$projects );
$stmt->execute();
$rows = $stmt->get_result()->fetch_all( MYSQLI_ASSOC );
$client->close();
$projectsWithDbNames = [];
foreach ( $rows as $row ) {
    $domain = preg_replace( '/^https:\/\/(.*)\.org/', '\1', $row['url'] );
    $projectsWithDbNames[$domain] = $row['dbname'];
}

// Save result back to disk cache.
$fp = fopen( ROOTDIR . '/disk_cache/projects.json', 'w' );
fwrite( $fp, json_encode( [
    'fetched' => date('Y-m-d H:i:s'),
    'projects' => $projectsWithDbNames,
] ) );
fclose( $fp );

echo json_encode( $projectsWithDbNames );
