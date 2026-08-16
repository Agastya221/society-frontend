/**
 * Logger barrel export.
 *
 * Usage from anywhere in the app:
 *
 *   import { configureApiLogger, enableApiLogs, disableApiLogs, setErrorsOnly } from '../logger';
 *
 *   // Show only errors:
 *   setErrorsOnly(true);
 *
 *   // Filter to specific endpoints:
 *   configureApiLogger({ filterEndpoints: ['/community/notices'] });
 *
 *   // Turn off all API logs:
 *   disableApiLogs();
 */

export {
    logApiRequest,
    logApiResponse,
    logApiError,
    configureApiLogger,
    enableApiLogs,
    disableApiLogs,
    setErrorsOnly,
} from './apiLogger';
