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
      <% if (isMultilangProject()) { %>
        &bullet;
        <a href="<%= getLangviewsURL(chartData[0].label) %>"><%= $.i18n('all-languages') %></a>
      <% } %>
      &bullet;
      <a href="<%= getPageURL(chartData[0].label) %>?action=history" target="_blank"><%= $.i18n('history') %></a>
      &bullet;
      <a href="<%= getPageURL(chartData[0].label) %>?action=info" target="_blank"><%= $.i18n('info') %></a>
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
              <a href="<%= getPageURL(chartData[i].label) %>" target="_blank"><%= chartData[i].label %></a>
            </div>
            <div class="linear-legend--counts">
              <%= formatNumber(chartData[i].sum) %> (<%= formatNumber(Math.round(chartData[i].sum / numDaysInRange())) %>/<%= $.i18n('day') %>)
            </div>
            <div class="linear-legend--links">
              <% if (isMultilangProject()) { %>
                <a href="<%= getLangviewsURL(chartData[i].label) %>"><%= $.i18n('all-languages') %></a>
                &bullet;
              <% } %>
              <a href="<%= getExpandedPageURL(chartData[i].label) %>&action=history" target="_blank"><%= $.i18n('history') %></a>
              &bullet;
              <a href="<%= getExpandedPageURL(chartData[i].label) %>&action=info" target="_blank"><%= $.i18n('info') %></a>
            </div>
          </span>
        <% } %>
      </div>
    <% } %>`,
  circularLegend: `
    <% var total = chartData.reduce(function(a,b){ return a + b.value }, 0); %>
    <div class="linear-legend--totals">
      <strong><%= $.i18n('totals') %>:</strong>
      <%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/<%= $.i18n('day') %>)
    </div>
    <div class="linear-legends">
      <% for (var i=0; i<segments.length; i++) { %>
        <span class="linear-legend">
          <div class="linear-legend--label" style="background-color:<%= segments[i].fillColor %>">
            <a href="<%= getPageURL(segments[i].label) %>" target="_blank"><%= segments[i].label %></a>
          </div>
          <div class="linear-legend--counts">
            <%= formatNumber(chartData[i].value) %> (<%= formatNumber(Math.round(chartData[i].value / numDaysInRange())) %>/<%= $.i18n('day') %>)
          </div>
          <div class="linear-legend--links">
            <% if (isMultilangProject()) { %>
              <a href="<%= getLangviewsURL(segments[i].label) %>"><%= $.i18n('all-languages') %></a>
              &bullet;
            <% } %>
            <a href="<%= getExpandedPageURL(segments[i].label) %>&action=history" target="_blank"><%= $.i18n('history') %></a>
            &bullet;
            <a href="<%= getExpandedPageURL(segments[i].label) %>&action=info" target="_blank"><%= $.i18n('info') %></a>
          </div>
        </span>
      <% } %>
    </div>
    `
};

module.exports = templates;
