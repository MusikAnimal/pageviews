<?php

// config.php may be either in the parent directory or up two directories,
//   depending on if this is ran on localhost or Tool Labs
if ( file_exists( __DIR__ . '/../config.php' ) ) {
  require_once __DIR__ . '/../config.php';
} else {
  require_once __DIR__ . '/../../config.php';
}

if ( $_SERVER['REQUEST_METHOD'] === 'GET' && isset( $_GET['project'] ) || isset( $_GET['date'] ) || isset( $_GET['platform'] ) ) {
  get_false_positives();
} elseif ( $_SERVER['REQUEST_METHOD'] === 'POST' && isset( $_POST['project'] ) && isset( $_POST['pages'] ) || isset( $_POST['date'] ) || isset( $_POST['platform'] ) ) {
  post_false_positives();
} else {
  exit();
}

// set header as JSON
header('Content-type: application/json');

function db_connect() {
  // connect to database
  $client = new mysqli( META_DB_HOST, META_DB_USER, META_DB_PASSWORD, META_DB_NAME, META_DB_PORT );

  // quit if something went wrong
  if (mysqli_connect_errno()) {
    printf("Connect failed: %s\n", mysqli_connect_error());
    exit();
  }

  return $client;
}

function post_false_positives() {
  $client = db_connect();

  $project = $_POST['project'];
  $pages = $_POST['pages'];
  $date = $_POST['date'];
  $platform = $_POST['platform'];

  $where_clause = "WHERE project = ? AND page = ? AND platform = ? AND date = ?";

  foreach ($pages as $page) {
    $page = $client->real_escape_string( $page );

    // first check if there is already a record for this project/page/platform/date
    $exists_sql = "SELECT * FROM topviews_false_positives $where_clause";
    $stmt = $client->prepare( $exists_sql );
    $stmt->bind_param( 'ssss', $project, $page, $platform, $date );
    $stmt->execute();

    // record exists, so increment counter
    if ( $stmt->get_result()->fetch_all( MYSQLI_BOTH ) ) {
      $update_sql = "UPDATE topviews_false_positives SET count = count + 1 $where_clause";
      $stmt = $client->prepare( $update_sql );
      $stmt->bind_param( 'ssss', $project, $page, $platform, $date );
      $stmt->execute();
    } else {
      // create new record
      $create_sql = "INSERT INTO topviews_false_positives VALUES(NULL, ?, ?, 0, 0, ?, ?)";
      $stmt = $client->prepare( $create_sql );
      $stmt->bind_param( 'ssss', $project, $page, $platform, $date );
      $stmt->execute();
    }

    $stmt->close();
  }

  $client->close();
}

function get_false_positives() {
  $client = db_connect();

  $project = $_GET['project'];
  $date = $_GET['date'];
  $platform = $_GET['platform'];

  // build the query
  $sql = "SELECT page FROM topviews_false_positives WHERE project = ? " .
    "AND date = ? AND platform = ? AND confirmed = 1";

  // get known false positives for this project, date, and platform
  if ( $stmt = $client->prepare( $sql ) ) {
    $stmt->bind_param( 'sss', $project, $date, $platform );
    $stmt->execute();
    $result = array_column( $stmt->get_result()->fetch_all( MYSQLI_BOTH ), 0 );

    // do the same for the blacklist
    $blacklist_sql = "SELECT page FROM topviews_blacklist WHERE project = ? AND platform = ?";
    if ( $stmt = $client->prepare( $blacklist_sql ) ) {
      $stmt->bind_param( 'ss', $project, $platform );
      $stmt->execute();
      $blacklisted_pages = array_column( $stmt->get_result()->fetch_all( MYSQLI_BOTH ), 0 );
      $result = array_merge( $result,  $blacklisted_pages );
    }

    // return result
    echo json_encode( $result );

    $stmt->close();
  }

  $client->close();
}
