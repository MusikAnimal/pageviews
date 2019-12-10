<dt>project</dt>
<dd>
  <?php if ( !isset( $defaultProject ) ) { ?>
    <?php $defaultProject = 'en.wikipedia.org'; ?>
  <?php } ?>
  <?php $defaultProjectMsg = "<code>$defaultProject</code> (" . strtolower( $I18N->msg( 'default' ) ) . ") "; ?>
  <?php echo $I18N->msg( 'url-structure-project', [ 'variables' => [ $defaultProjectMsg, $sitematrixLink ], 'parsemag' => true ] ); ?>
</dd>
