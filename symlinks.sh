#!/bin/bash

# This script is used on Toolforge to add necessary symlinks that we don't
# want in version control. They effectively change the document root in lighttpd.
# This needs to be ran after each deploy (and is sourced in deploy.sh).
#
# To use, optionally pass in the name of the app you're currently working with,
# otherwise it will use the app specified in the $PWD:
#   sh setup.sh topviews

if [ -z "$1" ]; then
    app=$(basename "$PWD")
else
    app=$1
fi

cd public_html
ln -s $app/index.php index.php
ln -s $app/api.php api.php
rm application-*
ln -s $app/application-* .
ln -s $app/faq faq
ln -s $app/url_structure url_structure
cd ~
ln -s public_html/_browser_check.php _browser_check.php
ln -s public_html/_data_links.php _data_links.php
ln -s public_html/_footer.php _footer.php
ln -s public_html/_header.php _header.php
ln -s public_html/_head.php _head.php
ln -s public_html/_modals.php _modals.php
ln -s public_html/_output.php _output.php
ln -s public_html/images images
