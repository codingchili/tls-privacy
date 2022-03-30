import * as fs from 'fs/promises';
import {performance} from 'perf_hooks';
import process from 'process';

import {Browser} from './browser.js'
import {Progress} from "../util/progress.js";
import {Ansi} from "../util/ansi.js";
import {Logger} from "../util/logger.js";

// it's a hack get over it.
// todo follow all href's.

export async function rip(url, out) {
    out = out ?? generate_out(url);
    Logger.info(`ripping site ${Ansi.cyan(url)} into ${Ansi.cyan(out)}.`)

    let start = performance.now();
    let files = await download(url)
    let processed = await transform(files);
    await write(processed, out);

    Logger.info(`downloaded ${Ansi.green(files.length)} files in ${Ansi.red((performance.now() - start).toFixed(0))}${Ansi.red('ms')}.`);
}

function generate_out(url, out) {
    let domain = /(https?:\/\/)(.+?)(\/)/.exec(url)[2].replace(':', '_')
    return `./browser/sites/web/${domain}`;
}

function shortName(url) {
    return '../' + url.split('/').slice(-1).pop().substring(0, 64)
}

async function transform(files) {
    const domain = /(https?:\/\/.+?\/)/mgi;
    let current = 0, max = files.length, path = '?';
    let progress = new Progress(() =>
        `${Progress.bar(current, max)} processing [${Ansi.cyan(Progress.percent(current, max))}%] (${Ansi.yellow(path)})`)
        .begin();

    for (let file of files) {
        progress.update(() => path = shortName(file.url));

        if (['text/html', 'text/css'].includes(file.type)) {
            // remove all absolute urls.
            file.data = file.data.replaceAll(domain, '');
        }
        file.path = file.url.replace(domain, '/')

        if (file.path.endsWith('/')) {
            file.path += 'index.html';
        }
        progress.update(() => current++);
    }
    progress.update(() => path = 'done');
    progress.end();
    return files;
}

async function write(files, out) {
    let current = 0, max = files.length, path = '?';
    let progress = new Progress(() =>
        `${Progress.bar(current, max)} writing [${Ansi.cyan(Progress.percent(current, max))}%] (${Ansi.yellow(path)})`)
        .begin();

    for (let file of files) {
        let outfile = `${out}${file.path}`;
        await fs.mkdir(outfile.substring(0, outfile.lastIndexOf('/')), {recursive: true});
        await fs.writeFile(outfile, file.data);
        progress.update(() => {
            path = shortName(outfile);
            current++;
        });
    }
    progress.update(() => path = 'done');
    progress.end();
}

async function open_page() {
    let current = 0;
    let progress = new Progress(() =>
        `${Progress.bar(current)} initializing [${Ansi.cyan(Progress.percent(current))}%] ${current === 100 ? `(${Ansi.yellow('done')})` : ''}`)
        .begin();

    let proceed = (result, next) => {
        progress.update(() => current = next);
        return result;
    }

    let browser = proceed(await Browser.start(), 50);
    let page = proceed((await browser.pages())[0], 75);
    proceed(await page.setCacheEnabled(false), 100);
    progress.end();
    return page;
}

async function download(url) {
    let files = [], current = 0, max = 0, path = '?';
    let page = await open_page();
    let progress = new Progress(() =>
        `${Progress.bar(current, max)} receiving [${Ansi.cyan(Progress.percent(current, max))}%] (${Ansi.yellow(path)})`)
        .begin();

    page.on('request', async (request) => progress.update(() => {
        path = shortName(request.url());
        max += 1
    }));

    page.on('response', async (response) => {
        let request = response.request();

        if (request.redirectChain().length > 0 && request.url() === url) {
            progress.update(() => path = Ansi.red('failed'));
            progress.end();
            Logger.error(`${Ansi.yellow(request.url())} responded with ${Ansi.red('redirect')}, unable to access body.`);
            Logger.info(`this can in most cases be avoided by prefixing '${Ansi.yellow('www')}' to the domain.`);
            process.exit(1);
        }

        if (!request.url().startsWith('data:') && request.redirectChain().length === 0) {
            let type = response.headers()["content-type"];
            files.push({
                'url': request.url().split('?')[0],
                'type': type?.split(';')[0],
                'data': (type?.includes('text')) ? await response.text() : await response.buffer()
            });
            progress.update(() => current += 1);
        }
    });
    await page.goto(url, {waitUntil: 'networkidle0'});
    progress.update(() => {
        current = max
        path = 'done';
    });
    await page.close();
    await page.browser().close();
    progress.end();
    return files;
}