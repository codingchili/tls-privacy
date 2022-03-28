import asyncio
import pandas

from scapy.all import *
from scapy.layers.inet import IP, Ether


def packets_in(packets):
    return packets[packets['direction'].str.match('in')]


def packets_out(packets):
    return packets[packets['direction'].str.match('out')]


class Sniffer:

    def __init__(self, interface, ip, ports):
        self.logger = logging.getLogger()
        self.ip = ip
        self.ports = f"{' or '.join(str(e) for e in ports)}"
        self.interface = interface
        self.filter = f'host {ip} and port ({self.ports})'
        self.sniffer = AsyncSniffer(prn=self.handle, filter=self.filter, iface=interface, store=False)
        self.label = None
        self.zeroday = None
        self.loads = {}
        self.packets = {}
        self.reset()

    def reset(self):
        packets = self.packets
        loads = self.loads
        self.reset_result()
        self.reset_load()
        self.reset_timer()

        return pandas.DataFrame(data=packets), pandas.DataFrame(data=loads)

    def reset_load(self):
        self.loads = {'time': [], 'tsize': [], 'count': [], 'label': [], 'direction': 'in'}

    def reset_result(self):
        self.label = None
        self.packets = {'time': [], 'size': [], 'csize': [], 'label': [],
                        'direction': [], 'count': 0, 'cin': 0, 'cout': 0}

    def reset_timer(self):
        self.zeroday = None
        self.packets['cin'] = 0
        self.packets['cout'] = 0
        self.packets['count'] = 0

    def timestamp(self):
        if self.zeroday is None:
            self.zeroday = time.monotonic_ns()

        return int(((time.monotonic_ns() - self.zeroday) / (1000 * 1000)))

    def handle(self, pkt):
        if pkt.haslayer(IP) and self.label is not None:
            pkt_len = pkt[IP].len
            direction = 'out' if pkt[IP].dst == self.ip else 'in'

            self.packets[f'c{direction}'] += pkt_len / 1000
            self.packets['direction'].append(direction)
            self.packets['csize'].append(self.packets[f"c{direction}"])
            self.packets['time'].append(self.timestamp())
            self.packets['size'].append(pkt_len)
            self.packets['label'].append(self.label)
            self.packets['count'] += 1

    async def stats(self):
        while True:
            packets = str(len(self.packets['time']))
            self.logger.info(f"capture in progress [packets = \033[94m{packets}\033[0m]")
            await asyncio.sleep(0.5)

    async def start(self):
        self.logger.info(f"started capture on {self.interface} with filter '{self.filter}'..")
        conf.layers.filter([Ether, IP])
        conf.bufsize = 2097152
        self.sniffer.start()

    def update_label(self, label):
        self.label = label

        if self.packets['count'] > 0 and label is not None:
            self.loads['time'].append(self.timestamp())
            self.loads['tsize'].append(self.packets['cin'] + self.packets['cout'])
            self.loads['count'].append(self.packets['count'])
            self.loads['label'].append(label)

        self.logger.info(f"sniffer collecting by label '{label}' ..")
        self.reset_timer()

    def stop(self):
        if self.sniffer:
            self.sniffer.stop()
