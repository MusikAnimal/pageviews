#!/usr/bin/env php
<?php
// from https://github.com/alexluke/grunt-haml-php/blob/master/bin/haml
// Copyright (c) 2013 Alex Luke

require './vendor/autoload.php';

function usage() {
  global $argv;

  fwrite(STDERR, "Usage: $argv[0] [-t target] [-d] <inputFile> [outputFile]\n");
  exit(1);
}

function main($args) {
  array_shift($args);

  $opts = getopt('t:d');

  if (isset($opts['d'])) {
    $enable_dynamic_attrs = false;
    $args = array_slice($args, 1);
  } else {
    $enable_dynamic_attrs = true;
  }

  if (isset($opts['t'])) {
    $target = $opts['t'];
    $args = array_slice($args, 2);
  } else {
    $target = 'php';
  }

  if (count($args) < 1 || count($args) > 2)
    usage();

  $haml = new MtHaml\Environment($target, array('enable_escaper' => false, 'enable_dynamic_attrs' => $enable_dynamic_attrs));

  $input = @file_get_contents($args[0]);
  if ($input === false) {
    fwrite(STDERR, "Unable to open $args[0]\n");
    exit(1);
  }

  try {
    $output = $haml->compileString($input, $args[0]);
  } catch (Exception $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
  }

  if (count($args) == 2) {
    file_put_contents($args[1], $output);
  } else {
    echo $output;
  }
}

main($argv);

# vim: ft=php
