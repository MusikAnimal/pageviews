<?php

// config.php may be either in the parent directory or up two directories,
//   depending on if this is ran on localhost or Tool Labs
if ( file_exists( __DIR__ . '/../config.php' ) ) {
  require_once __DIR__ . '/../config.php';
} else {
  require_once __DIR__ . '/../../config.php';
}

if ( $_SERVER['REQUEST_METHOD'] !== 'POST' || !isset( $_POST['project'] ) || !isset( $_POST['app'] ) ) {
  exit();
}

// connect to database
$client = new mysqli( META_DB_HOST, META_DB_USER, META_DB_PASSWORD, META_DB_NAME, META_DB_PORT );

// quit if something went wrong
if (mysqli_connect_errno()) {
  printf("Connect failed: %s\n", mysqli_connect_error());
  exit();
}

// first check if there is already a record for this project/page/platform/date
$app = $_POST['app'];
$project = $_POST['project'];
$exists_sql = "SELECT * FROM " . $app . "_projects WHERE project = '$project'";
$res = (bool) $client->query( $exists_sql )->fetch_assoc();

// record exists, so increment counter
if ( $res ) {
  $update_sql = "UPDATE " . $app . "_projects SET count = count + 1 WHERE project = '$project'";
  $client->query( $update_sql );
} else {
  // create new record
  $create_sql = "INSERT INTO " . $app . "_projects VALUES(NULL, ?, ?, 0, 0, ?, ?)";
  $client->query( $create_sql );
}

// do the same for the timeline table
$date = (new DateTime())->format('Y-m-d');

$exists_sql = "SELECT * FROM " . $app . "_timeline WHERE date = '$date'";
$res = (bool) $client->query( $exists_sql )->fetch_assoc();

// record exists, so increment counter
if ( $res ) {
  $update_sql = "UPDATE " . $app . "_timeline SET count = count + 1 WHERE date = '$date'";
  $client->query( $update_sql );
} else {
  // create new record
  $create_sql = "INSERT INTO " . $app . "_timeline VALUES(NULL, '$date', 1)";
  $client->query( $create_sql );
}
