#!/usr/bin/env python3
import argparse

from analyzer.learning import *
from analyzer.monitor import start_monitor
from analyzer.notifier import *
from analyzer.persistence import data_import, data_export
from analyzer.sniffer import Sniffer
from analyzer.visualizer import *

logging.basicConfig(format=f"{magenta('%(asctime)s')} %(message)s")
logger = logging.getLogger()
logger.setLevel(logging.INFO)


async def create_sniffer(args):
    sniffer = Sniffer(args.interface, args.ip, args.ports.split(','))
    await sniffer.start()
    return sniffer


def asyncio_run(function):
    try:
        loop = asyncio.SelectorEventLoop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(function())
    except KeyboardInterrupt:
        logger.info("shutting down.")


async def start_notifier(sniffer, notifier):
    def update(notification):
        if notification['exit']:
            packets, loads = sniffer.collect_batch()
            if args.dump is not None:
                data_export(loads, packets, args.dump)
        else:
            label = notification['message']
            sniffer.update_label(label)
            logger.info(f"sniffer collecting for '{label}' ..")

    notifier.listen(update)
    await notifier.start()


def list_interfaces(args):
    interfaces = '\n\t'.join(list(map(lambda i: f"- '{cyan(i)}'", Sniffer.interfaces())))
    logger.info(f"available interfaces\n\t{interfaces}")


def assert_sniffable():
    if args.interface not in Sniffer.interfaces():
        logger.info("given interface not available, list available with --eth.")
        return False
    else:
        return True


def sniff(args):
    if assert_sniffable():
        async def start():
            notifier = Notifier(9555)
            sniffer = await create_sniffer(args)
            await start_notifier(sniffer, notifier)
            asyncio.get_event_loop().create_task(sniffer.stats())
            while True:
                await asyncio.sleep(1)

        asyncio_run(start)


def monitor(args):
    if assert_sniffable():
        async def start():
            sniffer = await create_sniffer(args)
            notifier = Notifier(9555, publish=args.publish)
            await notifier.start()
            await start_monitor(sniffer, notifier, args.model, timeout=args.timeout)
            while True:
                await asyncio.sleep(1)

        asyncio_run(start)


def learn(args):
    loads, packets = data_import(args.set)
    feats = [args.feats.split(',')] if args.feats else None
    build_model(loads, args.alg, feats, args.set)


def plot(args):
    loads, packets = data_import(args.set)
    plot_all(loads, packets, args.set)


parser = argparse.ArgumentParser(description='')
subparsers = parser.add_subparsers(help="",
                                   title=green('Traffic analyzer'),
                                   description="Available commands")

list_parser = subparsers.add_parser('list', help="lists the available interfaces")
list_parser.set_defaults(func=list_interfaces)

sniff_parser = subparsers.add_parser('sniff', help="capture network data to create data sets.")
sniff_parser.add_argument('interface', help='interface to listen on.', metavar='ETH')
sniff_parser.add_argument('--ip', help='host to capture traffic from/to.', metavar='ADDR', nargs='?', const=1,
                          default='127.0.0.1')
sniff_parser.add_argument('--ports', help='ports to capture traffic on.', nargs='?', const=1, default='80,443')
sniff_parser.add_argument('--dump', help='dump all data under the given ./data dir.', nargs='?', const='daytime',
                          default=None)
sniff_parser.set_defaults(func=sniff)

plot_parser = subparsers.add_parser('plot', help="create plots of the given data set.")
plot_parser.add_argument('set', help='the data set to use for plotting.', metavar='SET')
plot_parser.set_defaults(func=plot)

learn_parser = subparsers.add_parser('learn', help="train a new model using the given data set.")
learn_parser.add_argument('set', help='the data set to use for training.', metavar='SET')
learn_parser.add_argument('--alg', help='algorithm to use, rf or knn.', nargs='?', const=1, default='knn')
learn_parser.add_argument('--feats', help='feature combination, discovers best if unset.', metavar='NAME')
learn_parser.set_defaults(func=learn)

monitor_parser = subparsers.add_parser('monitor', help="monitor traffic using the given model.")
monitor_parser.add_argument('interface', help='interface to listen on.', metavar='ETH')
monitor_parser.add_argument('model', help='the learning model to use for classification.', metavar='MODEL')
monitor_parser.add_argument('--ip', help='host to capture traffic from/to.', metavar='ADDR', default='127.0.0.1')
monitor_parser.add_argument('--ports', help='ports to capture traffic on.', nargs='?', const=1, default='80,443')
monitor_parser.add_argument('--timeout', help='quiet period before a request ends.', nargs='?', const=1, default=0.5,
                            type=float)
monitor_parser.add_argument('--publish', help='ip address to publish identified pages.', default='127.0.0.1')
monitor_parser.set_defaults(func=monitor)

args = parser.parse_args()

if 'func' in args:
    args.func(args)
else:
    parser.print_help()
