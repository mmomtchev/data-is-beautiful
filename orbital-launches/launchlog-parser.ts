import * as fs from 'node:fs';
import * as path from 'node:path';

import { Launch, countries } from './shared';

// The data structure
const launch = [] as Launch[];

fetch('http://www.planet4589.org/space/gcat/tsv/derived/launchlog.tsv')
  .then((data) => data.text())
  .then((data) => {
    // Split the input into lines
    const lines = data.split('\n');
    // Get the column names
    const fieldNames = lines[0].replace('#', '').split('\t');
    for (const line of lines) {
      // Ignore comments
      if (line.match(/^\s*#/)) continue;
      const row = {} as Record<string, any>;
      // Split lines into fields
      const fields = line.split('\t');
      if (fields.length < 2) continue;
      // Recreate the named fields data structure
      for (const field in fieldNames) {
        row[fieldNames[field]] = fields[field];
      }
      const id = row.Launch_Tag.trim();
      const c = countries[row.LVState].label as string|undefined;
      if (!c)
        throw new Error('Invalid state ' + row.LVState + ': ' + line);
      // Some launches carry multiple payloads, we pick only the first one
      if (!launch.find((l) => l.id === id)) {
        try {
          // Convert to our own format
          launch.push({
            date: row.Launch_Date.match(/[0-9]+\s+[A-Z][a-z]+\s+[0-9]+/)[0],
            id,
            site: row.Launch_Site,
            country: c,
            rocket: row.LV_Type,
            payload: row.PLName,
          });
        } catch (e) {
          throw new Error(e + ' while parsing ' + line);
        }
      }
    }
    fs.writeFileSync(path.resolve(__dirname, 'data', 'launches.json'), JSON.stringify(launch), 'utf-8');
  });
