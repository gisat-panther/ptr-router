# ptr-router

## Api

### Router

```js
const router = create({
	routes,
	app,
	notFoundHandler,
	rootUrl,
	currentUrl,
	navHandler,
});
```

#### app

Function called when url is changed with signature> `request => void`.

`request` contains:
- `match.data`
    - matched route data (object with `name` property and additional arbitrary data)
- `queryString`
    - query part of the url

#### notFoundHandler

Function called when url is changed but there is no matching url. It is same as `app` except it doesn't contain `match` as nothing was matched.

#### routes

Mapping of url to route data received in `app` in `request.match.data`. Key is string with possible placeholders starting with `:`, value is either string or object containing `name` of type string with arbitrary additional data.

Example:
```js
const routes = {
    '': 'homepage', // route data is string
    '/hello/:name': { // route data is object with `name` and `handler` properties.
        name: 'hello',
        handler: request => {
            alert(`Hello ${request.match.pathParams.name}!`);
        }
    }
};
```

#### rootUrl

Base url.

#### currentUrl

Currently opened url (useful for SSR).

#### navHandler

Replaces routing behaviour on `nav` and `redirect`. Useful with SSR where redirect can be sent to browser when apps tries to open different url.

### Redux integration (optional)

This library provides functions that can be used to store/retrieve current page from Redux store.

```js
/**
 * Redux action storing page name with params into store.
 */
changePage(name, params);

/**
 * Redux selector retrieving page and action from store.
 */
pageSelector(state, basePath);

/**
 * Redux reducer.
 */
reducer(state = null, action);
```

## Demo

```js
import * as ptrRouter from '@gisatcz/ptr-router';

const routes = {
    '': 'homepage',
    '/hello/:name': {
        name: 'hello',
        handler: request => {
            // show alert when route is matched
            alert(`Hello ${request.match.pathParams.name}!`);
        }
    }
};

function app(request) {
    const handler = request.match.data.handler; // retrieve handler from route data
    if (handler != null) {
        handler(request); // call url handler if any
    }
}

const router = ptrRouter.create({routes});
const helloUrl = router.pathFor('hello', {name: 'John'}; // => /hello/John
router.nav(helloUrl); // opens page `/hello/John` that shows alert `Hello John!`
```
