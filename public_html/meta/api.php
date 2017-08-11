<?php

// config.php may be either in the parent directory or up two directories,
//   depending on if this is ran on localhost or Tool Labs
if ( file_exists( __DIR__ . '/../config.php' ) ) {
  require_once __DIR__ . '/../config.php';
} else {
  require_once __DIR__ . '/../../config.php';
}

if ( $_SERVER['REQUEST_METHOD'] === 'POST' && ( !isset( $_POST['project'] ) || !isset( $_POST['app'] ) ) ) {
  exit();
}

// connect to database
$client = new mysqli( META_DB_HOST, META_DB_USER, META_DB_PASSWORD, META_DB_NAME, META_DB_PORT );

// quit if something went wrong
if (mysqli_connect_errno()) {
  printf("Connect failed: %s\n", mysqli_connect_error());
  exit();
}

// when fetching usage for an app
if ( $_SERVER['REQUEST_METHOD'] === 'GET' ) {
  if ( !isset( $_GET['app'] ) ) return exit();

  $app = $_GET['app'];

  if ( isset( $_GET['start'] ) && isset( $_GET['end'] ) ) {
    $start = $_GET['start'];
    $end = $_GET['end'];

    $sql = "SELECT date, count FROM " . $app . "_timeline WHERE date >= ? AND date <= ?";
    $stmt = $client->prepare( $sql );
    $stmt->bind_param( 'ss', $start, $end );
    $stmt->execute();
    $res = $stmt->get_result()->fetch_all( MYSQLI_ASSOC );
  } else {
    $sql = "SELECT project, count FROM " . $app . '_projects';
    $res = $client->query( $sql )->fetch_all( MYSQLI_ASSOC );
  }

  $res = array_map( function( $r ) {
    $r['count'] = ( int ) $r['count'];
    return ( object ) $r;
  }, $res );

  echo json_encode($res);

  exit();
}

// first check if there is already a record for this project
$app = $_POST['app'];
$project = $_POST['project'];
$exists_sql = "SELECT 1 FROM " . $app . "_projects WHERE project = ?";
$stmt = $client->prepare( $exists_sql );
$stmt->bind_param( 's', $project );
$stmt->execute();
$exists = (bool) ( $stmt->get_result()->fetch_assoc() );

if ( $exists ) {
  // record exists, so increment counter
  $update_sql = "UPDATE " . $app . "_projects SET count = count + 1 WHERE project = ?";
  $stmt = $client->prepare( $update_sql );
  $stmt->bind_param( 's', $project );
  $stmt->execute();
} else {
  // create new record
  $create_sql = "INSERT INTO " . $app . "_projects VALUES(NULL, ?, 0)";
  $stmt = $client->prepare( $create_sql );
  $stmt->bind_param( 's', $project );
  $stmt->execute();
}

// track massviews sources
if ( $app === 'massviews' ) {
  // first check if there is already a record for this project/page/platform/date
  $source = $_POST['source'];
  $exists_sql = "SELECT 1 FROM massviews_sources WHERE source = ?";
  $stmt = $client->prepare( $exists_sql );
  $stmt->bind_param( 's', $source );
  $stmt->execute();
  $exists = (bool) ( $stmt->get_result()->fetch_assoc() );

  if ( $exists ) {
    // record exists, so increment counter
    $update_sql = "UPDATE massviews_sources SET count = count + 1 WHERE source = ?";
    $stmt = $client->prepare( $exists_sql );
    $stmt->bind_param( 's', $source );
    $stmt->execute();
  } else {
    // create new record
    $create_sql = "INSERT INTO massviews_sources VALUES(NULL, ?, 0)";
    $stmt = $client->prepare( $create_sql );
    $stmt->bind_param( 's', $source );
    $stmt->execute();
  }
}

// do the same for the timeline table.
$date = (new DateTime())->format('Y-m-d');

$exists_sql = "SELECT 1 FROM " . $app . "_timeline WHERE date = '$date'";
$exists = (bool) ( $client->query( $exists_sql )->fetch_assoc() );

if ( $exists ) {
  // record exists, so increment counter
  $update_sql = "UPDATE " . $app . "_timeline SET count = count + 1 WHERE date = '$date'";
  $client->query( $update_sql );
} else {
  // create new record
  $create_sql = "INSERT INTO " . $app . "_timeline VALUES(NULL, '$date', 1)";
  $client->query( $create_sql );
}
