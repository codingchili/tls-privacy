#!/usr/bin/node
import 'argparse';
import fs from 'fs';

import {Logger} from './util/logger.js';
import {Ansi} from './util/ansi.js';
import {ArgumentParser} from "argparse";
import {Generator} from "./browser/generator.js";

const SITE_LOCATION = './browser/sites/'
const version = JSON.parse(
    fs.readFileSync('./package.json', 'utf8')
)['version'];

const parser = new ArgumentParser({
    description: 'Dataset generator and real-time monitoring of analyzer.',
    add_help: true
})

parser.add_argument('-v', '--version', {action: 'version', version, 'help': ''});
parser.add_argument('-g', '--generate', {
    action: 'store_true',
    'help': 'generate dataset, requires a running analyzer.'
});
parser.add_argument('-m', '--monitor', {action: 'store_true', 'help': 'monitor replay, requires a running analyzer.'});
parser.add_argument('-l', '--list', {action: 'store_true', help: 'list available sites.'});
parser.add_argument('-s', '--site', {help: 'select sites to generate requests, separated by comma.'});
parser.add_argument('-b', '--bus', {help: 'location for the message bus dir.', 'default': '../bus/'});
parser.add_argument('-r', '--requests', {help: 'number of page loads to generate.', 'default': 10});
parser.add_argument('-d', '--delay', {help: 'pause between page loads in seconds.', 'default': 3.0});
parser.add_argument('-c', '--cache', {action: 'store_true', help: 'enables the persistent cache.'});

let args = parser.parse_args();
let actions = [args.list, args.monitor, args.generate].filter(item => item)

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

function parse(args) {
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
        if (args.list) list();
        if (args.monitor) monitor()
    }
}

parse(args);