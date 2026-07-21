<template>
	<figure class="app-totals" :aria-label="$i18n( 'totals' )">
		<figcaption class="app-workspace__heading">
			<h3>{{ $i18n( 'totals' ) }}</h3>
		</figcaption>
		<dl v-if="store.totals" class="app-totals__stats">
			<div class="app-totals__stat">
				<dt>{{ $i18n( 'views' ) }}</dt>
				<dd>{{ number( store.totals.total ) }}</dd>
			</div>
			<div class="app-totals__stat">
				<dt>{{ averageLabel }}</dt>
				<dd>{{ number( Math.round( store.totals.average ) ) }}</dd>
			</div>
		</dl>
		<ul v-if="store.series.length > 1" class="app-totals__pages">
			<li v-for="page in store.series" :key="page.title">
				<span class="app-totals__page-title">{{ page.title }}</span>
				<span class="app-totals__page-views">{{ number( page.total ) }}</span>
			</li>
		</ul>
	</figure>
</template>

<script setup>
import { computed } from 'vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { useSettingsStore } from '../../stores/settings.js';
import { formatNumber } from '../../lib/format.js';
import { banana } from '../../i18n.js';

const store = usePageviewsStore();
const settings = useSettingsStore();

const number = ( value ) => formatNumber( value, banana.locale );

const averageLabel = computed( () => banana.i18n(
	settings.dateType === 'monthly' ? 'monthly-average' : 'daily-average'
) );
</script>

<style scoped lang="less">
@import ( reference ) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.app-totals {
	&__stats {
		display: flex;
		flex-wrap: wrap;
		gap: @spacing-75;
		margin: 0;
	}

	&__stat {
		dt {
			color: @color-subtle;
			font-size: @font-size-small;
		}

		dd {
			font-size: @font-size-x-large;
			font-weight: @font-weight-bold;
			margin: 0;
		}
	}

	&__pages {
		list-style: none;
		margin: @spacing-75 0 0;
		padding: 0;

		li {
			display: flex;
			justify-content: space-between;
			gap: @spacing-50;
			padding: @spacing-25 0;
		}
	}

	&__page-views {
		font-variant-numeric: tabular-nums;
	}
}
</style>
