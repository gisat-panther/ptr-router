export const CHANGE_PAGE = 'REDUX_ROUTER.CHANGE_PAGE';

export function changePage(name, params) {
	const action = {type: CHANGE_PAGE};

	const payload = {name};
	if (params != null) {
		payload.params = params;
	}

	action.payload = payload;

	return action;
}

export function pageSelector(state, basePath) {
	return state[basePath];
}

export function reducer(state = null, action) {
	switch (action.type) {
		case CHANGE_PAGE:
			return action.payload ?? null;
		default:
			return state;
	}
}
