import ChartHelpers from '../chart_helpers.js';
import appConfig from './config.js';

/**
 * Pageviews Analysis tool.
 *
 * @link https://pageviews.wmcloud.org
 */
class Pageviews extends ChartHelpers {

	constructor() {
		super( 'pageviews', appConfig );

		this.entityInfo = false; /** lets us know if we've gotten the page info from API yet */
		this.specialRange = null;
		this.initialQuery = false;
		this.sort = 'views';
		this.direction = '1';

		// Keep track of last valid start/end of month (when date type is set to month).
		// This is because the bootstrap datepicker library does not handle this natively
		this.monthStart = this.initialMonthStart;
		this.monthEnd = this.maxMonth;

		/**
		 * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
		 * caused by race conditions between consecutive ajax calls. They are actually
		 * not critical and can be avoided with this empty function.
		 */
		window.articleSuggestionCallback = $.noop;
	}

	/**
	 * Initialize the application.
	 * Called in `pv.js` after translations have loaded
	 */
	initialize() {
		this.setupDateRangeSelector();
		this.setupSelect2();
		this.setupSelect2Colors();
		this.popParams();
		this.setupListeners();
		this.updateInterAppLinks();
	}

	/**
	 * Link to /langviews for given page and chosen daterange
	 *
	 * @param {string} page page title
	 * @return {string} URL
	 */
	getLangviewsURL( page ) {
		return `/langviews?${ $.param( this.getParams() ) }&page=${ encodeURIComponent( page.score() ) }`;
	}

	/**
	 * Link to /redirectviews for given page and chosen daterange
	 *
	 * @param {string} page page title
	 * @return {string} URL
	 */
	getRedirectviewsURL( page ) {
		return `/redirectviews?${ $.param( this.getParams() ) }&page=${ encodeURIComponent( page.score() ) }`;
	}

	/**
	 * Construct query for API based on what type of search we're doing
	 *
	 * @param {Object} query as returned from Select2 input
	 * @return {Object} query params to be handed off to API
	 */
	getSearchParams( query ) {
		if ( this.config.autocomplete === 'autocomplete' ) {
			return {
				action: 'query',
				list: 'prefixsearch',
				format: 'json',
				pssearch: query || '',
				cirrusUseCompletionSuggester: 'yes'
			};
		} else if ( this.config.autocomplete === 'autocomplete_redirects' ) {
			return {
				action: 'query',
				generator: 'prefixsearch',
				format: 'json',
				gpssearch: query || '',
				gpslimit: '10',
				redirects: 'true',
				cirrusUseCompletionSuggester: 'no'
			};
		}
	}

	/**
	 * Parses the URL query string and sets all the inputs accordingly
	 * Should only be called on initial page load, until we decide to support pop states (probably never)
	 */
	popParams() {
		/** show loading indicator and add error handling for timeouts */
		// FIXME: This gets stuck sometimes when changing tabs. Ancient bug that should be fixed!
		setTimeout( this.startSpinny.bind( this ) ); // use setTimeout to force rendering threads to catch up

		const params = this.validateParams(
			this.parseQueryString( 'pages' )
		);

		this.config.$projectInput.val( params.project );
		this.config.$platformSelector.val( params.platform );
		this.config.$agentSelector.val( params.agent );
		this.config.$redirectsCheckbox.prop( 'checked', this.alwaysRedirects === 'true' || params.redirects === '1' );

		this.validateDateRange( params );

		this.resetSelect2();

		/**
		 * Sets the Select2 defaults, which triggers the Select2 listener and calls this.processInput
		 *
		 * @param {Array} pages pages to query
		 */
		const getPageInfoAndSetDefaults = ( pages ) => {
			this.getPageAndEditInfo( pages ).then( ( pageInfo ) => {
				this.initialQuery = true;
				const normalizedPageNames = Object.keys( pageInfo.entities );

				// all given pages were invalid, reset view without clearing the error message
				if ( !normalizedPageNames.length ) {
					return this.resetView( false, false );
				}

				this.setSelect2Defaults(
					this.underscorePageNames( normalizedPageNames )
				);
			} );
		};

		// set up default pages if none were passed in
		if ( !params.pages || !params.pages.length ) {
			this.getDefaultPages().done( ( pages ) => {
				this.setInitialChartType( pages.length );
				getPageInfoAndSetDefaults( pages );
			} ).fail( () => {
				this.resetView();
				this.setInitialChartType();
				// leave Select2 empty and put focus on it so they can type in pages
				this.focusSelect2();
			} );
			// If there's more than 10 articles attempt to create a PagePile and open it in Massviews
		} else if ( params.pages.length > 10 ) {
			// If a PagePile is successfully created we are redirected to Massviews and the promise is never resolved,
			//   otherwise we just take the first 10 and process as we would normally
			this.massviewsRedirectWithPagePile( params.pages ).then( getPageInfoAndSetDefaults );
		} else {
			this.setInitialChartType( params.pages.length );
			getPageInfoAndSetDefaults( params.pages );
		}
	}

