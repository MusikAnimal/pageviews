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

$required_fields = [ 'category', 'project' ];
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

$categories = [ str_replace(' ', '_', $_GET['category']) ];

if ( isset( $_GET['recursive'] ) ) {
  $categories = array_merge(
    recurseCategory($client, $db, $categories),
    $categories
  );
}

$limit = isset( $_GET['limit'] ) ? (int) $_GET['limit'] : 20000;

echo json_encode( getCategoryMembers($client, $db, $categories, $limit) );

function recurseCategory( $client, $db, $searchCats, $allCats = [], $count = 0 ) {
  $searchCatStr = implode( ',', array_map( function( $searchCat ) {
    return "'$searchCat'";
  }, $searchCats));

  $sql = "SELECT page_title
          FROM $db.categorylinks
          JOIN $db.page ON page_id = cl_from
          WHERE cl_to IN ( $searchCatStr )
          AND cl_type = 'subcat'";

  $res = $client->query( $sql );

  if ( !$res ) {
    return $allCats;
  }

  $newCats = array_diff(
    array_column( $res->fetch_all(), 0 ),
    $allCats
  );

  $allCats = array_merge( $allCats, $newCats );

  if ( $count < 50 ) {
    $allCats = array_merge(
      recurseCategory( $client, $db, $newCats, $allCats, $count + 1 ),
      $allCats
    );
  }

  return $allCats;
}

function getCategoryMembers( $client, $db, $categories, $limit ) {
  $categoriesStr = implode( ',', array_map( function( $category ) {
    return "'$category'";
  }, $categories));

  $sql = "SELECT page_title AS title, page_namespace AS ns
          FROM $db.categorylinks
          JOIN $db.page ON page_id = cl_from
          WHERE cl_to IN ( $categoriesStr )
          AND cl_type IN ('page', 'file')
          LIMIT $limit";

  $res = $client->query( $sql );

  if ( !$res ) {
    return [];
  }

  $ret = array_values( array_unique( $res->fetch_all(MYSQLI_ASSOC), SORT_REGULAR ) );

  return $ret;
}
