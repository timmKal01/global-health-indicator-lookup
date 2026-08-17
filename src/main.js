import { Actor, log } from 'apify';
import { fetchIndicator } from './who.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { countries, indicatorCode, mostRecentYears = 5 } = input;

if (!Array.isArray(countries) || countries.length === 0) {
    throw new Error('Input "countries" must be a non-empty array, e.g. ["USA", "GBR"].');
}
if (!indicatorCode) {
    throw new Error('Input "indicatorCode" is required, e.g. "WHOSIS_000001".');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const INDICATOR_LOOKUP_EVENT = 'indicator-lookup';

const results = await fetchIndicator({
    countries,
    indicatorCode,
    mostRecentYears: Math.min(mostRecentYears, 20),
});

for (const result of results) {
    await Actor.pushData(result);
}

await Actor.charge({ eventName: INDICATOR_LOOKUP_EVENT });

log.info(`Pushed ${results.length} value(s)`);

await Actor.exit();
