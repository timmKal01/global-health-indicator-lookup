const BASE_URL = 'https://ghoapi.azureedge.net/api';

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

    const res = await fetch(url, { headers: { Connection: 'close' } });
    if (res.status === 404) {
        throw new Error(`Indicator "${indicatorCode}" was not found in the WHO GHO catalog.`);
    }
    if (!res.ok) {
        throw new Error(`WHO GHO API request failed: ${res.status} ${res.statusText}`);
    }
    const body = await res.json();
    const rows = body.value ?? [];

    // Keep all dimension breakdowns (sex/age/etc) for each of the N most recent distinct years
    // per country, rather than a flat row count — an indicator with e.g. 3 sex categories
    // shouldn't get cut off after one year's worth of rows.
    const yearsSeenPerCountry = {};
    const results = [];
    for (const row of rows) {
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
    }
    return results;
}
