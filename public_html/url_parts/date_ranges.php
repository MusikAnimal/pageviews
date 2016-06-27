<?php $defaultMsg = "(" . strtolower( $I18N->msg( 'default' ) ) . ")"; ?>
<dt>range</dt>
<dd>
  <?php echo $I18N->msg( 'url-structure-special-range', array( 'variables' => array( '<code>start</code>', '<code>end</code>' ), 'parsemag' => true ) ); ?>
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
  <?php echo $I18N->msg( 'url-structure-start-date', array( 'variables' => array( '<code>YYYY-MM-DD</code>', '<code>end</code>' ), 'parsemag' => true ) ); ?>
</dd>
<dt>end</dt>
<dd>
  <?php echo $I18N->msg( 'url-structure-end-date', array( 'variables' => array( '<code>YYYY-MM-DD</code>' ), 'parsemag' => true ) ); ?>
</dd>