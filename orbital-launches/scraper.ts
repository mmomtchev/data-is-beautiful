import * as cheerio from 'cheerio';
import * as DOM from 'domhandler';
import { Queue } from 'async-await-queue';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Launch } from './shared';

// The data structures
const launch = [] as Launch[];

// Start by getting the launch sites
fetch('https://spacestatsonline.com/launchsites/')
  .then((r) => r.text())
  .then((r) => {
    // Load the HTML into cheerio
    const $ = cheerio.load(r);

    // Look for tables, get the rows
    const tableRows = $('table.table-striped.table-hover').children('tbody').children('tr');
    for (const row of tableRows) {
      // We are interested in the rows that have exactly 5 <td> or <th> children
      if (row.children.length === 5 &&
        row.children.every((node) => DOM.isTag(node) && (node.name === 'td' || node.name === 'th'))) {
        // Get the first child of each <td>
        const dataNodes = (row.children as cheerio.Element[]).map((node) => node.children[0]);
        // Extract the text
        const data = dataNodes.map((node) => {
          if (!node) return '';
          if (DOM.isText(node)) return node.data;
          // Some info is hidden behind a link
          if (DOM.isTag(node) && node.name === 'a')
            if (node.children[0] && DOM.isText(node.children[0]))
              return node.children[0].data;
          throw new Error('Invalid table cell');
        });
        launchSite.push({
          name: data[0],
          launches: +data[1],
          country: data[2],
          first: new Date(data[3]),
          last: new Date(data[4])
        });
      }
    }
  })
  .then(() => {
    // We are a well-behaved scraper that launches no more than 5 requests in parallel
    // and no more than 10 requests/second (100ms interval)
    const queue = new Queue<void>(5, 100);

    const requests = [] as Promise<void>[];
    const currentYear = new Date().getFullYear();
    // Loop over all years from 1957 to today
    for (let year = 1957; year <= currentYear; year++) {
      // We use the queue to schedule and we store all requests (Promises) in an array
      requests.push(queue.run(() =>
        // This is the per-year URL
        fetch(`https://spacestatsonline.com/launches/year/${year}`)
          .then((r) => r.text())
          .then((r) => {
            // Load the HTML into cheerio
            const $ = cheerio.load(r);

            // Look for tables, get the rows
            const tableRows = $('table.table-striped.table-hover').children('tbody').children('tr');
            for (const row of tableRows) {

              // We are interested in the rows that have exactly 5 <td> children
              if (row.children.length === 5 &&
                row.children.every((node) => DOM.isTag(node) && node.name === 'td')) {

                // Get the first child of each <td>
                const dataNodes = (row.children as cheerio.Element[]).map((node) => node.children[0]);
                // Extract the text
                const data = dataNodes.map((node) => {
                  if (!node) return '';
                  if (!DOM.isText(node)) throw new Error('Invalid table cell');
                  return node.data;
                });
                const country = launchSite.find((site) => site.name === data[1])?.country;
                if (!country) throw new Error('Invalid launch site');
                launch.push({
                  date: new Date(data[0]),
                  country,
                  site: data[1],
                  rocket: data[2],
                  payload: data[3],
                  outcome: data[4] as typeof launch[0]['outcome']
                });
              }
            }
          })
          .then(() => {
            console.log(`Year ${year} processed`);
          })
      ));
    }

    // We wait for all the requests to finish
    return Promise.all(requests);
  })
  .then(() => {
    // Write the resulting JSON
    return [
      fs.promises.writeFile(path.resolve(__dirname, 'data', 'sites.json'), JSON.stringify(launchSite), 'utf-8'),
      fs.promises.writeFile(path.resolve(__dirname, 'data', 'launches.json'), JSON.stringify(launch), 'utf-8'),
    ];
  })
  .then(() => {
    console.log(`Done, ${launchSite.length} sites, ${launch.length} launches`);
  });
