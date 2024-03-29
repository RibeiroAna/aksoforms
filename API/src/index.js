import cluster from 'cluster';
import winston from 'winston';
import moment from 'moment-timezone';
import msgpack from 'msgpack-lite';
import path from 'path';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import { Cashify } from 'cashify';

import * as AKSODb from './db';

async function init () {
	Error.stackTraceLimit = 30;

	global.AKSO = {
		dir: path.normalize(path.join(__dirname, '../')),

		version: require('../package.json').version,

		log: winston.createLogger({
			level: 'info',
			format: winston.format.combine(
				winston.format.splat(),
				winston.format.colorize(),
				winston.format.timestamp({
					format: () => moment.tz().format('YYYY-MM-DD HH:mm:ss:SSS [Z]')
				}),
				winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
			),
			transports: [ new winston.transports.Console() ]
		}),

		msgpack: msgpack.createCodec({
			int64: true
		}),

		db: null,
		geodb: null,
		telegrafBotUser: null,

		exchangeRates: null,
		cashify: null,

		conf: {
			http: {
				port: 				process.env.AKSO_HTTP_PORT ?? 1111,
				trustProxy:	process.env.AKSO_HTTP_TRUST_PROXY ?? false,
				helmet:				process.env.AKSO_HTTP_USE_HELMET === undefined ?
					true : process.env.AKSO_HTTP_USE_HELMET != '0',
				sessionSecret:		process.env.AKSO_HTTP_SESSION_SECRET,
				corsCheck: 			process.env.AKSO_HTTP_DISABLE_CORS_CHECK === undefined ?
					true : process.env.AKSO_HTTP_DISABLE_CORS_CHECK == '0',
				csrfCheck: 			process.env.AKSO_HTTP_DISABLE_CSRF_CHECK === undefined ?
					true : process.env.AKSO_HTTP_DISABLE_CSRF_CHECK == '0',
				rateLimit:			process.env.AKSO_HTTP_DISABLE_RATE_LIMIT === undefined ?
					true : process.env.AKSO_HTTP_DISABLE_RATE_LIMIT == '0',
				loginSlowDown:		process.env.AKSO_HTTP_DISABLE_SLOW_DOWN === undefined ?
					true : process.env.AKSO_HTTP_DISABLE_SLOW_DOWN == '0',
				path:				process.env.AKSO_HTTP_PATH === undefined ?
					'/' : process.env.AKSO_HTTP_PATH,
				threads: 			process.env.AKSO_HTTP_THREADS === undefined ?
					3 : parseInt(process.env.AKSO_HTTP_THREADS, 10),
				outsideAddress:		process.env.AKSO_HTTP_OUTSIDE_ADDRESS ?? null
			},
			mysql: {
				host: process.env.AKSO_MYSQL_HOST,
				user: process.env.AKSO_MYSQL_USER,
				password: process.env.AKSO_MYSQL_PASSWORD,
				database: process.env.AKSO_MYSQL_DATABASE,
				geodbDatabase: process.env.AKSO_MYSQL_GEODB_DATABASE
			},
			// s3: {
			// 	bucket: process.env.AKSO_S3_BUCKET,
			// 	endpoint: process.env.AKSO_S3_ENDPOINT,
			// 	accessKeyId: process.env.AKSO_S3_ACCESS_KEY_ID,
			// 	secretAccessKey: process.env.AKSO_S3_SECRET_ACCESS_KEY,
			// 	region: process.env.AKSO_S3_REGION,
			// },
			rabbitmq: process.env.AKSO_RABBITMQ,
			nodemailer: {
				transport: JSON.parse(process.env.AKSO_NODEMAILER ?? '{}'),
			},
			telegram: {
				token: process.env.AKSO_TELEGRAM_TOKEN
			},
			stripe: {
				deleteWebhooks: process.env.AKSO_STRIPE_WEBHOOKS_ARE_TEMP === undefined ?
					false : process.env.AKSO_STRIPE_WEBHOOKS_ARE_TEMP != '0'
			},
			prodMode: process.env.NODE_ENV ?? 'dev',
			totpAESKey: Buffer.from(process.env.AKSO_TOTP_AES_KEY ?? '', 'hex'),
			stateDir: process.env.AKSO_STATE_DIR,
			loginNotifsEnabled: process.env.AKSO_DISABLE_LOGIN_NOTIFS === undefined ?
				true : process.env.AKSO_DISABLE_LOGIN_NOTIFS == '0',
			openExchangeRatesAppID: process.env.AKSO_OPEN_EXCHANGE_RATES_APP_ID,
		},

		// Constants, do not change without updating docs
		CORS_ORIGIN_WHITELIST: [
			/^(.+\.)?akso\.org$/,
			'tejo.org',
			'uea.org'
		],
		CORS_ALLOWED_HEADERS: [
			'X-CSRF-Token',
			'X-Http-Method-Override',
			'Content-Type',
			'If-None-Match',
			'Cache-Control'
		],
		CORS_EXPOSED_HEADERS: [
			'X-Response-Time',
			'X-Total-Items',
			'X-Total-Items-No-Filter',
			'X-Affected-Items',
			'X-RateLimit-Limit',
			'X-RateLimit-Remaining',
			'X-Identifier',
			'Retry-After',
			'Content-Type',
			'Location'
		],
		RATE_LIMIT_WINDOW_MS: 3*60*1000, // 3 minutes
		RATE_LIMIT_MAX: 300, // 300 requests per window ms max
		
		SLOW_DOWN_WINDOW_MS: 1*60*1000, // 1 minute
		SLOW_DOWN_DELAY_AFTER: 5, // allow 5 requests per window ms, then ...
		SLOW_DOWN_DELAY_MS: 500, // add a n*500ms delay for each n'th request past `delay after`
		SLOW_DOWN_MAX_DELAY_MS: 2000, // maximum delay per request
		TOTP_REMEMBER_LIFE: 5184000, // 60 days

		CREATE_PASSWORD_FREQ: 3*60*60, // 3 hours
		PASSWORD_BCRYPT_SALT_ROUNDS: 12,

		LOG_DELETION_TIME: 5184000, // 60 days
		CODEHOLDER_HIST_DELETION_TIME: 5184000, // 60 days

		CODEHOLDER_OWN_CHANGE_CMT: 'Memfarita ŝanĝo',
		CODEHOLDER_OWN_CHANGE_APPROVED_CMT: async authClient => {
			if (authClient.isUser()) {
				return `Memfarita ŝanĝo, aprobita de administranto ${await authClient.getNewCode()} (${authClient.user})`;
			} else {
				return `Memfarita ŝanĝo, aprobita de aplikaĵo ${authClient.modBy}`;
			}
		},
		CODEHOLDER_CREATED_BY_REGISTRATION: (date, registrationEntryId) => `Kreita je ${date} okaze de aŭtomata aliĝo n-ro ${registrationEntryId}.`,

		// https://github.com/timshadel/subdivision-list
		SUBDIVISIONS: require('../data/subdivisions.json'),

		EXCHANGE_RATES_LIFETIME: 3600 * 2 // 2 hours. The Open Exchange Rates API supports 1000 requests/month on the free plan. That's slightly more than once an hour
	};

	if (cluster.isMaster) {
		AKSO.log.info('AKSO API version %s', AKSO.version);
		AKSO.log.warn('Running in mode: %s', AKSO.conf.prodMode);
	}

	// Determine defaults when needed
	if (AKSO.conf.http.outsideAddress) {
		if (AKSO.conf.http.outsideAddress[AKSO.conf.http.outsideAddress.length - 1] !== '/') {
			AKSO.conf.http.outsideAddress += '/';
		}
	} else {
		if (cluster.isMaster) {
			AKSO.log.warn('AKSO_HTTP_OUTSIDE_ADDRESS not specified, determining IP address ...');
		}
		let ip;
		try {
			ip = await Promise.any([
				(async () => { return await (await fetch('https://api64.ipify.org')).text(); })(),
				(async () => { return await (await fetch('https://myexternalip.com/raw')).text(); })()
			]);
		} catch (e) {
			AKSO.log.error('Failed to determine ip address, throwing stack:');
			throw e;
		}
		const url = new URL(`http://${ip}:${AKSO.conf.http.port}`);
		AKSO.conf.http.outsideAddress = url.toString();
		if (cluster.isMaster) {
			AKSO.log.warn('Using address ' + AKSO.conf.http.outsideAddress);
		}
	}

	if (cluster.isMaster) {
		// Complain about missing/invalid env vars
		if (!Number.isSafeInteger(AKSO.conf.http.threads) || AKSO.conf.http.threads > 32 || AKSO.conf.http.threads < 1) {
			AKSO.log.error('AKSO_HTTP_THREADS must be an integer in the range 1-32');
			process.exit(1);
		}
		if (!AKSO.conf.rabbitmq) {
			AKSO.log.error('Missing AKSO_RABBITMQ');
			process.exit(1);
		}
		// if (!AKSO.conf.s3.bucket) {
		// 	AKSO.log.error('Missing AKSO_S3_BUCKET');
		// 	process.exit(1);
		// }
		// if (!AKSO.conf.s3.endpoint) {
		// 	AKSO.log.error('Missing AKSO_S3_ENDPOINT');
		// 	process.exit(1);
		// }
		// if (!AKSO.conf.s3.accessKeyId) {
		// 	AKSO.log.error('Missing AKSO_S3_ACCESS_KEY_ID');
		// 	process.exit(1);
		// }
		// if (!AKSO.conf.s3.secretAccessKey) {
		// 	AKSO.log.error('Missing AKSO_S3_SECRET_ACCESS_KEY');
		// 	process.exit(1);
		// }
		// if (!AKSO.conf.s3.region) {
		// 	AKSO.log.error('Missing AKSO_S3_REGION');
		// 	process.exit(1);
		// }
		if (!AKSO.conf.http.sessionSecret) {
			AKSO.log.error('Missing AKSO_HTTP_SESSION_SECRET');
			process.exit(1);
		}
		if (!AKSO.conf.telegram.token) {
			AKSO.log.error('Missing AKSO_TELEGRAM_TOKEN');
			process.exit(1);
		}
		if (AKSO.conf.totpAESKey.length != 32) {
			AKSO.log.error('AKSO_TOTP_AES_KEY must be 32 bytes encoded in hex');
			process.exit(1);
		}
		if (!AKSO.conf.stateDir) {
			AKSO.log.error('Missing AKSO_STATE_DIR');
			process.exit(1);
		} else if (!fs.statSync(AKSO.conf.stateDir).isDirectory()) {
			AKSO.log.error('AKSO_STATE_DIR must be a directory');
			process.exit(1);
		}
		if (!AKSO.conf.openExchangeRatesAppID) {
			AKSO.log.error('Missing AKSO_OPEN_EXCHANGE_RATES_APP_ID');
			process.exit(1);
		}
	}

	// Init
	moment.locale('eo');
	moment.tz.setDefault('UTC');

	// Warn about used values
	if (cluster.isMaster) {
		if (!AKSO.conf.loginNotifsEnabled) {
			AKSO.log.warn('Login notifications disabled');
		}

		// http
		if (AKSO.conf.http.trustProxy) {
			AKSO.log.warn('Trusting proxy: ' + AKSO.conf.http.trustProxy);
		}
		if (!AKSO.conf.http.corsCheck) {
			AKSO.log.warn('Running without CORS check');
		}
		if (!AKSO.conf.http.helmet) {
			AKSO.log.warn('Running without helmet');
		}
		if (!AKSO.conf.http.csrfCheck) {
			AKSO.log.warn('CSRF check disabled');
		}
		if (!AKSO.conf.http.rateLimit) {
			AKSO.log.warn('Running without rate limit');
		}

		// stripe
		// if (AKSO.conf.stripe.deleteWebhooks) {
		// 	AKSO.log.warn('Stripe webhooks are deleted upon shutdown');
		// }

		// s3
		// validate connection
		// AKSO.log.info('Validating connection to S3 ...');
		// await require('./lib/s3').validateConnection();
	}

	// Load shared modules
	await AKSODb.init();

	const handleWorkerMessage = function handleMessage (msg) {
		if (typeof msg !== 'object') { return; }
		if (msg.action === 'set') {
			AKSO[msg.prop] = msg.value;
		} else if (msg.action === 'set_exchange_rates') {
			AKSO.exchangeRates = msg.data;
			AKSO.cashify = new Cashify(msg.data);
		} else if (msg.action === 'set_telegraf_userinfo') {
			AKSO.telegrafBotUser = msg.data;
		}
	};
	if (cluster.isMaster) {
		// Make sure the MySQL event scheduler is running
		const eventSchedulerRunning = await AKSO.db.raw('SELECT @@global.event_scheduler = "ON" AS running')
			.then(res => !!res[0][0].running);
		if (!eventSchedulerRunning) {
			AKSO.log.warn('The MySQL event scheduler is turned off!');
		}


		// Set up cluster
		let shuttingDown = false;
		const workers = {};
		const workerPromises = {};
		let workersReadyResolve;
		const workersReadyPromise = new Promise(resolve => { workersReadyResolve = resolve; });

		const summonWorker = function (type, num = 1) {
			const worker = cluster.fork({ aksoClusterType: type, aksoClusterNum: num });
			const id = `${type}-${num}`;
			workers[id] = worker;
			workerPromises[id] = new Promise(resolve => {
				// Await ready
				worker.on('message', async msg => {
					if (msg === 'ready') { return resolve(); }
					else if (typeof msg === 'object' && msg.forward === true) {
						delete msg.forward;
						await workersReadyPromise;
						for (const otherWorker of Object.values(workers)) {
							otherWorker.send(msg);
						}
						handleWorkerMessage(msg);
					} else {
						handleWorkerMessage(msg);
					}
				});
			});
			// Cope with death
			worker.on('exit', code => {
				if (shuttingDown) { return; }
				if (code !== 0) {
					AKSO.log.error(`${type} worker #${num} died with non-zero exit code ${code}, killing AKSO`);
					process.exit(code);
				}
				AKSO.log.info(`${type} worker #${num} died for an unknown reason, cloning its DNA ...`);
				delete workers[id];
				summonWorker(type);
			});
		};

		summonWorker('mail');
		summonWorker('telegram');
		summonWorker('labels');
		summonWorker('timers');
		for (let i = 1; i <= AKSO.conf.http.threads; i++) {
			summonWorker('http', i);
		}

		// Handle shutdown signal
		const performCleanup = async function performCleanup (signal) {
			if (shuttingDown) { return; }
			shuttingDown = true;

			AKSO.log.info(`Received ${signal}, shutting down ...`);

			process.exit();
		};

		const shutdownTriggers = [ 'exit', 'SIGINT', 'SIGHUP', 'SIGTERM' ];
		for (let trigger of shutdownTriggers) {
			process.on(trigger, () => { performCleanup(trigger); });
		}

		AKSO.log.info('AKSO master is ready (workers still loading)');

		await Promise.all(Object.values(workerPromises));
		workersReadyResolve();
		setTimeout(function () {
			AKSO.log.info('All workers are ready');
		}, 100); // We do this on a timeout to let the last worker log first
	} else {
		switch (process.env.aksoClusterType) {
		case 'http':
			const AKSOHttp = require('./workers/http');
			await AKSOHttp.init();
			break;
		case 'mail':
			const AKSOMail = require('./workers/mail');
			await AKSOMail.init();
			break;
		case 'telegram':
			const AKSOTelegram = require('./workers/telegram');
			await AKSOTelegram.init();
			break;
		case 'labels':
			const AKSOLabels = require('./workers/labels');
			await AKSOLabels.init();
			break;
		case 'timers':
			const AKSOTimers = require('./workers/timers');
			await AKSOTimers.init();
			break;
		default:
			AKSO.log.error(`Unknown cluster type ${process.env.aksoClusterType}, exiting`);
			process.exit(1);
		}

		process.on('message', handleWorkerMessage);

		if (!cluster.isMaster) {
			process.send('ready');
			AKSO.log.info(`${process.env.aksoClusterType} worker #${process.env.aksoClusterNum} is ready`);
		}
	}
}

init().catch(err => {
	console.log(err); // eslint-disable-line no-console
	process.exit(1);
});
