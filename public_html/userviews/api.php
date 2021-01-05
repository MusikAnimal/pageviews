<?php

require_once __DIR__ . '/../../config.php';

if ( !isset( $_GET['username'] ) || !isset( $_GET['project'] ) ) {
  exit();
}

$username = ucfirst( $_GET['username'] );
$project = $_GET['project'];

// get database name given the project
$site_map = (array) json_decode( file_get_contents( ROOTDIR . '/site_map.json' ) );
$db = $site_map[$project] . '_p';

// connect to database
$host = str_replace( '*', $site_map[$project], DB_HOST ); // For production replicas
$client = new mysqli( $host, DB_USER, DB_PASSWORD, $db, DB_PORT );

// quit if something went wrong
if (mysqli_connect_errno()) {
  printf("Connect failed: %s\n", mysqli_connect_error());
  exit();
}

// set header as JSON
header('Content-type: application/json');

// build the query
$sql = "SELECT page_title AS title, rev_timestamp AS timestamp, " .
  "page_is_redirect AS redirect, page_len AS length, page_namespace AS namespace " .
  "FROM $db.page JOIN $db.revision_userindex ON page_id = rev_page " .
  "JOIN $db.actor ON actor_id = rev_actor ".
  "WHERE actor_name = ? AND rev_timestamp > 1 AND rev_parent_id = 0";
if ( isset( $_GET['namespace'] ) ) {
  $sql .= " AND page_namespace = " . $_GET['namespace'];
}
if ( isset( $_GET['redirects'] ) ) {
  if ( $_GET['redirects'] === '0' ) {
    $sql .= " AND page_is_redirect = 0";
  } elseif ( $_GET['redirects'] !== '2' ) {
    $sql .= " AND page_is_redirect = 1";
  }
}
$sql .= " LIMIT 20000";

// execute query
if ( $stmt = $client->prepare( $sql ) ) {
  $stmt->bind_param( 's', $username );
  $stmt->execute();

  // return result
  echo json_encode( $stmt->get_result()->fetch_all(MYSQLI_ASSOC) );

  $stmt->close();
}

$client->close();