	/**
	 * Get the pages that should be shown if none were requested in the URL
	 *
	 * @return {Deferred} promise resolving with the array of pages to be shown, based on project
	 */
	getDefaultPages() {
		const dfd = $.Deferred();

		const getMainPage = () => {
			this.fetchSiteInfo( this.project ).done( ( siteInfo ) => {
				dfd.resolve( [ siteInfo[ this.project ].general.mainpage ] );
			} ).fail( dfd.reject );
		};

		// only set default of Cat and Dog for enwiki
		if ( this.project === 'en.wikipedia' ) {
			dfd.resolve( [ 'Cat', 'Dog' ] );
		} else if ( this.project.includes( 'wikipedia' ) ) {
			// get local title for Cat and Dog
			const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki' +
				'&titles=Cat|Dog&props=sitelinks/urls|datatype&format=json&callback=?';

			$.getJSON( url ).done( ( data ) => {
				if ( data.error ) {
					return dfd.resolve();
				}

				const dbName = Object.keys( siteMap ).find( ( key ) => siteMap[ key ] === `${ this.project }.org` );
				const pages = Object.keys( data.entities ).map( ( key ) => data.entities[ key ].sitelinks[ dbName ] ? data.entities[ key ].sitelinks[ dbName ].title : null ).filter( Boolean );

				// 'Cat' and 'Dog' do not exist, so use the Main Page.
				if ( !pages.length ) {
					return getMainPage();
				}

				dfd.resolve( pages );
			} );
		} else {
			// get mainpage from siteinfo
			getMainPage();
		}

		return dfd;
	}

	/**
	 * Processes Mediawiki API results into Select2 format based on settings
	 *
	 * @param {Object} data data as received from the API
	 * @return {Object} data ready to handed over to Select2
	 */
	processSearchResults( data ) {
		const query = data ? data.query : {};
		let results = [];

		if ( !query ) {
			return { results };
		}

		if ( this.config.autocomplete === 'autocomplete' ) {
			if ( query.prefixsearch.length ) {
				results = query.prefixsearch.map( ( elem ) => ( {
					id: elem.title.score(),
					text: elem.title
				} ) );
			}
		} else if ( this.config.autocomplete === 'autocomplete_redirects' ) {
			/** first merge in redirects */
			if ( query.redirects ) {
				results = query.redirects.map( ( red ) => ( {
					id: red.from.score(),
					text: red.from
				} ) );
			}

			Object.keys( query.pages ).forEach( ( pageId ) => {
				const pageData = query.pages[ pageId ];
				results.push( {
					id: pageData.title.score(),
					text: pageData.title
				} );
			} );
		}

		return { results: results };
	}

	/**
	 * Get all user-inputted parameters except the pages
	 *
	 * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
	 * @return {Object} project, platform, agent, etc.
	 */
	getParams( specialRange = true ) {
		const params = {
			project: this.config.$projectInput.val(),
			platform: this.config.$platformSelector.val(),
			agent: this.config.$agentSelector.val(),
			redirects: this.includeRedirects() ? '1' : '0'
		};

		/**
		 * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
		 * Valid values are those defined in config.specialRanges, constructed like `{range: 'last-month'}`,
		 *   or a relative range like `{range: 'latest-N'}` where N is the number of days.
		 */
		if ( this.specialRange && specialRange ) {
			params.range = this.specialRange.range;
		} else {
			[ params.start, params.end ] = this.getDates( true );
		}

		/** add autolog param only if it was passed in originally, and only if it was false (true would be default) */
		if ( this.noLogScale ) {
			params.autolog = 'false';
		}

		return params;
	}

