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


async def main(args, monitor):
    notifier = Notifier(9555)
    sniffer = Sniffer(args.interface, args.ip, args.ports.split(','))

    if monitor:
        await start_monitor(sniffer, notifier, args.monitor)
    else:
        await start_notifier(sniffer, notifier)

    await sniffer.start()
    await sniffer.stats()


def run_main(args, monitor=False):
    try:
        asyncio.run(main(args, monitor))
    except KeyboardInterrupt:
        logger.info("shutting down.")


async def start_notifier(sniffer, notifier):
    def update(notification):
        if notification['exit']:
            packets, loads = sniffer.collect_batch()
            if args.dump is not None:
                data_export(loads, packets, args.dump)
        else:
            sniffer.update_label(notification['message'])

    notifier.listen(update)
    await notifier.start()


def list_interfaces():
    interfaces = '\n\t'.join(list(map(lambda i: f"- '{cyan(i)}'", Sniffer.interfaces())))
    logger.info(f"available interfaces\n\t{interfaces}")


def sniff(args):
    if args.list:
        list_interfaces()

    if args.interface and args.interface not in Sniffer.interfaces():
        logger.info("given interface not available, list available with --eth.")
    elif args.interface:
        run_main(args)
    else:
        logger.warning('no interface specified, exiting.')


def monitor(args):
    if args.list:
        list_interfaces()
    run_main(args, monitor=True)


def learn(args):
    loads, packets = data_import(args.set)
    build_model(loads, args.alg, args.set)


def plot(args):
    loads, packets = data_import(args.set)
    plot_all(loads, packets, args.set)


parser = argparse.ArgumentParser(description='')
subparsers = parser.add_subparsers(help="",
                                   title=green('Traffic analyzer'),
                                   description="Available commands")

sniff_parser = subparsers.add_parser('sniff', help="capture network data to create data sets.")
sniff_parser.add_argument('--ip', help='host to capture traffic from/to.', nargs='?', const=1, default='127.0.0.1')
sniff_parser.add_argument('--ports', help='ports to capture traffic on.', nargs='?', const=1, default='80,443')
sniff_parser.add_argument('--interface', help='interface to listen on.', metavar='ETH')
sniff_parser.add_argument('--dump', help='dump all data under the given ./data dir.', nargs='?', const='daytime',
                          default=None)
sniff_parser.add_argument('--list', help='lists the available interfaces.', action='store_const', const=True)
sniff_parser.set_defaults(func=sniff)

plot_parser = subparsers.add_parser('plot', help="create plots of the given data set.")
plot_parser.add_argument('--set', help='the data set to use for plotting.')
plot_parser.set_defaults(func=plot)

learn_parser = subparsers.add_parser('learn', help="train a new model using the given data set.")
learn_parser.add_argument('--set', help='the data set to use for training.')
learn_parser.add_argument('--alg', help='algorithm to use, either rf or knn.', nargs='?', const=1, default='knn')
learn_parser.set_defaults(func=learn)

monitor_parser = subparsers.add_parser('monitor', help="monitor traffic using the given model.")
monitor_parser.add_argument('--ip', help='host to capture traffic from/to.')
monitor_parser.add_argument('--ports', help='ports to capture traffic on.', nargs='?', const=1, default='80,443')
monitor_parser.add_argument('--interface', help='interface to listen on.', metavar='ETH')
monitor_parser.add_argument('--list', help='lists the available interfaces.', action='store_const', const=True)
monitor_parser.set_defaults(func=monitor)

args = parser.parse_args()
args.func(args)
