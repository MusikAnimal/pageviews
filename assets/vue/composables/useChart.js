import { onBeforeUnmount, onMounted, onScopeDispose, ref, watch } from 'vue';
import { echarts } from '../charts/echarts.js';

/**
 * Manage an echarts instance's lifecycle inside a component: init on
 * mount, notMerge setOption on option changes, container-driven resize,
 * dispose on unmount.
 *
 * @param {import('vue').Ref<HTMLElement>} containerRef
 * @param {import('vue').Ref<Object>} optionRef
 * @return {{ getPngDataUrl: Function }}
 */
export function useChart( containerRef, optionRef ) {
	let chart = null;
	let resizeObserver = null;

	// Make drag-select zoom always active — no toolbox button needed.
	// A no-op for options without the (hidden) toolbox dataZoom feature.
	function activateDragZoom() {
		chart.dispatchAction( {
			type: 'takeGlobalCursor',
			key: 'dataZoomSelect',
			dataZoomSelectActive: true
		} );
	}

	onMounted( () => {
		chart = echarts.init( containerRef.value );
		chart.setOption( optionRef.value, { notMerge: true } );
		activateDragZoom();
		resizeObserver = new ResizeObserver( () => chart && chart.resize() );
		resizeObserver.observe( containerRef.value );
	} );

	watch( optionRef, ( option ) => {
		if ( chart ) {
			// notMerge resets interaction state, so re-activate.
			chart.setOption( option, { notMerge: true } );
			activateDragZoom();
		}
	}, { deep: true } );

	onBeforeUnmount( () => {
		if ( resizeObserver ) {
			resizeObserver.disconnect();
		}
		if ( chart ) {
			chart.dispose();
			chart = null;
		}
	} );

	return {
		/**
		 * @param {Object} [options] echarts getDataURL() overrides.
		 * @return {string|undefined} PNG data URL for exports.
		 */
		getPngDataUrl( options = {} ) {
			return chart ?
				chart.getDataURL( { type: 'png', pixelRatio: 2, ...options } ) :
				undefined;
		},

		/**
		 * Zoom back out to the full date range.
		 */
		resetZoom() {
			if ( chart ) {
				chart.dispatchAction( { type: 'dataZoom', start: 0, end: 100 } );
			}
		}
	};
}

/**
 * Reactive prefers-color-scheme flag. Include it in the computed that
 * builds the chart option so charts re-theme when the mode flips.
 *
 * @return {import('vue').Ref<boolean>}
 */
export function usePrefersDark() {
	const query = window.matchMedia( '(prefers-color-scheme: dark)' );
	const dark = ref( query.matches );
	const onChange = ( event ) => {
		dark.value = event.matches;
	};
	query.addEventListener( 'change', onChange );
	onScopeDispose( () => query.removeEventListener( 'change', onChange ) );
	return dark;
}
