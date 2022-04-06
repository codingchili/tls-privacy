import logging
import argparse

from analyzer.notifier import *
from analyzer.sniffer import *
from analyzer.visualizer import *
from analyzer.ansi import *
from analyzer.persistence import data_import, data_export

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
parser.add_argument('--load', help='loads the dump with the given name.')
parser.add_argument('--eth', help='lists the available interfaces.', action='store_const', const=True)

args = parser.parse_args()
args.ports = args.ports.split(',')


async def main(args):
    notifier = Notifier(args.listen)
    sniffer = Sniffer(args.interface, args.ip, args.ports)

    def update(notification):
        if notification['exit']:
            packets, loads = sniffer.collect_batch()

            if args.dump is not None:
                data_export(loads, packets, args.dump)

            plot_all(loads, packets, args.ip)
        else:
            sniffer.update_label(notification['message'])

    notifier.listen(update)

    await notifier.start()
    await sniffer.start()
    await sniffer.stats()


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
                plot_all(loads, packets, args.load)
            elif args.interface:
                asyncio.run(main(args))
except KeyboardInterrupt:
    logger.info("shutting down.")