	/**
	 * Replaces history state with new URL query string representing current user input.
	 * Called whenever we go to update the chart.
	 *
	 * @override
	 */
	pushParams() {
		super.pushParams( 'pages' );
	}

	/**
	 * Sets up the article selector and adds listener to update chart
	 */
	setupSelect2() {
		const params = {
			ajax: this.getArticleSelectorAjax(),
			tags: this.autocomplete === 'no_autocomplete',
			placeholder: this.i18n( 'article-placeholder' ),
			maximumSelectionLength: 10,
			minimumInputLength: 1
		};
		super.setupSelect2( params );

		this.config.$select2Input.off( 'select2:open' ).on( 'select2:open', ( e ) => {
			if ( $( e.target ).val() && $( e.target ).val().length === 10 ) {
				$( '.select2-search__field' ).one( 'keyup', () => {
					const message = this.i18n(
						'massviews-notice',
						10,
						`<strong><a href='/massviews/'>${ this.i18n( 'massviews' ) }</a></strong>`
					);
					this.toastInfo( message );
				} );
			}
		} );
	}

	/**
	 * Get ajax parameters to be used in setupSelect2, based on this.autocomplete
	 *
	 * @return {object|null} to be passed in as the value for `ajax` in setupSelect2
	 */
	getArticleSelectorAjax() {
		if ( this.autocomplete !== 'no_autocomplete' ) {
			/**
			 * This ajax call queries the Mediawiki API for article name
			 * suggestions given the search term inputted in the selector.
			 * We ultimately want to make the endpoint configurable based on whether they want redirects
			 */
			return {
				url: `https://${ this.project }.org/w/api.php?origin=*`,
				dataType: 'json',
				delay: 200,
				data: ( search ) => this.getSearchParams( search.term ),
				processResults: this.processSearchResults.bind( this ),
				cache: true
			};
		} else {
			return null;
		}
	}

	/**
	 * Removes chart, messages, and resets site selections
	 *
	 * @param {boolean} [select2] whether or not to clear the Select2 input
	 * @param {boolean} [clearMessages] whether or not to clear any exisitng errors from view
	 * @override
	 */
	resetView( select2 = false, clearMessages = true ) {
		super.resetView( select2, clearMessages );
		this.$outputList.html( '' );
		$( '.single-entity-ranking' ).html( '' );
		$( '.single-page-stats' ).html( '' );
		$( '.single-page-legend' ).html( '' );
	}

	/**
	 * Calls parent setupProjectInput and updates the view if validations passed
	 *   reverting to the old value if the new one is invalid
	 *
	 * @override
	 */
	validateProject() {
		if ( super.validateProject() ) {
			this.resetView( true );
			this.focusSelect2();
		}
	}

	/**
	 * General place to add page-wide listeners
	 *
	 * @override
	 */
	setupListeners() {
		super.setupListeners();
		this.config.$platformSelector
			.add( this.config.$agentSelector )
			.add( this.config.$redirectsCheckbox )
			.on( 'change', this.processInput.bind( this ) );
	}

