<?php

// Proxy since the API doesn't support CORS or JSONP.
$ch = curl_init();
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
curl_setopt($ch, CURLOPT_URL, $_GET['endpoint']);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mediaviews Analysis; https://mediaviews.toolforge.org / https://en.wikipedia.org/wiki/User_talk:MusikAnimal');
$result = curl_exec($ch);
curl_close($ch);
