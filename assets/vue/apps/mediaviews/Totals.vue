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
				<div class="app-totals__stat app-totals__stat--strong">
					<dt>{{ metricLabel }}</dt>
					<dd>{{ number( store.totals.total ) }}</dd>
				</div>
				<div class="app-totals__stat app-totals__stat--strong">
					<dt>{{ averageLabel }}</dt>
					<dd>{{ number( Math.round( store.totals.average ) ) }}</dd>
				</div>
			</dl>
		</template>
		<template v-if="statistics.length">
			<h4 class="app-totals__subheading">
				{{ $i18n( 'statistics' ) }}
			</h4>
			<dl class="app-totals__stats">
				<div
					v-for="stat in statistics"
					:key="stat.label"
					class="app-totals__stat"
				>
					<dt>
						<dfn
							v-if="stat.tooltip"
							v-tooltip="stat.tooltip"
							class="app-totals__term"
						>{{ stat.label }}</dfn>
						<template v-else>
							{{ stat.label }}
						</template>
					</dt>
					<dd>{{ stat.value }}</dd>
				</div>
			</dl>
		</template>
	</figure>
</template>

<script setup>
import { computed } from 'vue';
import { CdxTooltip } from '@wikimedia/codex';
import { useMediaviewsStore } from '../../stores/mediaviews.js';
import { usePreferencesStore } from '../../stores/preferences.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { parseDate } from '../../lib/dates.js';
import { banana } from '../../i18n.js';

// Script-setup local directive registration (v-tooltip).
const vTooltip = CdxTooltip;

const store = useMediaviewsStore();
const settings = useSettingsStore();
const preferences = usePreferencesStore();

const number = ( value ) => formatNumber( value, banana.locale, preferences.numericalFormatting );

const averageLabel = computed( () => banana.i18n(
	settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average'
) );

// The categories source counts pageviews, not mediarequests.
const metricLabel = computed( () => banana.i18n(
	store.source === 'categories' ? 'pageviews' : 'requests'
) );

/**
 * The Statistics sidebar section. Categories source: the category
 * size/usage snapshot (file counts, usage). Files source: imageinfo
 * details like the legacy legend — a single file shows its own
 * details (incl. upload date and type); multiple files show duration
 * and size sums.
 */
const statistics = computed( () => {
	if ( store.source === 'categories' ) {
		// Summed across categories, like the file duration/size sums
		// (overlapping categories can double-count, as in legacy).
		const stats = store.series.map( ( entry ) => entry.stats ).filter( Boolean );
		if ( !stats.length ) {
			return [];
		}
		const sum = ( key ) => stats.reduce( ( total, s ) => total + s[ key ], 0 );
		return [
			[ 'file-count', 'file-count-tooltip', 'files' ],
			[ 'used-files', 'used-files-tooltip', 'usedFiles' ],
			[ 'wikis', 'wikis-tooltip', 'wikis' ],
			[ 'pages', 'pages-tooltip', 'pages' ]
		].map( ( [ label, tooltip, field ] ) => ( {
			label: banana.i18n( label ),
			tooltip: banana.i18n( tooltip ),
			value: number( sum( field ) )
		} ) );
	}
	const infos = store.series
		.map( ( entry ) => store.fileInfo?.[ entry.name ] )
		.filter( ( info ) => info && !info.missing );
	if ( !infos.length ) {
		return [];
	}
	const single = store.series.length === 1 ? infos[ 0 ] : null;
	const duration = infos.reduce( ( sum, info ) => sum + ( info.duration || 0 ), 0 );
	const size = infos.reduce( ( sum, info ) => sum + ( info.size || 0 ), 0 );

	return [
		...( duration ? [ {
			label: banana.i18n( 'duration' ),
			value: banana.i18n(
				'num-seconds', Math.round( duration ), number( Math.round( duration ) )
			)
		} ] : [] ),
		...( size ? [ {
			label: banana.i18n( 'size' ),
			value: banana.i18n( 'num-bytes', number( size ), size )
		} ] : [] ),
		...( single?.timestamp ? [ {
			label: banana.i18n( 'date' ),
			value: formatDate( parseDate( single.timestamp.slice( 0, 10 ) ), {
				locale: banana.locale,
				localize: preferences.localizeDateFormat
			} )
		} ] : [] ),
		...( single?.mediatype ? [ {
			label: banana.i18n( 'file-type' ),
			value: single.mediatype.toLowerCase()
		} ] : [] )
	];
} );
</script>

<style scoped lang="less">
// A defined term: hovering (or focusing) shows the definition in a
// tooltip; the dotted underline marks it as such.
.app-totals__term {
	font-style: normal;
	text-decoration: underline dotted;
}
</style>
