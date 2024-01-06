import express from 'express';

import { bindMethod } from 'akso/workers/http/routing';

import { init as route$editions } from './editions';
import { init as route$subscriptions } from './subscriptions';

import method$get from './get';
import method$delete from './delete';
import method$patch from './patch';

/**
 * Sets up /magazines/{magazineId}
 * @return {express.Router}
 */
export function init () {
	const router = new express.Router({ mergeParams: true });

	router.use('/editions', route$editions());
	router.use('/subscriptions', route$subscriptions());

	bindMethod(router, '/', 'get', method$get);
	bindMethod(router, '/', 'delete', method$delete);
	bindMethod(router, '/', 'patch', method$patch);

	return router;
}
