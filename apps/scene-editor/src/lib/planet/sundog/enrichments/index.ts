import type { SystemEnrichment } from '../enrichmentTypes.js';
import { enlieEnrichment } from './enlie.js';
import { ferrEnrichment } from './ferr.js';
import { gloryEnrichment } from './glory.js';
import { hepaEnrichment } from './hepa.js';
import { jadulEnrichment } from './jadul.js';
import { jonddEnrichment } from './jondd.js';
import { kalmandaaEnrichment } from './kalmandaa.js';
import { lafserEnrichment } from './lafser.js';
import { newShootEnrichment } from './new-shoot.js';
import { shootEnrichment } from './shoot.js';
import { sosaiEnrichment } from './sosai.js';
import { woremedEnrichment } from './woremed.js';

export const ENRICHMENTS: Record<string, SystemEnrichment> = {
	jondd: jonddEnrichment,
	woremed: woremedEnrichment,
	'new-shoot': newShootEnrichment,
	lafser: lafserEnrichment,
	shoot: shootEnrichment,
	glory: gloryEnrichment,
	ferr: ferrEnrichment,
	kalmandaa: kalmandaaEnrichment,
	sosai: sosaiEnrichment,
	jadul: jadulEnrichment,
	enlie: enlieEnrichment,
	hepa: hepaEnrichment
};
