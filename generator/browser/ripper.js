import * as fs from 'fs/promises';
import {performance} from 'perf_hooks';
import process from 'process';

import {Browser} from './browser.js'
import {Ansi} from "../util/ansi.js";
import {Logger} from "../util/logger.js";
import crypto from 'crypto';
import {Progress} from "../util/progress.js";

let key_404 = crypto.randomUUID();
let browser = null;

/**
 * Performs a 1:1 copy of the given site, as closely as possible. This is done
 * using browser automation, to simulate a page load and download all linked resources.
 * @param url for the page to download.
 * @param out the path to write the files to.
 * @param depth number of links to follow, 1 follows the given link only.
 * @param missing if true attempt to trigger the 404 page of the server.
 * @param favicon is not loaded in headless mode by pptr, enable to explicitly request it.
 * @returns {Promise<void>}
 */
export async function rip(url, out, depth = 1, missing = false, favicon = false) {
    if (validate(depth)) {
        out = (out ?? generate_out(url));
        Logger.info(`ripping site ${Ansi.cyan(url)} into '${Ansi.cyan(out)}'.`);
        Logger.info(`generate 404 ${(missing) ? Ansi.green("enabled") : Ansi.red('disabled')}.`);
        Logger.info(`explicit favicon ${(favicon) ? Ansi.green("enabled") : Ansi.red('disabled')}.`);

        let progress = create_progress();
        let files = await download_recursive(url, depth, missing, progress, favicon);
        await write(files, out, progress);
        progress.end();

        Logger.info(`downloaded ${Ansi.green(files.length)} files in ${Ansi.red(progress.elapsed().toFixed(0))}${Ansi.yellow('ms')}.`);
    }
}

function validate(depth) {
    if (depth < 1) {
        Logger.info(`minimum links to follow is ${Ansi.red(1)}.`);
        return false;
    } else if (depth > 2) {
        Logger.warning(`using a depth greater than ${Ansi.red(2)} generates ${Ansi.yellow('a lot of traffic')}.`);
    }
    Logger.info(`using link depth ${Ansi.cyan(depth)}.`);
    return true;
}

function generate_out(url) {
    return `./browser/ripped/${extract_domain(url)}`;
}

function extract_domain(url) {
    return /(https?:\/\/)(.+?)(\/+|$)/.exec(url)[2].replace(':', '_')
}

async function download_recursive(url, depth, missing, progress, favicon) {
    let files = [], errors = [];
    let files_loaded = new Set();
    let visited = new Set(['/']);
    progress.action('downloading');

    for (let level = 0; level < depth; level++) {
        let downloads = [], batch = [];
        progress.level();

        // retrieve all links from loaded text/html files.
        for (let link of map_links_from_files(files, depth, missing, favicon)) {
            if (!visited.has(link)) {
                // if not already visited, visit the link and download files.
                downloads.push(download(`${url}${link}`, progress));
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
        }).catch(e => {
            Logger.error(e);
        });
        // process the batch of files at this link level to extract links etc.
        files.push(...await transform(batch, url));

        if (errors.length > 0) {
            progress.end();
            show_errors(errors);
            Logger.warning(`errors found, stopping recursion at level ${Ansi.red(level + 1 + '/' + depth)}.`);
            break;
        }
    }
    browser.then((instance) => instance.close());
    return files;
}

function map_links_from_files(files, depth, missing, favicon) {
    let links = new Set(files.map(file => file?.links ?? []).flat());
    links.add(''); // this represents the given root.
    if (missing) {
        // generate a page load for a missing resource/link to use as server fallback.
        links.add(key_404);
    }
    if (favicon) {
        links.add('favicon.ico')
    }
    return links;
}

function shortName(url) {
    return '../' + url.split('/').slice(-1).pop().substring(0, 64)
}

async function transform(files, url) {
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

        if (file.root === file.url && file.type === 'text/html') {
            // map the document loaded at the root to index.html.
            file.path += '/index.html';
        }
    }
    return files;
}

async function write(files, out, progress) {
    progress.action('writing', files.length);
    for (let file of files) {
        let outfile = `${out}${file.path}`.replace(key_404, '404');
        try {
            // create the path then write the file.
            await fs.mkdir(outfile.substring(0, outfile.lastIndexOf('/')), {recursive: true});
            await fs.writeFile(outfile, file.data);
        } catch (e) {
            delete file.data;
            file.outfile = outfile;
            Logger.error(JSON.stringify(file, null, 4));
        } finally {
            progress.next(file.path.slice(-64));
        }
    }
}

async function download(url, progress) {
    let page = await open_page();
    let errors = [];
    let files = [];

    page.on('request', async () => progress.extend());
    page.on('response', async (response) => {
        let request = response.request();

        if (request.redirectChain().length > 0 && request.url() === url) {
            errors.push({
                e: new Error(`${Ansi.yellow(request.url())} was ${Ansi.red('redirected')}, body inaccessible.`),
                method: request.method(),
                url : url
            });
        }

        if (!request.url().startsWith('data:') && request.redirectChain().length === 0) {
            let type = response.headers()["content-type"];
            try {
                files.push({
                    'root': url,
                    'url': request.url().split('?')[0],
                    'type': type?.split(';')[0],
                    'data': (type?.includes('text')) ? await response.text() : await response.buffer()
                });
            } catch (e) {
                errors.push({e: e, url: shortName(request.url()), method: request.method()})
            } finally {
                progress.next(shortName(request.url()));
            }
        } else {
            progress.next(shortName(request.url()));
        }
    });
    await page.goto(url, {waitUntil: 'networkidle0'});
    await page.close();
    return {files: files, errors: errors};
}

async function open_page() {
    if (!browser) {
        // shared browser instance, avoid race.
        browser = Browser.start();
    }
    let instance = await browser;
    let page = await instance.newPage();
    await page.setUserAgent(Browser.ua());
    await page.setCacheEnabled(true);
    return page;
}

function show_errors(errors) {
    for (let error of errors) {
        Logger.warning(`${error.e.message} ${Ansi.cyan(error.method)} (${Ansi.yellow(error.url)})`)
    }
}

function create_progress() {
    let current = 0, max = 0, level = 0, file = '?', action = '?', start = performance.now();
    let progress = new Progress(() =>
        `${Progress.bar(current, max)} ${Ansi.yellow(Progress.percent(current, max))}%` +
        ` ${action} ${(action === 'downloading') ? `level=${Ansi.yellow(level)}` : ''} (${Ansi.yellow(file)})`);

    // contextual wrapper for the progress class.
    return ({
        action: (action_name, max_progress) => {
            progress.end();
            progress.begin();
            action = action_name;
            current = 0;
            max = max_progress ?? 0;
            progress.update();
        },
        level: () => {
            level++;
            progress.update();
        },
        extend: () => {
            max += 1;
            progress.update();
        },
        next: (file_name) => {
            file = file_name;
            current += 1;
            progress.update();
        },
        elapsed: () => {
            return performance.now() - start;
        },
        end: () => progress.end()
    });
}