	/**
	 * Combine redirect views into the main set of pageviews.
	 *
	 * @param {Object} redirectsData As retrieved by getRedirects()
	 * @param {Object} xhrData As retrieved by getPageViewsData()
	 * @return {Object}
	 */
	consolidateRedirectData( redirectsData, xhrData ) {
		const targetTitles = Object.keys( redirectsData );

		if ( !this.includeRedirects() || !targetTitles.length || !xhrData.entities.length ) {
			return xhrData;
		}

		const newXhrData = {
			entities: targetTitles,
			labels: xhrData.labels,
			datasets: new Array( targetTitles.length ),
			errors: xhrData.errors,
			fatalErrors: xhrData.fatalErrors,
			promises: xhrData.promises
		};
		const dateHeadings = this.getDateHeadings( false ),
			dateFormat = this.isMonthly() ? 'YYYY-MM' : 'YYYY-MM-DD';

		Object.keys( redirectsData ).forEach( ( target, targetIndex ) => {
			// Collect all the titles of the redirects for this `target` page.
			const allTitles = redirectsData[ target ].map( ( rd ) => rd.title );

			allTitles.forEach( ( title ) => {
				// Find index within `xhrData.entities`.
				const redirIndex = xhrData.entities.indexOf( title );

				if ( redirIndex === -1 ) {
					// Most likely 404'd (no pageviews).
					return;
				}

				// Get the data set for that redirect.
				const redirDataset = xhrData.datasets[ redirIndex ];

				// Loop through each item in the timeseries, summing redirect pageviews as if they were all for the target page.
				redirDataset.map( ( elem ) => {
					const date = moment( elem.timestamp, this.config.timestampFormat ).format( dateFormat );
					const index = dateHeadings.indexOf( date );
					const newViews = newXhrData.datasets[ targetIndex ] && newXhrData.datasets[ targetIndex ][ index ] ?
						newXhrData.datasets[ targetIndex ][ index ].views :
						0;

					elem.article = title;
					elem.views = elem.views + newViews;

					// Add to newXhrData.
					newXhrData.datasets[ targetIndex ] = newXhrData.datasets[ targetIndex ] || new Array( dateHeadings.length );
					newXhrData.datasets[ targetIndex ][ index ] = elem;
				} );
			} );
		} );

		return newXhrData;
	}

	/**
	 * Query the API for each page, building up the datasets and then calling renderData
	 *
	 * @param {boolean} [force] whether to force the chart to re-render, even if no params have changed
	 * @param {string} [removedPage] page that was just removed via Select2, supplied by select2:unselect handler
	 * @return {void}
	 */
	processInput( force, removedPage ) {
		const entities = this.beforeProcessInput( force );
		if ( !entities ) {
			return;
		}

		const getPageViewsAndAssessments = ( entities ) => {
			this.getRedirects( entities ).done( ( redirectsData ) => {
				// Fetch all the redirects and concat into `entities`.
				Object.keys( redirectsData ).forEach( ( target ) => {
					entities = entities.concat( redirectsData[ target ].map( ( rd ) => rd.title.score() ) );
				} );
				this.getPageViewsData( entities.unique() ).done( ( xhrData ) => {
					this.updateChart(
						this.consolidateRedirectData( redirectsData, xhrData )
					);
				} );
			} );
		};

		if ( removedPage ) {
			// we've got the data already, just removed a single page, so we'll remove that data
			// and re-render the chart
			this.removeEntity( removedPage );

			// But make sure we have editing totals first. We have to re-query to ensure an
			//   accurate number of "unique" editors.
			this.getEditData( Object.keys( this.entityInfo.entities ) ).done( ( editData ) => {
				if ( editData.totals ) {
					Object.assign( this.entityInfo.totals, editData.totals );
				}
				this.updateChart();
			} );
		} else if ( this.initialQuery ) {
			// We've already gotten data about the initial set of pages.
			// This is because we need any page names given to be normalized when the app first loads.
			getPageViewsAndAssessments( entities );

			// Set back to false so we get page and edit info for any newly entered pages.
			this.initialQuery = false;
		} else {
			this.getPageAndEditInfo( entities.map( ( entity ) => encodeURIComponent( entity ) ) ).then( () => {
				getPageViewsAndAssessments( entities );
			} );
		}
	}

