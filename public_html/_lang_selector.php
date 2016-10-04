<span class="btn-group dropup lang-group">
  <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
    <?php echo $currentLang; ?>
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu dropdown-menu-right">
    <li>
      <a href="https://translatewiki.net/w/i.php?title=Special:MessageGroupStats&group=out-pageviews">
        <?php echo $I18N->msg( 'help-translate' ); ?>
      </a>
    </li>
    <li class="divider" role="separator"></li>
    <?php foreach (array_unique($langs) as $lang => $langName) { ?>
      <li>
        <a class="lang-link" href="#" data-lang="<?php echo $lang; ?>"><?php echo $langName; ?></a>
      </li>
    <?php } ?>
  </ul>
</span>
