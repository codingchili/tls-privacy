import asyncio

import pandas
from scapy.all import *
from scapy.layers.inet import IP, Ether, TCP

from analyzer.ansi import *


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
        self.collect_batch()

    def collect_batch(self):
        self.end_request()
        self.loads.pop("packet_counter", None)
        self.loads.pop("total_in", None)
        self.loads.pop("total_out", None)
        packets = self.packets
        loads = self.loads
        self.reset_load()
        self.reset_packets()
        self.reset_timer()

        return pandas.DataFrame(data=packets), pandas.DataFrame(data=loads)

    def reset_load(self):
        self.loads = {'time': [], 'in': [], 'out': [], 'packets': [], 'label': [],
                      'packet_counter': 0, 'total_in': 0, 'total_out': 0}

    def reset_packets(self):
        self.label = None
        self.packets = {'time': [], 'size': [], 'cumulative_size': [], 'label': [], 'direction': []}

    def reset_timer(self):
        self.zeroday = None
        self.loads['total_in'] = 0
        self.loads['total_out'] = 0
        self.loads['packet_counter'] = 0

    def timestamp(self):
        if self.zeroday is None:
            self.zeroday = time.monotonic_ns()

        return int(((time.monotonic_ns() - self.zeroday) / (1000 * 1000)))

    def handle(self, pkt):
        if pkt.haslayer(IP) and self.label is not None:
            pkt_len = (pkt[IP].len - 20 - 20) / 1000  # exclude IP/TCP header and use kb.
            direction = 'out' if pkt[IP].dst == self.ip else 'in'

            self.loads[f"total_{direction}"] += pkt_len
            self.loads['packet_counter'] += 1

            self.packets['cumulative_size'].append(self.loads[f"total_{direction}"])
            self.packets['direction'].append(direction)
            self.packets['time'].append(self.timestamp())
            self.packets['size'].append(pkt_len)
            self.packets['label'].append(self.label)

    async def stats(self):
        while True:
            packets = str(len(self.packets['time']))
            self.logger.info(f"capture in progress [packets = {blue(packets)}]")
            await asyncio.sleep(0.5)

    async def start(self):
        self.logger.info(f"started capture on '{cyan(self.interface)}'")
        self.logger.info(f"using filter '{cyan(self.filter)}'..")
        conf.layers.filter([Ether, IP])
        conf.bufsize = 2097152
        self.sniffer.start()

    def update_label(self, label):
        self.end_request()
        self.label = label
        self.logger.info(f"sniffer collecting by label '{label}' ..")
        self.reset_timer()

    def stop(self):
        if self.sniffer:
            self.sniffer.stop()

    def end_request(self):
        if self.label is not None and self.loads['packet_counter'] > 0:
            self.loads['time'].append(self.timestamp())
            self.loads['in'].append(self.loads['total_in'])
            self.loads['out'].append(self.loads['total_out'])
            self.loads['packets'].append(self.loads['packet_counter'])
            self.loads['label'].append(self.label)
            print(f"end request in={self.loads['total_in']}b out={self.loads['total_out']}b")

    @classmethod
    def interfaces(cls):
        return list(map(lambda iface: iface.name, get_working_ifaces()))
