import argparse

from analyzer.ansi import *
from analyzer.learning import *
from analyzer.notifier import *
from analyzer.persistence import data_import, data_export
from analyzer.sniffer import Sniffer
from analyzer.visualizer import *
from analyzer.monitor import start_monitor

logging.basicConfig(format=f"{magenta('%(asctime)s')} %(message)s")
logger = logging.getLogger()
logger.setLevel(logging.INFO)

parser = argparse.ArgumentParser(description=green('Traffic analyzer.'))
parser.add_argument('--interface', help='interface to listen on.', metavar='ETH')
parser.add_argument('--ip', help='host to capture traffic from/to.')
parser.add_argument('--ports', help='ports to capture traffic on.', nargs='?', const=1, default='80,443')
parser.add_argument('--listen', help='port to listen for notifications.', nargs='?', const=1, default=9555)
parser.add_argument('--dump', help='dump all data under the given ./data dir.', nargs='?', const='daytime',
                    default=None)
parser.add_argument('--load', help='loads the dataset with the given name.')
parser.add_argument('--plot', help='plots the loaded dataset.')
parser.add_argument('--monitor', help='pass sniffed traffic to the given model.')
parser.add_argument('--learn', help='builds a model from the loaded dataset.', action='store_true')
parser.add_argument('--eth', help='lists the available interfaces.', action='store_const', const=True)

args = parser.parse_args()
args.ports = args.ports.split(',')


async def main():
    notifier = Notifier(args.listen)
    sniffer = Sniffer(args.interface, args.ip, args.ports)

    if args.monitor is not None:
        await start_monitor(sniffer, notifier, args.monitor)
    else:
        await start_notifier(sniffer, notifier)

    await sniffer.start()
    await sniffer.stats()


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

try:
    if args.load and args.interface:
        logger.info('cannot specify both interface source and dataset to load.')
    else:
        if args.eth:
            interfaces = '\n\t'.join(list(map(lambda i: f"- '{cyan(i)}'", Sniffer.interfaces())))
            logger.info(f"available interfaces\n\t{interfaces}")

        if args.interface and args.interface not in Sniffer.interfaces():
            logger.info("given interface not available, list available with --eth.")
        else:
            if args.load:
                loads, packets = data_import(args.load)
                if args.plot:
                    plot_all(loads, packets, args.load)
                if args.learn:
                    build_model(loads, args.load)

                if not args.plot and not args.learn:
                    logger.warning('missing --plot or --learn.')

            elif args.interface:
                asyncio.run(main())
except KeyboardInterrupt:
    logger.info("shutting down.")
