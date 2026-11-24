import { createInterfaceApiRouter } from '../router.js';

/** Describes the Pointron REST API for `apifn generate`; the service builds its own with services. */
export const router = createInterfaceApiRouter('pointron');

export default router;
