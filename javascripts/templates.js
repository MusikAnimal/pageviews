const templates = {
  linearLegend: `<b>${i18nMessages.totals}</b> <% var total = chartData.reduce(function(a,b){ return a + b.sum }, 0); %>` +
    '<ul class=\"<%=name.toLowerCase()%>-legend\">' +
    `<%if(chartData.length > 1) {%><li><%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/${i18nMessages.day})</li><% } %>` +
    '<% for (var i=0; i<datasets.length; i++){%>' +
    '<li><span class=\"indic\" style=\"background-color:<%=datasets[i].strokeColor%>\">' +
    "<a href='<%= getPageURL(datasets[i].label) %>'><%=datasets[i].label%></a></span> " +
    `<%= formatNumber(chartData[i].sum) %> (<%= formatNumber(Math.round(chartData[i].sum / numDaysInRange())) %>/${i18nMessages.day})</li><%}%></ul>`,
  circularLegend: '<b>' + i18nMessages.totals + '</b> <% var total = chartData.reduce(function(a,b){ return a + b.value }, 0); %>' +
    '<ul class=\"<%=name.toLowerCase()%>-legend\">' +
    `<%if(chartData.length > 1) {%><li><%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/${i18nMessages.day})</li><% } %>` +
    '<% for (var i=0; i<segments.length; i++){%>' +
    '<li><span class=\"indic\" style=\"background-color:<%=segments[i].fillColor%>\">' +
    "<a href='<%= getPageURL(segments[i].label) %>'><%=segments[i].label%></a></span> " +
    `<%= formatNumber(chartData[i].value) %> (<%= formatNumber(Math.round(chartData[i].value / numDaysInRange())) %>/${i18nMessages.day})</li><%}%></ul>`
};

module.exports = templates;

/*
<div style="
  display: block;
  float: none;
  width: 200px;
  border: solid 1px black;
  border-radius: 5px;
  line-height: 15px;
"><div class="indic" style="background-color:rgba(171, 212, 235, 1);width: 100%;"><a href="//en.wikipedia.org/wiki/Cat" style="
  float: none;
">Cat</a></div><div style="
  padding: 5px 10px;
  padding-bottom: 0;
"> 526,405 (8,773/day)</div><div style="
  padding: 5px 10px;
">Langviews • History
</div></div>
 */
