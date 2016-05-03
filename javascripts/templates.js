/**
 * @file Templates used by Chart.js
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

/**
 * Templates used by Chart.js.
 * Functions used within our app must be in the global scope.
 * All quotations must be double-quotes or properly escaped.
 * @type {Object}
 */
const templates = {
  // FIXME: add back a tile for Totals, and include totals for all of the currently selected project, and perhaps unique devices
  linearLegend: `
    <% if (chartData.length === 1) { %>
      <strong><%= i18nMessages.totals %>:</strong>
      <%= formatNumber(chartData[0].sum) %> (<%= formatNumber(Math.round(chartData[0].sum / numDaysInRange())) %>/${i18nMessages.day})
      <% if (isMultilangProject()) { %>
        &bullet;
        <a href="<%= getLangviewsURL(chartData[0].label) %>">All languages</a>
      <% } %>
      &bullet;
      <a href="<%= getPageURL(chartData[0].label) %>?action=history" target="_blank">History</a>
      &bullet;
      <a href="<%= getPageURL(chartData[0].label) %>?action=info" target="_blank">Info</a>
    <% } else { %>
      <% var total = chartData.reduce(function(a,b) { return a + b.sum }, 0); %>
      <div class="linear-legend--totals">
        <strong><%= i18nMessages.totals %>:</strong>
        <%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/${i18nMessages.day})
      </div>
      <div class="linear-legends">
        <% for (var i=0; i<chartData.length; i++) { %>
          <span class="linear-legend">
            <div class="linear-legend--label" style="background-color:<%= chartData[i].strokeColor %>">
              <a href="<%= getPageURL(chartData[i].label) %>" target="_blank"><%= chartData[i].label %></a>
            </div>
            <div class="linear-legend--counts">
              <%= formatNumber(chartData[i].sum) %> (<%= formatNumber(Math.round(chartData[i].sum / numDaysInRange())) %>/${i18nMessages.day})
            </div>
            <div class="linear-legend--links">
              <% if (isMultilangProject()) { %>
                <a href="<%= getLangviewsURL(chartData[i].label) %>">All languages</a>
                &bullet;
              <% } %>
              <a href="<%= getExpandedPageURL(chartData[i].label) %>&action=history" target="_blank">History</a>
              &bullet;
              <a href="<%= getExpandedPageURL(chartData[i].label) %>&action=info" target="_blank">Info</a>
            </div>
          </span>
        <% } %>
      </div>
    <% } %>`,
  circularLegend: '<b>' + i18nMessages.totals + '</b> <% var total = chartData.reduce(function(a,b){ return a + b.value }, 0); %>' +
    '<ul class=\"<%=name.toLowerCase()%>-legend\">' +
    `<%if(chartData.length > 1) {%><li><%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/${i18nMessages.day})</li><% } %>` +
    '<% for (var i=0; i<segments.length; i++){%>' +
    '<li><span class=\"indic\" style=\"background-color:<%=segments[i].fillColor%>\">' +
    "<a href='<%= getPageURL(segments[i].label) %>'><%=segments[i].label%></a></span> " +
    `<%= formatNumber(chartData[i].value) %> (<%= formatNumber(Math.round(chartData[i].value / numDaysInRange())) %>/${i18nMessages.day})</li><%}%></ul>`
};

module.exports = templates;
