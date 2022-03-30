#!/usr/bin/node
import 'argparse';
import fs from 'fs';

import {Logger} from './util/logger.js';
import {Ansi} from './util/ansi.js';
import {ArgumentParser} from "argparse";
import {Generator} from "./browser/generator.js";
import {serve} from "./browser/server.js";
import {rip} from "./browser/ripper.js";

const SITE_LOCATION = './browser/sites/'
const version = JSON.parse(
    fs.readFileSync('./package.json', 'utf8')
)['version'];

const parser = new ArgumentParser({
    description: Ansi.green('Dataset generator and real-time monitoring of analyzer.'),
    add_help: true
})

parser.add_argument('-v', '--version', {action: 'version', version, 'help': ''});

let monitoring = parser.add_argument_group(Ansi.magenta('Monitor and replay network traffic in real time using the analyzer'));
monitoring.add_argument('--monitor', {action: 'store_true', help: 'monitor replay, requires a running analyzer.'});

let generator = parser.add_argument_group(Ansi.magenta('Generate web traffic for the analyzers sniffer module'))
generator.add_argument('--generate', {action: 'store_true', help: 'generate data, requires a running analyzer.'});
generator.add_argument('-l', '--list', {action: 'store_true', help: 'list available sites.'});
generator.add_argument('-s', '--site', {help: `select sites to requests, separated by comma.`, metavar: 'NAME'});
generator.add_argument('-b', '--bus', {help: 'location for the message bus dir.', default: '../bus/', metavar: 'DIR'});
generator.add_argument('-c', '--count', {help: 'number of page loads to generate.', default: 10, metavar: 'NUM'});
generator.add_argument('-d', '--delay', {help: 'pause between page loads', default: 3, metavar: 'SEC'});

let server = parser.add_argument_group(Ansi.magenta('Serve static websites that the generator can target'))
server.add_argument('--web', {
    help: 'bind webserver to given hostname.',
    const: 'localhost',
    metavar: 'BIND',
    nargs: '?'
});
server.add_argument('-p', '--port', {help: 'port to run the webserver to.', default: 9000});
server.add_argument('-r', '--res', {
    help: 'directory to serve resources from.',
    default: './browser/sites/web',
    metavar: 'DIR'
});

let forgery = parser.add_argument_group(Ansi.magenta('Create a static copy of a remote website for the webserver'))
forgery.add_argument('--forge', {help: 'create a mock clone of the given site.', metavar: 'URL'});
forgery.add_argument('-o', '--out', {help: 'name of web folder to store site in.', metavar: 'NAME'});

let args = parser.parse_args();
let actions = [args.list, args.monitor, args.generate, args.web, args.forge].filter(item => item)

async function generate(sites, count, delay, cache) {
    Logger.info(`generating data for ${Ansi.cyan(sites.length)} site(s).`);
    let generator = new Generator(count, delay, cache);
    for (let site of sites) {
        await generator.generate((await import(`${SITE_LOCATION}${site}.js`)).default);
    }
    await generator.close();
}

function list() {
    Logger.info(`Following sites are available\n\t[${fs.readdirSync(SITE_LOCATION)
        .map(site => site.replace('.js', ''))
        .map(site => Ansi.cyan(site))
    }]`);
}

function monitor() {
    Logger.error('monitor mode is not implemented.');
}

async function parse(args) {
    if (actions.length === 0) {
        Logger.info('no actions specified, try -h for help.')
    } else if (actions.length > 1) {
        Logger.error('please specify a single action.')
    } else {
        if (args.generate) {
            if (args.site) {
                let sites = args.site.split(',')
                    .filter(site => site.match(/[a-z]/mg));

                generate(sites, args.requests, args.delay, args.cache);
            } else {
                Logger.error('specify site to run generation for.');
            }
        }
        if (args.web) {
            await serve(args.web, args.port, args.res)
        }
        if (args.list) list();
        if (args.monitor) monitor()
        if (args.forge) {
            await rip(args.forge, args.out);
        }
    }
}

parse(args);