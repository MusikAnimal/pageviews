<!-- browser detection to display simple notice -->
<?php $browser = $client->browser->name; ?>
<?php $maxVersion = $browser == 'Internet Explorer' ? 10 : 7; ?>
<?php if ( $client->isBrowser( 'Internet Explorer', '<=', $maxVersion ) || $client->isBrowser( 'Safari', '<=', $maxVersion ) ) { ?>
  <div class="alert alert-danger">
    <?php $browserVersion = $browser . ' ' . $maxVersion; ?>
    <?php echo $I18N->msg( 'unsupported-browser-error', array( 'variables' => array( $browserVersion ) ) ); ?>
  </div>
<?php } ?>
