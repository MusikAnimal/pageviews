#!/bin/bash

# This script is to deploy code to the given app on Toolforge.
# This also adds the necessary symlinks by calling symlinks.sh
# To use, optionally pass in a branch name and specific application.
# Examples:
#
#   Deploy master for current app specified by $PWD:
#     sh deploy.sh
#   Deploy 2018-refactor branch as the topviews app:
#     sh deploy.sh 2018-refactor topviews

if [ -z "$2" ]; then
    app=$(basename "../$PWD")
else
    app=$2
fi

if [ ! -z "$1" ]; then
  git fetch origin
  git checkout -t origin/$1
  git checkout $1
  git pull origin $1
else
  git checkout master
  git pull origin master
fi

composer install

sh ./bin/symlinks.sh $app

if [ $app = "pageviews" ]; then
    cd public_html/jsdocs || exit
    git pull origin master
fi
