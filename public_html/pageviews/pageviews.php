<?php

require_once __DIR__ . '/../../config.php';
require_once ROOTDIR . '/vendor/autoload.php';

use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\HttpClient\RetryableHttpClient;

// set header as JSON
header('Content-type: application/json');

if (strpos($_SERVER['HTTP_REFERER'], BASE_PATH) !== 0) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Unauthorized'
    ]);
    return;
}

$required_fields = [ 'project', 'page', 'platform', 'agent', 'start', 'end' ];
$errors = [];

foreach ($required_fields as $field) {
    if ( !isset( $_GET[$field] ) ) {
        $errors[] = "The '$field' parameter is required";
    }
}

if ( count( $errors ) ) {
    echo json_encode( [
        'errors' => $errors
    ] );
    return;
}

$httpClient = new RetryableHttpClient(HttpClient::create(['headers' => [ 'User-Agent' => USER_AGENT ]]));

$project = $_GET['project'];
$page = $_GET['page'];
$platform = $_GET['platform'];
$agent = $_GET['agent'];
$start = $_GET['start'];
$end = $_GET['end'];

$uri = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/$project/$platform/$agent/$page/daily/$start/$end";
$response = $httpClient->request('GET', $uri);

if ($response->getStatusCode() === 200) {
    echo json_encode( $response->toArray() );
} elseif ($response->getStatusCode() === 404) {
    // 404 means no pageviews.
    echo json_encode( [ 'items' => [] ] );
} else {
    echo json_encode($response->toArray(false));
}
