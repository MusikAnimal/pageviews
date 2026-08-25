<template>
	<div class="app-loading-overlay">
		<div class="app-progress-bar">
			<div>{{ $i18n( 'loading' ) }}</div>
			<CdxProgressBar
				v-if="!ui.progress"
				:aria-label="$i18n( 'loading' )"
			/>
			<div
				v-else
				class="app-progress-bar__meter"
				role="progressbar"
				:aria-label="$i18n( 'loading' )"
				aria-valuemin="0"
				:aria-valuemax="ui.progress.total"
				:aria-valuenow="ui.progress.done"
			>
				<div
					class="app-progress-bar__fill"
					:style="{ width: `${ ( 100 * ui.progress.done ) / ui.progress.total }%` }"
				/>
			</div>
			<div v-if="ui.progress" class="app-progress-bar__counts">
				{{ $i18n( 'processing', `${ ui.progress.done } / ${ ui.progress.total }` ) }}
			</div>
			<!-- Wrapper: the bidi Codex build's [dir] .cdx-button
				sets margin at higher specificity than our class. -->
			<div class="app-progress-bar__abort">
				<CdxButton
					action="destructive"
					weight="quiet"
					@click="emit( 'abort' )"
				>
					{{ $i18n( abortLabelKey ) }}
				</CdxButton>
			</div>
		</div>
	</div>
</template>

<script setup>
import { CdxButton, CdxProgressBar } from '@wikimedia/codex';
import { useUiStore } from '../stores/ui.js';

/**
 * Full-container dimming backdrop with the loading indicator:
 * indeterminate until the store reports fan-out progress (ui.progress,
 * counting completed requests), then a determinate meter with a
 * done/total readout. Styles live in app.less, shared with the Twig
 * FOUC skeletons.
 *
 * abort: the user hit the button — the parent should cancel the
 * in-flight load (store.abort()) and return to the pre-submission
 * state.
 */
const emit = defineEmits( [ 'abort' ] );

defineProps( {
	/**
	 * Message key for the button's label. The submission apps say
	 * "Cancel" (nothing was asked for yet beyond the form); the chart
	 * apps keep the stronger "Abort".
	 */
	abortLabelKey: {
		type: String,
		default: 'abort'
	}
} );

const ui = useUiStore();
</script>
