const BASE_URL = 'https://ghoapi.azureedge.net/api';
const REQUEST_TIMEOUT_MS = 30_000;

/** The WHO GHO OData API is occasionally slow or 429s/5xxs under load — retry with backoff
 *  rather than ever treating a throttle or timeout as "no data." */
async function fetchWithRetry(url, { retries = 4, baseDelayMs = 1500 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const res = await fetch(url, { headers: { Connection: 'close' }, signal: controller.signal });
            if (res.status === 404) return res; // unknown indicator — not retryable, caller handles it
            if (res.ok) return res;
            if (![429, 500, 502, 503, 504].includes(res.status)) {
                throw new Error(`WHO GHO API request failed: ${res.status} ${res.statusText}`);
            }
            lastErr = new Error(`WHO GHO API returned ${res.status}`);
        } catch (err) {
            lastErr = err.name === 'AbortError' ? new Error('WHO GHO API request timed out') : err;
        } finally {
            clearTimeout(timeout);
        }
        if (attempt < retries) {
            await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
        }
    }
    throw lastErr;
}

export async function fetchIndicator({ countries, indicatorCode, mostRecentYears }) {
    const codes = countries.map((c) => c.trim().toUpperCase());
    const countryList = codes.map((c) => `'${c}'`).join(',');
    const filter = `SpatialDim in (${countryList})`;

    const url = new URL(`${BASE_URL}/${encodeURIComponent(indicatorCode)}`);
    url.searchParams.set('$filter', filter);
    url.searchParams.set('$orderby', 'TimeDim desc');
    // Generous page size: indicators can have several rows per country-year (sex/age
    // breakdowns), so this needs headroom beyond countries.length * mostRecentYears.
    // 1000 is the API's own hard cap ($top above that 400s with a clear error).
    url.searchParams.set('$top', '1000');

    const res = await fetchWithRetry(url);
    if (res.status === 404) {
        throw new Error(`Indicator "${indicatorCode}" was not found in the WHO GHO catalog.`);
    }
    const body = await res.json();
    const rows = body.value ?? [];

    // Keep all dimension breakdowns (sex/age/etc) for each of the N most recent distinct years
    // per country, rather than a flat row count — an indicator with e.g. 3 sex categories
    // shouldn't get cut off after one year's worth of rows.
    const yearsSeenPerCountry = {};
    const results = [];
    for (const row of rows) {
        try {
            if (row.NumericValue === null && row.Value === null) continue;
            const country = row.SpatialDim;
            const years = (yearsSeenPerCountry[country] ??= new Set());
            if (!years.has(row.TimeDim)) {
                if (years.size >= mostRecentYears) continue;
                years.add(row.TimeDim);
            }

            results.push({
                countryCode: country,
                indicatorCode: row.IndicatorCode,
                year: row.TimeDim,
                value: row.NumericValue,
                displayValue: row.Value,
                dimension1: row.Dim1 ?? null,
                dimension1Type: row.Dim1Type ?? null,
                dimension2: row.Dim2 ?? null,
                dimension2Type: row.Dim2Type ?? null,
            });
        } catch (err) {
            // Skip a malformed row rather than losing the whole indicator lookup.
        }
    }
    return results;
}
