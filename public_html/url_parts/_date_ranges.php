<?php $defaultMsg = "(" . strtolower( $I18N->msg( 'default' ) ) . ")"; ?>
<dt>range</dt>
<dd>
  <?php echo $I18N->msg( 'url-structure-special-range', [ 'variables' => [ '<code>start</code>', '<code>end</code>' ], 'parsemag' => true ] ); ?>
  <ul class="special-ranges">
    <li>
      <code>latest</code>
      <?php echo $defaultRange === 'latest' ? $defaultMsg : ''; ?>
      <?php echo $I18N->msg( 'url-structure-special-range-latest' ); ?>
    </li>
    <li>
      <code>latest-<i>N</i></code>
      <?php echo $I18N->msg( 'url-structure-special-range-latest-n' ); ?>
    </li>
    <li>
      <code>current</code>
      <?php echo $I18N->msg( 'url-structure-current' ); ?>
    </li>
    <li>
      <code>this-week</code>
      <?php echo $defaultRange === 'this-week' ? $defaultMsg : ''; ?>
      <?php echo $I18N->msg( 'this-week' ); ?>
    </li>
    <li>
      <code>last-week</code>
      <?php echo $defaultRange === 'last-week' ? $defaultMsg : ''; ?>
      <?php echo $I18N->msg( 'last-week' ); ?>
    </li>
    <li>
      <code>this-month</code>
      <?php echo $defaultRange === 'this-month' ? $defaultMsg : ''; ?>
      <?php echo $I18N->msg( 'this-month' ); ?>
    </li>
    <li>
      <code>last-month</code>
      <?php echo $defaultRange === 'last-month' ? $defaultMsg : ''; ?>
      <?php echo $I18N->msg( 'last-month' ); ?>
    </li>
  </ul>
</dd>
<dt>start</dt>
<dd>
  <?php echo $I18N->msg( 'url-structure-start-date', [ 'variables' => [ '<code>YYYY-MM-DD</code>', '<code>end</code>' ], 'parsemag' => true ] ); ?>
  <?php if ( in_array( $currentApp, [ 'pageviews' ] ) ) { ?>
    <br>
    <?php echo $I18N->msg( 'url-structure-start-month', [ 'variables' => [ '<code>YYYY-MM</code>' ] ] ); ?>
  <?php } ?>
</dd>
<dt>end</dt>
<dd>
  <?php echo $I18N->msg( 'url-structure-end-date', [ 'variables' => [ '<code>YYYY-MM-DD</code>' ], 'parsemag' => true ] ); ?>
  <?php if ( in_array( $currentApp, [ 'pageviews' ] ) ) { ?>
    <br>
    <?php echo $I18N->msg( 'url-structure-end-month', [ 'variables' => [ '<code>YYYY-MM</code>' ] ] ); ?>
  <?php } ?>
</dd>
