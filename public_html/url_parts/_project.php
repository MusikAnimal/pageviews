<dt>project</dt>
<dd>
  <?php $defaultProject = "<code>en.wikipedia.org</code> (" . strtolower( $I18N->msg( 'default' ) ) . ") "; ?>
  <?php echo $I18N->msg( 'url-structure-project', array( 'variables' => array( $defaultProject, $sitematrixLink ), 'parsemag' => true ) ); ?>
</dd>