	/**
	 * Query API to get edit data about page within date range
	 *
	 * @param {Array} pages - page names
	 * @return {Deferred} Promise resolving with editing data
	 */
	getEditData( pages ) {
		const dfd = $.Deferred();

		$.ajax( {
			url: `/${ this.app }/api`,
			data: {
				pages: pages.join( '|' ),
				project: this.project + '.org',
				start: this.daterangepicker.startDate.format( 'YYYY-MM-DD' ),
				end: this.daterangepicker.endDate.format( 'YYYY-MM-DD' ),
				totals: true,
				ttl: this.config.cacheTime
			},
			timeout: 8000
		} ).done( ( data ) => dfd.resolve( data ) ).fail( () => {
			// stable flag will be used to handle lack of data, so just resolve with empty data
			const data = {};
			pages.forEach( ( page ) => data[ page ] = {} );
			dfd.resolve( { pages: data } );
		} );

		return dfd;
	}

	/**
	 * Show info below the chart when there is only one page being queried
	 */
	showSingleEntityLegend() {
		const page = this.outputData[ 0 ];
		const topviewsMonth = this.getTopviewsMonth( false ); // 'false' to go off of endDate
		const topviewsDate = `${ topviewsMonth.format( 'YYYY' ) }/${ topviewsMonth.format( 'MM' ) }/all-days`;

		$.ajax( {
			url: `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${ this.project }/` +
				`${ this.config.$platformSelector.val() }/${ topviewsDate }`,
			dataType: 'json'
		} ).done( ( data ) => {
			// store pageData from API, removing underscores from the page name
			const entry = data.items[ 0 ].articles.find( ( tv ) => tv.article === page.label.score() );
			if ( entry ) {
				const monthName = this.daterangepicker.locale.monthNames[ topviewsMonth.month() ];
				const topviewsLink = `<a target='_blank' href='${ this.getTopviewsMonthURL( this.project + '.org', topviewsMonth ) }'>` +
					this.i18n( 'most-viewed-pages' ).toLowerCase() + '</a>';

				$( '.single-entity-ranking' ).html(
					this.i18n( 'most-viewed-rank', entry.rank, topviewsLink, `${ monthName } ${ topviewsMonth.year() }` )
				);
			}
		} ).always( () => {
			$( '.table-view' ).hide();
			$( '.single-page-stats' ).html( `
				${ this.getPageLink( page.label ) }
				${ page.assessment ? '&middot;\n' + this.getAssessmentBadge( page ) : '' }
				&middot;
				<span class='text-muted'>
					${ this.config.$dateRangeSelector.val() }
				</span>
				&middot;
				${ this.i18n( 'num-pageviews', this.config.formatNumber( page.sum ), page.sum ) }
				<span class='hidden-lg'>
					(${ this.config.formatNumber( page.average ) }/${ this.i18n( this.isMonthly() ? 'month' : 'day' ) })
				</span>`
			);
			$( '.single-page-legend' ).html( this.config.chartLegend() );
		} );
	}

	/**
	 * Update the page comparison table, shown below the chart.
	 */
	updateTable() {
		const datasets = this.beforeUpdateTable();
		if ( !datasets ) {
			return;
		}

		if ( !$.isNumeric( this.outputData[ 0 ].num_edits ) ) {
			$( '.legend-block--revisions .legend-block--body' ).html(
				`<span class='text-muted'>${ this.i18n( 'data-unavailable' ) }</span>`
			);
		}

		let hasProtection = false,
			hasAssessment = false;
		datasets.forEach( ( item ) => {
			if ( item.protection !== this.i18n( 'none' ).toLowerCase() ) {
				hasProtection = true;
			}
			if ( item.assessment && item.assessment.length ) {
				hasAssessment = true;
			}

			this.$outputList.append( this.config.templates.tableRow( this, item ) );
		} );

		// add summations to show up as the bottom row in the table
		const sum = datasets.reduce( ( a, b ) => a + b.sum, 0 ),
			numProtections = datasets.filter( ( page ) => page.protection !== 'none' ).length;

		const totals = {
			label: this.i18n( 'num-pages', this.config.formatNumber( datasets.length ), datasets.length ),
			sum,
			average: Math.round( sum / ( datasets[ 0 ].data.filter( ( el ) => el !== null ) ).length ),
			num_edits: this.entityInfo.totals ? this.entityInfo.totals.num_edits : null,
			num_users: this.entityInfo.totals ? this.entityInfo.totals.num_users : null,
			length: datasets.reduce( ( a, b ) => a + b.length, 0 ),
			protection: this.i18n( 'num-protections', this.config.formatNumber( numProtections ), numProtections ),
			watchers: datasets.reduce( ( a, b ) => a + ( b.watchers || 0 ), 0 )
		};
		this.$outputList.append( this.config.templates.tableRow( this, totals, true ) );

		// hide protection column if no pages are protected
		$( '.table-view--protection' ).toggle( hasProtection );
		$( '.table-view--class' ).toggle( hasAssessment );

		$( '.table-view' ).show();
	}

