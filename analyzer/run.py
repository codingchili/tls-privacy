from analyzer.notifier import *
from analyzer.sniffer import *
from analyzer.visualizer import *

logging.basicConfig(format='%(asctime)s %(message)s')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

interface = "Ethernet"
# ip = '194.68.236.180"
ip = "192.168.0.114"
ports = [2180, 9000, 5180, 443]
address = './bus/analyzer.bus'


async def main():
    notifier = Notifier(address)
    sniffer = Sniffer(ip, ports, interface)

    def update(notification):
        if notification['exit']:
            packets, loads = sniffer.reset()
            capture = sniffer.filter

            plot_result(packets, capture, 'requests-in', x='time', y='csize', data_filter=packets_in)
            plot_result(packets, capture, 'requests-out', x='time', y='csize', data_filter=packets_out)
            plot_result(loads, capture, 'load', x='count', y='tsize')
        else:
            sniffer.update_label(notification['label'])

    notifier.listen(update)

    await sniffer.start()
    await notifier.start()


try:
    loop = asyncio.get_event_loop()
    loop.create_task(main())
    loop.run_forever()
except KeyboardInterrupt:
    logger.info('shutting down')
    pass
