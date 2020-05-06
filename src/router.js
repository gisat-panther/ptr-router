import Navigo from 'navigo';

function createHandler(app, data) {
	return function () {
		const [params, query] =
			arguments.length === 1 ? [null, arguments[0]] : arguments;

		const request = {};

		if (data != null) {
			request.match = {
				data,
				pathParams: params == null ? {} : params,
			};
		}

		if (query != null) {
			request.queryString = query;
		}

		app(request);
	};
}

function normalizeData(data) {
	if (typeof data === 'string') {
		return {name: data};
	}

	return data;
}
/**
 * @param {Object} options
 * @param {Object} options.routes Keys are paths in format `/path/:param`, values are route data (object with key 'name' or string)
 * @param {Function} options.app Function accepting request called when route is matched
 * @param {Function=} options.notFoundHandler Function accepting request called when no route is matched
 * @param {Function=} options.navHandler Function called instead of `nav` and `redirect` (useful for SSR)
 * @param {string} options.rootUrl
 * @param {string=} options.currentUrl Useful when doing SSR
 *
 * Request is map with optional keys:
 * - `match`
 *   - matched route. It is object with keys `data` (route data object), `pathParams`
 * - `queryString`
 */
export function create({
	routes,
	app,
	notFoundHandler,
	rootUrl,
	currentUrl,
	navHandler,
}) {
	const navigoRoutes = Object.fromEntries(
		Object.entries(routes).map(([url, providedData]) => {
			const data = normalizeData(providedData);

			return [url, {as: data.name, uses: createHandler(app, data)}];
		})
	);

	const navigo = new Navigo(rootUrl);
	navigo.on(navigoRoutes);
	if (notFoundHandler) {
		navigo.notFound(createHandler(notFoundHandler));
	}
	navigo.resolve(currentUrl);

	return navHandler
		? {
				nav: (url) => {
					navHandler(url);
				},
				redirect: (url) => {
					navHandler(url);
				},
				refresh: () => {
					navigo.resolve();
				},
				pathFor: (page, params) => {
					return navigo.generate(page, params);
				},
		  }
		: {
				nav: (url) => {
					navigo.navigate(url);
				},
				redirect: (url) => {
					navigo.historyAPIUpdateMethod('replaceState');
					navigo.navigate(url);
					navigo.historyAPIUpdateMethod('pushState');
				},
				refresh: () => {
					navigo.resolve();
				},
				pathFor: (page, params) => {
					return navigo.generate(page, params);
				},
		  };
}