	/**
	 * Get value of given page for the purposes of column sorting in table view
	 *
	 * @param  {Object} item page name
	 * @param  {string} type type of property to get
	 * @return {string | number} value
	 */
	getSortProperty( item, type ) {
		switch ( type ) {
			case 'title':
				return item.label;
			case 'class':
				return item.assessment;
			case 'views':
				return Number( item.sum );
			case 'average':
				return Number( item.average );
			case 'edits':
				return Number( item.num_edits );
			case 'editors':
				return Number( item.num_users );
			case 'size':
				return Number( item.length );
			case 'watchers':
				return Number( item.watchers );
		}
	}

	/**
	 * Get page info and editing info of given pages.
	 * Also sets this.entityInfo
	 *
	 * @param  {Array} pages page names
	 * @return {Deferred} Promise resolving with this.entityInfo
	 */
	getPageAndEditInfo( pages ) {
		const dfd = $.Deferred();

		this.getPageInfo( pages ).done( ( data ) => {
			// throw errors for missing pages and remove them from the list to be processed
			for ( const page in data ) {
				if ( data[ page ].missing && !data[ page ].known ) {
					this.writeMessage( `${ this.getPageLink( page ) }: ${ this.i18n( 'api-error-no-data' ) }` );
					delete data[ page ];
				}
			}

			this.entityInfo = { entities: data };

			const dataKeys = Object.keys( data );

			if ( !dataKeys.length ) {
				return dfd.resolve( this.entityInfo );
			}

			// use Object.keys(data) to get normalized page names
			this.getEditData( dataKeys ).done( ( editData ) => {
				dataKeys.forEach( ( page ) => {
					const pageData = editData.pages[ page ] || {};

					// find the edit protection within API response, or use the already fetched one if present
					let protection = this.entityInfo.entities[ page ].protection || [];
					if ( Array.isArray( protection ) ) {
						protection = protection.find( ( prot ) => prot.type === 'edit' );
					}

					pageData.protection = protection ? protection.level : this.i18n( 'none' ).toLowerCase();

					Object.assign( this.entityInfo.entities[ page ], pageData );
				} );
				this.entityInfo.totals = editData.totals;
				dfd.resolve( this.entityInfo );
			} ).fail( () => {
				dfd.resolve( this.entityInfo ); // treat as if successful, simply won't show the data
			} );
		} ).fail( () => {
			dfd.resolve( {} ); // same, simply won't show the data if it failed
		} );

		return dfd;
	}

	/**
	 * Create a PagePile with given pages using the API and redirect to Massviews.
	 * This is used when the user passes in more than 10 pages
	 *
	 * @param {Array} pages pages to convert to a PagePile and open in Massviews
	 * @return {Deferred} promise resolved only if creation of PagePile failed
	 */
	massviewsRedirectWithPagePile( pages ) {
		const dfd = $.Deferred();

		$.ajax( {
			url: 'https://pagepile.wmflabs.org/api.php',
			data: {
				action: 'create_pile_with_data',
				wiki: this.dbName( this.project ),
				data: pages.join( '\n' )
			}
		} ).success( ( pileData ) => {
			const params = this.getParams();
			delete params.project;
			document.location = `/massviews?overflow=1&${ $.param( params ) }&source=pagepile&target=${ pileData.pile.id }`;
		} ).fail( () => {
			// just grab first 10 pages and throw an error
			this.toastError(
				this.i18n( 'auto-pagepile-error', 'PagePile', 10 )
			);
			dfd.resolve( pages.slice( 0, 10 ) );
		} );

		return dfd;
	}
}

new Pageviews();
