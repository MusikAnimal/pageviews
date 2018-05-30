<?php

date_default_timezone_set('utc');

require_once __DIR__ . '/../../config.php';

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

// Attempt to fetch assessments, first trying the disk cache.
$assessmentsCache = json_decode( file_get_contents( '../../disk_cache/assessments.json' ), true );

// Expires once every 24 hours.
if( strtotime($assessmentsCache['fetched']) < time() - (60 * 60 * 24) ) {
  // Fetch from XTools.
  $ch = curl_init();
  curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
  curl_setopt( $ch, CURLOPT_URL, 'https://xtools.wmflabs.org/api/project/assessments' );
  $assessmentsConfig =json_decode( curl_exec( $ch ), true )['config'];
  curl_close( $ch );

  // Save result back to disk cache.
  $fp = fopen( '../../disk_cache/assessments.json', 'w' );
  fwrite( $fp, json_encode( [
    'fetched' => date('Y-m-d H:i:s'),
    'config' => $assessmentsConfig,
  ] ) );
  fclose( $fp );
} else {
  $assessmentsConfig = $assessmentsCache['config'];
}

// get page IDs and build query
$api_pages = file_get_contents( 'https://' . $project . "/w/api.php?action=query&titles=$url_pages&prop=info&format=json&formatversion=2" );
$api_pages = json_decode($api_pages)->query->pages;

$db_start_date = $start_date->format( 'YmdHis' );
$db_end_date = $end_date->format( 'Ymd235959' );

$multipage_parts = [];
foreach ($api_pages as $page) {
  if ( !isset( $page->pageid ) ) {
    continue;
  }
  $page_id = $page->pageid;
  $multipage_parts[] = "rev_page = $page_id";

  // query for individual page
  $paSelect = '';
  if ( isset( $assessmentsConfig[$project] ) ) {
    $paSelect = ", (SELECT pa_class FROM $db.page_assessments WHERE pa_page_id = $page_id LIMIT 1) AS assessment";
  }
  $sql = "SELECT COUNT(*) AS num_edits, COUNT(DISTINCT(rev_user_text)) AS num_users $paSelect FROM $db.revision " .
    "WHERE rev_timestamp >= '$db_start_date' AND rev_timestamp <= '$db_end_date' AND ";

  $res = $client->query( $sql . " rev_page = $page_id" );
  $output['pages'][$page->title] = $res->fetch_assoc();

  foreach ($output['pages'] as $output_page => $page_data) {
    // convert to ints
    $output['pages'][$output_page]['num_edits'] = (int) $page_data['num_edits'];
    $output['pages'][$output_page]['num_users'] = (int) $page_data['num_users'];

    // add assessment data, if available
    if ( isset( $page_data['assessment'] ) && isset( $assessmentsConfig[$project]['class'][$page_data['assessment']] ) ) {
      $output['pages'][$output_page]['assessment_img'] = $assessmentsConfig[$project]['class'][$page_data['assessment']]['badge'];
    }
  }
}

// query for totals
if ( count( $api_pages ) > 1 ) {
  $pages_sql = implode( $multipage_parts, ' OR ' );
  $res = $client->query( $sql . '(' . $pages_sql . ')' );
  $output['totals'] = $res->fetch_assoc();
  unset( $output['totals']['assessment'] );
  $output['totals']['num_edits'] = (int) $output['totals']['num_edits'];
  $output['totals']['num_users'] = (int) $output['totals']['num_users'];
}

$output['pages'] = (object) $output['pages'];

echo json_encode( $output );
