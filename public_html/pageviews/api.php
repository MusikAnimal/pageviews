<?php

require_once __DIR__ . '/../../config.php';
require_once ROOTDIR . '/vendor/autoload.php';

use Symfony\Component\Cache\Adapter\ApcuAdapter;

date_default_timezone_set( 'UTC' );

// set header as JSON
header( 'Content-type: application/json' );

// Return cached data, if available.
$cache = new ApcuAdapter( 'pageviews', 1800, 1 );
$cacheKey = md5( $_SERVER['QUERY_STRING'] );
if ( $cache->hasItem( $cacheKey ) ) {
    echo json_encode( $cache->getItem( $cacheKey )->get() );
    return;
}

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

// Get database name given the project.
// First add .org if not present.
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
$host = str_replace( '*', $site_map[$project], DB_HOST ); // For production replicas
$client = new mysqli( $host, DB_USER, DB_PASSWORD, $db, DB_PORT );
if (mysqli_connect_errno()) {
  printf( "Connect failed: %s\n", mysqli_connect_error() );
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

$url_pages = urlencode( str_replace( ' ', '_', $_GET['pages'] ) );

// Attempt to fetch assessments, first trying the disk cache.
$assessmentsCache = json_decode( file_get_contents( ROOTDIR . '/disk_cache/assessments.json' ), true );

// Expires once every 24 hours.
if( strtotime($assessmentsCache['fetched']) < time() - (60 * 60 * 24) ) {
  // Fetch from XTools.
  $ch = curl_init();
  curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
  curl_setopt( $ch, CURLOPT_URL, 'https://xtools.wmcloud.org/api/project/assessments' );
  $assessmentsConfig =json_decode( curl_exec( $ch ), true )['config'];
  curl_close( $ch );

  // Save result back to disk cache.
  $fp = fopen( ROOTDIR . '/disk_cache/assessments.json', 'w' );
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
$total_edits = 0;
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
  $sql = "SELECT COUNT(*) AS num_edits, COUNT(DISTINCT(rev_actor)) AS num_users $paSelect FROM $db.revision " .
    "WHERE rev_timestamp >= '$db_start_date' AND rev_timestamp <= '$db_end_date' AND ";

  $page_data = $client->query( $sql . " rev_page = $page_id" )->fetch_assoc();
  $output['pages'][$page->title] = $page_data;

  // convert to ints
  $output['pages'][$page->title]['num_edits'] = (int) $page_data['num_edits'];
  $output['pages'][$page->title]['num_users'] = (int) $page_data['num_users'];
  $total_edits += (int) $page_data['num_edits'];

  // add assessment data, if available
  if ( isset( $page_data['assessment'] ) && isset( $assessmentsConfig[$project]['class'][$page_data['assessment']] ) ) {
    $output['pages'][$page->title]['assessment_img'] = $assessmentsConfig[$project]['class'][$page_data['assessment']]['badge'];
  }
}

// query for totals
if ( count( $api_pages ) > 1 && isset( $_GET['totals'] ) ) {
  $pages_sql = implode( ' OR ', $multipage_parts );
  $res = $client->query( "SELECT COUNT(DISTINCT(rev_actor)) AS num_users FROM $db.revision " .
    "WHERE rev_timestamp >= '$db_start_date' AND rev_timestamp <= '$db_end_date' AND (" . $pages_sql . ')' );
  $output['totals'] = $res->fetch_assoc();
  $output['totals']['num_edits'] = $total_edits;
  $output['totals']['num_users'] = (int) $output['totals']['num_users'];
}

$client->close();

$output['pages'] = (object) $output['pages'];

$ttl = min(max((int)($_GET['ttl'] ?? 0), 10), 60);
$cacheItem = $cache->getItem( $cacheKey )
    ->set( $output )
    ->expiresAfter( new DateInterval( 'PT' . $ttl . 'M' ) );
$cache->save( $cacheItem );

echo json_encode( $output );
