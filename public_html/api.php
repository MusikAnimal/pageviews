<?php

// config.php may be either in the parent directory or up two directories,
//   depending on if this is ran on localhost or Tool Labs
if ( file_exists( __DIR__ . '/../config.php' ) ) {
  require_once __DIR__ . '/../config.php';
} else {
  require_once __DIR__ . '/../../config.php';
}

if ( !isset( $_GET['pages'] ) || !isset( $_GET['project'] ) || !isset( $_GET['start'] ) || !isset( $_GET['end'] ) ) {
  exit();
}

// set header as JSON
header('Content-type: application/json');

// get database name given the project
$site_map = (array) json_decode( file_get_contents( ROOTDIR . '/site_map.json' ) );
$db = $site_map[$_GET['project']] . '_p';

// connect to database
$client = new mysqli( DB_HOST, DB_USER, DB_PASSWORD, $db, DB_PORT );
if (mysqli_connect_errno()) {
  printf("Connect failed: %s\n", mysqli_connect_error());
  exit();
}

$output = [
  'pages' => []
];

// if given a year and a month, use the 1st as the day
if ( preg_match( '/^\d{4}-\d{2}$/', $_GET['start'] ) ) {
  $start_date = new DateTime( $_GET['start'] . '-01' );
} else {
  $start_date = new DateTime( $_GET['start'] );
}
// if given a year and a month, use the last day as the end date
if ( preg_match( '/^\d{4}-\d{2}$/', $_GET['end'] ) ) {
  $end_date = new DateTime( $_GET['end'] . '-01' );
  $end_date = new DateTime( $end_date->format( 'Y-m-t' ) );
} else {
  $end_date = new DateTime( $_GET['end'] );
}

// get page IDs and build query
$api_pages = file_get_contents( 'https://' . $_GET['project'] . '/w/api.php?action=query&titles=' . $_GET['pages'] . '&prop=info&format=json&formatversion=2' );
$api_pages = json_decode($api_pages)->query->pages;

$db_start_date = $start_date->format( 'YmdHis' );
$db_end_date = $end_date->format( 'Ymd235959' );

$sql = "SELECT COUNT(*) AS num_edits, COUNT(DISTINCT(rev_user_text)) AS num_users FROM " .
  "$db.revision WHERE rev_timestamp >= '$db_start_date' AND rev_timestamp <= '$db_end_date' AND ";

$multipage_parts = [];
foreach ($api_pages as $page) {
  $page_id = $page->pageid;
  $multipage_parts[] = "rev_page = $page_id";

  // query for individual page
  $res = $client->query( $sql . " rev_page = $page_id" );
  $output['pages'][$page->title] = $res->fetch_assoc();
}

// query for totals
if ( count( $api_pages ) > 1 ) {
  $pages_sql = implode( $multipage_parts, ' OR ' );
  $res = $client->query( $sql . '(' . $pages_sql . ')' );
  $output['totals'] = $res->fetch_assoc();
}

echo json_encode( $output );
