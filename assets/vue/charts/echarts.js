/**
 * The single import point for ECharts, using echarts/core with explicit
 * registration so the bundle only carries what we use. Import `echarts`
 * from here — never from the 'echarts' package directly.
 *
 * Chart types for the circular/radar builders (pie, radar) get registered
 * when those builders are added.
 */

import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
	AriaComponent,
	DataZoomComponent,
	GridComponent,
	LegendComponent,
	ToolboxComponent,
	TooltipComponent
} from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use( [
	AriaComponent,
	BarChart,
	CanvasRenderer,
	DataZoomComponent,
	GridComponent,
	LabelLayout,
	LegendComponent,
	LineChart,
	ToolboxComponent,
	TooltipComponent
] );

export { echarts };
