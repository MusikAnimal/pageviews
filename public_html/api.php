<?php

// config.php may be either in the parent directory or up two directories,
//   depending on if this is ran on localhost or Tool Labs
if ( file_exists( __DIR__ . '/../config.php' ) ) {
  require_once __DIR__ . '/../config.php';
} else {
  require_once __DIR__ . '/../../config.php';
}

// set header as JSON
header('Content-type: application/json');

$required_fields = [ 'pages', 'project', 'start', 'end' ];
$errors = [];

foreach ($required_fields as $field) {
  if ( !isset( $_GET[$field] ) ) {
    $errors[] = "The '$field' parameter is required";
  } else if ( ( $field === 'start' || $field === 'end' ) && !preg_match( '/\d{4}-\d{2}-\d{2}/', $_GET[$field] ) ) {
    $errors[] = "The '$field' parameter must be in the format YYYY-MM-DD";
  }
}

if ( count( $errors ) ) {
  echo json_encode( [
    'errors' => $errors
  ] );
  return;
}

// get database name given the project
// first add .org if not present
$project = $_GET['project'];
if ( !preg_match( '/\.org$/' , $project ) ) {
  $project .= '.org';
}
$site_map = (array) json_decode( file_get_contents( ROOTDIR . '/site_map.json' ) );
if ( !isset( $site_map[$project] ) ) {
  echo json_encode( [
    'errors' => [ "$project is not a valid project" ]
  ] );
  return;
}
$db = $site_map[$project] . '_p';

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

$url_pages = str_replace( ' ', '_', $_GET['pages'] );

// echo 'https://' . $project . "/w/api.php?action=query&titles=$url_pages&prop=info&format=json&formatversion=2";

// get page IDs and build query
$api_pages = file_get_contents( 'https://' . $project . "/w/api.php?action=query&titles=$url_pages&prop=info&format=json&formatversion=2" );
$api_pages = json_decode($api_pages)->query->pages;

$db_start_date = $start_date->format( 'YmdHis' );
$db_end_date = $end_date->format( 'Ymd235959' );

$sql = "SELECT COUNT(*) AS num_edits, COUNT(DISTINCT(rev_user_text)) AS num_users FROM " .
  "$db.revision WHERE rev_timestamp >= '$db_start_date' AND rev_timestamp <= '$db_end_date' AND ";

$multipage_parts = [];
foreach ($api_pages as $page) {
  if ( !isset( $page->pageid ) ) {
    continue;
  }
  $page_id = $page->pageid;
  $multipage_parts[] = "rev_page = $page_id";

  // query for individual page
  $res = $client->query( $sql . " rev_page = $page_id" );
  $output['pages'][$page->title] = $res->fetch_assoc();

  // convert to ints
  foreach ($output['pages'] as $output_page => $page_data) {
    $output['pages'][$output_page]['num_edits'] = (int) $page_data['num_edits'];
    $output['pages'][$output_page]['num_users'] = (int) $page_data['num_users'];
  }
}

// query for totals
if ( count( $api_pages ) > 1 ) {
  $pages_sql = implode( $multipage_parts, ' OR ' );
  $res = $client->query( $sql . '(' . $pages_sql . ')' );
  $output['totals'] = $res->fetch_assoc();
  $output['totals']['num_edits'] = (int) $output['totals']['num_edits'];
  $output['totals']['num_users'] = (int) $output['totals']['num_users'];
}

echo json_encode( $output );
