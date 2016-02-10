"use strict";

var templates = {
  linearLegend: "<b>Totals:</b><ul class=\"<%=name.toLowerCase()%>-legend\">" + "<% for (var i=0; i<datasets.length; i++){%>" + "<li><span class=\"indic\" style=\"background-color:<%=datasets[i].strokeColor%>\">" + "<a href='<%= getPageURL(datasets[i].label) %>'><%=datasets[i].label%></a></span> " + "<%= chartData[i].sum %> (<%= Math.round(chartData[i].sum / numDaysInRange()) %>/day)</li><%}%></ul>",
  circularLegend: "<b>Totals:</b><ul class=\"<%=name.toLowerCase()%>-legend\">" + "<% for (var i=0; i<segments.length; i++){%>" + "<li><span class=\"indic\" style=\"background-color:<%=segments[i].fillColor%>\">" + "<a href='<%= getPageURL(segments[i].label) %>'><%=segments[i].label%></a></span> " + "<%= chartData[i].value %> (<%= Math.round(chartData[i].value / numDaysInRange()) %>/day)</li><%}%></ul>"
};
