<template>
	<figure class="app-totals" :aria-label="$i18n( 'totals' )">
		<figcaption class="app-workspace__heading">
			<h3>{{ $i18n( 'totals' ) }}</h3>
		</figcaption>
		<template v-if="store.totals">
			<h4 class="app-totals__subheading app-totals__subheading--first">
				{{ metricLabel }}
			</h4>
			<dl class="app-totals__stats">
				<!-- Unique devices are not additive across days, so no
					sum is shown (matching legacy). -->
				<div
					v-if="store.source !== 'unique-devices'"
					class="app-totals__stat app-totals__stat--strong"
				>
					<dt>
						{{ store.source === 'pagecounts' ? $i18n( 'counts' ) : $i18n( 'views' ) }}
					</dt>
					<dd>{{ number( store.totals.total ) }}</dd>
				</div>
				<div class="app-totals__stat app-totals__stat--strong">
					<dt>{{ averageLabel }}</dt>
					<dd>{{ number( Math.round( store.totals.average ) ) }}</dd>
				</div>
			</dl>
		</template>
		<template v-if="familyCounts">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'num-projects', number( familyCounts.total ), familyCounts.total ) }}
			</h4>
			<dl class="app-totals__stats">
				<div
					v-for="[ family, count ] in familyCounts.families"
					:key="family"
					class="app-totals__stat"
				>
					<dt>{{ family }}</dt>
					<dd>{{ number( count ) }}</dd>
				</div>
			</dl>
		</template>
		<template v-else-if="statistics">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'statistics' ) }}
				<span class="app-totals__note">({{ $i18n( 'all-time' ).toLowerCase() }})</span>
			</h4>
			<dl class="app-totals__stats">
				<div
					v-for="stat in statistics"
					:key="stat.key"
					class="app-totals__stat"
				>
					<dt>{{ stat.label }}</dt>
					<dd>{{ number( stat.value ) }}</dd>
				</div>
			</dl>
			<p v-if="topviewsUrl" class="app-totals__links">
				<a :href="topviewsUrl" target="_blank">{{ $i18n( 'most-viewed-pages' ) }}</a>
			</p>
		</template>
	</figure>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useSiteviewsStore } from '../../stores/siteviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { formatYm, lastCompleteMonthUtc, parseDate, startOfMonth } from '../../lib/dates.js';
import { getProjects } from '../../projects.js';
import { banana } from '../../i18n.js';

const STAT_KEYS = [
	[ 'pages', 'pages' ],
	[ 'articles', 'articles' ],
	[ 'edits', 'edits' ],
	[ 'images', 'images' ],
	[ 'users', 'users' ],
	[ 'activeusers', 'active-users' ],
	[ 'admins', 'admins' ]
];
const FAMILIES = [ 'wikipedia', 'wiktionary', 'wikiquote', 'wikibooks',
	'wikisource', 'wikinews', 'wikiversity', 'wikispecies', 'wikivoyage' ];

const store = useSiteviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

const metricLabel = computed( () => banana.i18n( {
	pageviews: 'pageviews',
	'unique-devices': 'unique-devices',
	pagecounts: 'pagecounts'
}[ store.source ] ) );

const averageLabel = computed( () => banana.i18n(
	settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average'
) );

/**
 * All-time siteinfo statistics: a single site's own numbers, or the
 * sums across the compared sites (legacy behavior). null while the
 * non-fatal fetches are pending or in all-projects mode.
 */
const statistics = computed( () => {
	const stats = store.sites
		.map( ( site ) => store.siteStats[ site ] )
		.filter( Boolean );
	if ( !stats.length || store.isAllProjects ) {
		return null;
	}
	return STAT_KEYS.map( ( [ key, message ] ) => ( {
		key,
		label: banana.i18n( message ),
		value: stats.reduce( ( sum, stat ) => sum + ( stat[ key ] || 0 ), 0 )
	} ) );
} );

// All-projects mode: no per-site statistics exist; show how many
// projects each family contributes instead, like the legacy legend.
const domains = ref( [] );
onMounted( async () => {
	if ( store.isAllProjects ) {
		domains.value = Object.keys( await getProjects() );
	}
} );

const familyCounts = computed( () => {
	if ( !store.isAllProjects || !domains.value.length ) {
		return null;
	}
	const counts = new Map();
	for ( const domain of domains.value ) {
		const family = FAMILIES.find( ( name ) => domain.includes( name ) );
		const label = family ?
			banana.i18n( family ).replace( /^./, ( c ) => c.toUpperCase() ) :
			banana.i18n( 'other' );
		counts.set( label, ( counts.get( label ) || 0 ) + 1 );
	}
	return { total: domains.value.length, families: [ ...counts.entries() ] };
} );

/**
 * Single-site queries link to that project's Topviews for the month
 * of the end date (clamped to the last complete month).
 */
const topviewsUrl = computed( () => {
	if ( store.sites.length !== 1 || store.isAllProjects || !settings.end ) {
		return null;
	}
	const endMonth = startOfMonth( parseDate( settings.end ) );
	const max = lastCompleteMonthUtc();
	const date = formatYm( endMonth > max ? max : endMonth );
	return `/topviews?project=${ encodeURIComponent( store.sites[ 0 ] ) }` +
		`&platform=all-access&date=${ date }`;
} );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-totals {
	&__note {
		color: @color-subtle;
		font-weight: @font-weight-normal;
	}

	&__links {
		font-size: @font-size-small;
		margin: @spacing-50 0 0;
	}
}
</style>
