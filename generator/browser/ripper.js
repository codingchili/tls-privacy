import * as fs from 'fs/promises';
import {performance} from 'perf_hooks';
import process from 'process';

import {Browser} from './browser.js'
import {Ansi} from "../util/ansi.js";
import {Logger} from "../util/logger.js";
import crypto from 'crypto';

let key_404 = crypto.randomUUID();
let browser = null;

export async function rip(url, out, depth = 1, inject = false, missing = false) {
    if (validate(depth)) {
        out = (out ?? generate_out(url));
        Logger.info(`ripping site ${Ansi.cyan(url)} into '${Ansi.cyan(out)}'.`);
        Logger.info(`injecting payload ${(inject) ? Ansi.green("enabled") : Ansi.red('disabled')}.`);
        Logger.info(`generating 404 ${(missing) ? Ansi.green("enabled") : Ansi.red('disabled')}.`);

        let start = performance.now();
        let files = await download_recursive(url, depth, inject, missing);
        await browser.close();
        await write(files, out);
        Logger.info(`downloaded ${Ansi.green(files.length)} files in ${Ansi.red((performance.now() - start).toFixed(0))}${Ansi.red('ms')}.`);
    }
}

function validate(depth) {
    if (depth < 1) {
        Logger.info(`minimum links to follow is ${Ansi.red(1)}`);
        return false;
    } else if (depth > 2) {
        Logger.warning(`using a depth greater than ${Ansi.red(2)} generates ${Ansi.yellow('a lot of traffic')}.`);
    }
    Logger.info(`using link depth ${Ansi.red(depth)}.`);
    return true;
}

function map_links_from_files(files, depth, missing) {
    let links = new Set(files.map(file => file?.links ?? []).flat());
    links.add('');
    if (missing) {
        // generate a page load for a missing resource/link to use as server fallback.
        links.add(key_404);
    }
    return links;
}

async function download_recursive(url, depth, inject, missing) {
    let files = [], errors = [];
    let files_loaded = new Set();
    let visited = new Set(['/']);

    for (let level = 0; level < depth; level++) {
        let downloads = [], batch = [];

        // retrieve all links from loaded text/html files.
        for (let link of map_links_from_files(files, depth, missing)) {
            if (!visited.has(link)) {
                // if not already visited, visit the link and download files.
                downloads.push(download(`${url}${link}`));
                visited.add(link);
            }
        }
        await Promise.all(downloads).then(values => {
            values.forEach(value => {
                // aggregate all errors on this link level.
                errors.push(...value.errors);
                value.files.forEach(file => {
                    if (!files_loaded.has(file.url)) {
                        // if the file has not already been loaded add it to the batch.
                        batch.push(file);
                        files_loaded.add(file.url);
                    }
                });
            })
        });
        // process the batch of files at this link level.
        files.push(...await transform(batch, url, inject));

        if (errors.length > 0) {
            show_errors(errors);
            Logger.warning(`errors found, stopping recursion at level ${Ansi.red(level + 1 + '/' + depth)}.`);
            break;
        }
    }
    return files;
}

function generate_out(url) {
    return `./browser/ripped/${extract_domain(url)}`;
}

function extract_domain(url) {
    return /(https?:\/\/)(.+?)(\/+|$)/.exec(url)[2].replace(':', '_')
}

function shortName(url) {
    return '../' + url.split('/').slice(-1).pop().substring(0, 64)
}

async function transform(files, url, inject) {
    let pattern = new RegExp(`(${url})|(https?:\/{2})|((?<=(src|href)=\")\/)`, 'mgi');
    let domain = extract_domain(url);

    for (let file of files) {
        if (['text/html', 'text/css'].includes(file.type)) {
            // rewrite all links in html/css files to absolute.
            file.data = file.data.replaceAll(pattern, '/');

            // extract links from html files that is possibly used for navigation.
            file.links = [...file.data.matchAll(/(?<=a href=")(.+?)(?=")/mgi)]
                .map(match => match[0])
                .filter(href => href.startsWith('/'));

            if (inject) {
                file.data = file.data.replace('</head>', `${inject}\n</head>`)
            }
        }
        // extract the domain of the file.
        file.domain = extract_domain(file.url);

        if (file.domain === domain) {
            // write to absolute path at root.
            file.path = file.url.replace(/(https?:\/\/.+?(\/|$))/gi, '/');
        } else {
            // write to absolute path at /<third-party.tld>/..
            file.path = file.url.replace(/(https?:\/\/)/gi, '/');
        }

        if (file.root === file.url) {
            // map the document loaded at the root to index.html.
            file.path += '/index.html';
        }
    }
    return files;
}

async function write(files, out) {
    for (let file of files) {
        let outfile = `${out}${file.path}`.replace(key_404, '404');
        try {
            await fs.mkdir(outfile.substring(0, outfile.lastIndexOf('/')), {recursive: true});
            await fs.writeFile(outfile, file.data);
        } catch (e) {
            Logger.error(`file=${file.path} domain=${file.domain} furl=${file.url}, outfile=${outfile}`);
        }
    }
}

async function open_page() {
    if (!browser) {
        browser = await Browser.start();
    }
    let page = await browser.newPage();
    await page.setCacheEnabled(true);
    return page;
}

async function download(url) {
    let page = await open_page();
    let errors = [];
    let files = [];

    page.on('request', async () => {
    });
    page.on('response', async (response) => {
        let request = response.request();

        if (request.redirectChain().length > 0 && request.url() === url) {
            Logger.error(`${Ansi.yellow(request.url())} responded with ${Ansi.red('redirect')}, unable to access body.`);
            Logger.info(`try prefixing/removing '${Ansi.yellow('www')}' to the domain.`);
            process.exit(1);
        }

        if (!request.url().startsWith('data:') && request.redirectChain().length === 0) {
            let type = response.headers()["content-type"];
            try {
                files.push({
                    // ensure url doesn't end with a slash - treated as file otherwise.
                    'root': url,
                    'url': request.url().split('?')[0],
                    'type': type?.split(';')[0],
                    'data': (type?.includes('text')) ? await response.text() : await response.buffer()
                });
            } catch (e) {
                errors.push({e: e, url: shortName(request.url()), method: request.method()})
            } finally {

            }
        }
    });
    await page.goto(url, {waitUntil: 'networkidle0'});
    await page.close();
    return {files: files, errors: errors};
}

function show_errors(errors) {
    for (let error of errors) {
        Logger.warning(`${error.e.message} ${Ansi.cyan(error.method)} (${Ansi.yellow(error.url)})`)
    }
}