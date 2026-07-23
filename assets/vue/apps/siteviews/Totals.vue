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
		<template v-if="store.editsData">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'revisions' ) }}
			</h4>
			<dl v-if="!store.editsData.noData" class="app-totals__stats">
				<div class="app-totals__stat">
					<dt>{{ $i18n( 'edits' ) }}</dt>
					<dd>{{ number( store.editsData.total ) }}</dd>
				</div>
			</dl>
			<p v-else class="app-totals__unavailable">
				{{ $i18n( 'data-unavailable' ) }}
			</p>
			<!-- Edit data lands in AQS monthly; hint when the range
				outruns the coverage. -->
			<p v-if="editsCutoff" class="app-totals__note">
				{{ $i18n( 'edits-data-through', editsCutoff ) }}
			</p>
		</template>
		<p v-if="topviewsUrl" class="app-totals__links">
			<a :href="topviewsUrl" target="_blank">{{ $i18n( 'most-viewed-pages' ) }}</a>
		</p>
	</figure>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useSiteviewsStore } from '../../stores/siteviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { formatYm, lastCompleteMonthUtc, parseDate, startOfMonth } from '../../lib/dates.js';
import { getProjects } from '../../projects.js';
import { banana } from '../../i18n.js';

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
 * The localized coverage cutoff for the edit counts, when the range
 * asks for more than AQS has loaded (it only updates monthly).
 */
const editsCutoff = computed( () => {
	const through = store.editsData?.dataThrough;
	if ( !through || store.editsData.noData || through >= settings.end ) {
		return null;
	}
	return formatDate( parseDate( through ), {
		locale: banana.locale,
		monthly: through.length === 7,
		localize: preferences.localizeDateFormat
	} );
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
