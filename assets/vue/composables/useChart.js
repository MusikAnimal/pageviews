import { onBeforeUnmount, onMounted, onScopeDispose, ref, watch } from 'vue';
import { echarts } from '../charts/echarts.js';

/**
 * Manage an echarts instance's lifecycle inside a component: init on
 * mount, notMerge setOption on option changes, container-driven resize,
 * dispose on unmount.
 *
 * @param {import('vue').Ref<HTMLElement>} containerRef
 * @param {import('vue').Ref<Object>} optionRef
 * @param {Function} [onRangeSelect] Called with the ( startIndex,
 *   endIndex ) of the category axis when the user drag-selects a
 *   range. The selection is not kept as a client-side zoom — the
 *   caller is expected to narrow the query instead.
 * @return {{ getPngDataUrl: Function }}
 */
export function useChart( containerRef, optionRef, onRangeSelect = null ) {
	let chart = null;
	let resizeObserver = null;

	// Make drag-select zoom always active — no toolbox button needed —
	// on options carrying the (hidden) toolbox dataZoom feature. The
	// circular/radar types don't: they have no zoomable axis.
	function setDragZoom( active ) {
		chart.dispatchAction( {
			type: 'takeGlobalCursor',
			key: 'dataZoomSelect',
			dataZoomSelectActive: active
		} );
	}

	onMounted( () => {
		chart = echarts.init( containerRef.value );
		chart.setOption( optionRef.value, { notMerge: true } );
		if ( onRangeSelect && optionRef.value.toolbox?.feature?.dataZoom ) {
			setDragZoom( true );
		}
		resizeObserver = new ResizeObserver( () => chart && chart.resize() );
		resizeObserver.observe( containerRef.value );

		if ( onRangeSelect ) {
			chart.on( 'datazoom', ( params ) => {
				// Toolbox select-zoom reports through a batch entry.
				let { startValue, endValue } = params.batch?.[ 0 ] ?? params;
				if ( startValue === undefined ) {
					( { startValue, endValue } = chart.getOption().dataZoom?.[ 0 ] ?? {} );
				}
				if ( startValue === undefined || endValue === undefined ) {
					return;
				}
				onRangeSelect( Math.round( startValue ), Math.round( endValue ) );
			} );
		}
	} );

	watch( optionRef, ( option ) => {
		if ( chart ) {
			if ( onRangeSelect ) {
				// Release through the OUTGOING option's toolbox: the
				// replacement may have none to receive the action, and
				// the brush handler would survive the notMerge swap,
				// drawing selection boxes on circular/radar charts.
				setDragZoom( false );
			}
			chart.setOption( option, { notMerge: true } );
			// notMerge resets interaction state, so re-arm.
			if ( onRangeSelect && option.toolbox?.feature?.dataZoom ) {
				setDragZoom( true );
			}
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
		}
	};
}

/**
 * Reactive effective-dark-mode flag: a theme forced via the header
 * switch (the data-theme attribute on <html>) wins over
 * prefers-color-scheme. Include it in the computed that builds the
 * chart option so charts re-theme when the mode flips either way.
 *
 * @return {import('vue').Ref<boolean>}
 */
export function usePrefersDark() {
	const query = window.matchMedia( '(prefers-color-scheme: dark)' );
	const compute = () => {
		const forced = document.documentElement.dataset.theme;
		return forced ? forced === 'dark' : query.matches;
	};
	const dark = ref( compute() );
	const update = () => {
		dark.value = compute();
	};
	query.addEventListener( 'change', update );
	const observer = new MutationObserver( update );
	observer.observe( document.documentElement, {
		attributes: true,
		attributeFilter: [ 'data-theme' ]
	} );
	onScopeDispose( () => {
		query.removeEventListener( 'change', update );
		observer.disconnect();
	} );
	return dark;
}
