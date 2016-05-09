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
  linearLegend: `
    <% if (chartData.length === 1) { %>
      <strong><%= $.i18n('totals') %>:</strong>
      <%= formatNumber(chartData[0].sum) %> (<%= formatNumber(Math.round(chartData[0].sum / numDaysInRange())) %>/<%= $.i18n('day') %>)
      &bullet;
      <a href="https://<%= chartData[0].label %>/wiki/Special:Statistics?uselang=<%= i18nLang %>" target="_blank"><%= $.i18n('statistics') %></a>
      &bullet;
      <a href="<%= getTopviewsURL(chartData[0].label) %>" target="_blank"><%= $.i18n('most-viewed-pages') %></a>
    <% } else { %>
      <% var total = chartData.reduce(function(a,b) { return a + b.sum }, 0); %>
      <div class="linear-legend--totals">
        <strong><%= $.i18n('totals') %>:</strong>
        <%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/<%= $.i18n('day') %>)
      </div>
      <div class="linear-legends">
        <% for (var i=0; i<chartData.length; i++) { %>
          <span class="linear-legend">
            <div class="linear-legend--label" style="background-color:<%= chartData[i].strokeColor %>">
              <a href="https://<%= chartData[i].label %>" target="_blank"><%= chartData[i].label %></a>
            </div>
            <div class="linear-legend--counts">
              <%= formatNumber(chartData[i].sum) %> (<%= formatNumber(Math.round(chartData[i].sum / numDaysInRange())) %>/<%= $.i18n('day') %>)
            </div>
            <div class="linear-legend--links">
              <a href="https://<%= chartData[i].label %>/wiki/Special:Statistics?uselang=<%= i18nLang %>" target="_blank"><%= $.i18n('statistics') %></a>
              &bullet;
              <a href="<%= getTopviewsURL(chartData[i].label) %>" target="_blank"><%= $.i18n('most-viewed-pages') %></a>
            </div>
          </span>
        <% } %>
      </div>
    <% } %>`,
  circularLegend: `
    <b><%= $.i18n('totals') %></b> <% var total = chartData.reduce(function(a,b){ return a + b.value }, 0); %>
    <ul class="<%=name.toLowerCase()%>-legend">
      <% if(chartData.length > 1) { %><li><%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/<%= $.i18n('day') %>)</li><% } %>
      <% for (var i=0; i<segments.length; i++) { %>
        <li>
          <span class="indic" style="background-color:<%=segments[i].fillColor%>">
            <a href='https://<%= segments[i].label %>'><%=segments[i].label%></a>
          </span>
          <%= formatNumber(chartData[i].value) %> (<%= formatNumber(Math.round(chartData[i].value / numDaysInRange())) %>/<%= $.i18n('day') %>)
        </li>
      <% } %>
    </ul>
    `
};

module.exports = templates;
