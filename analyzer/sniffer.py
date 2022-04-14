import asyncio
import pandas

from scapy.all import *
from scapy.layers.inet import IP

from analyzer.ansi import *


def packets_in(packets):
    return packets[packets['direction'].str.match('in')]


def packets_out(packets):
    return packets[packets['direction'].str.match('out')]


class Sniffer:

    def __init__(self, interface, ip, ports):
        self.logger = logging.getLogger()
        self.ip = ip
        self.packet_count = 0
        self.ports = f"{' or '.join(str(e) for e in ports)}"
        self.interface = interface
        self.filter = f'ip and host {ip} and port ({self.ports})'
        self.sniffer = AsyncSniffer(prn=self.handle, filter=self.filter, iface=interface, store=False)
        self.label = None
        self.zeroday = None
        self.loads = {}
        self.packets = {}
        self.collect_batch()
        self.listeners = []

    def listen(self, listener):
        self.listeners.append(listener)

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
        self.packet_count = 0
        self.loads = {'time': [], 'in': [], 'out': [], 'packets': [], 'label': [],
                      'packet_counter': 0, 'total_in': 0, 'total_out': 0}

    def reset_packets(self):
        self.label = None
        self.packets = {'time': [], 'size': [], 'cumulative_size': [], 'label': [], 'direction': [], 'order': []}

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
        if self.label is not None:
            self.packet_count += 1
            pkt_len = (pkt[IP].len - 20 - 20)  # exclude IP/TCP header.
            direction = 'out' if pkt[IP].dst == self.ip else 'in'

            self.loads[f"total_{direction}"] += pkt_len
            self.loads['packet_counter'] += 1

            self.packets['order'].append(self.loads["packet_counter"])
            self.packets['cumulative_size'].append(self.loads[f"total_{direction}"])
            self.packets['direction'].append(direction)
            self.packets['time'].append(self.timestamp())
            self.packets['size'].append(pkt_len)
            self.packets['label'].append(self.label)

            for listener in self.listeners:
                listener(self.loads, self.packets)

    async def stats(self):
        while True:
            self.logger.info(f"capture in progress [packets = {blue(self.packet_count)}]")
            await asyncio.sleep(0.5)

    async def start(self):
        self.logger.info(f"started capture on '{cyan(self.interface)}'")
        self.logger.info(f"using filter '{cyan(self.filter)}'..")
        conf.layers.filter([IP])
        conf.sniff_promisc = 0
        conf.promisc = False
        conf.bufsize = 2097152
        conf.recv_poll_rate = 0.01
        self.sniffer.start()

    def update_label(self, label):
        self.end_request()
        self.label = label
        self.logger.info(f"sniffer collecting for '{label}' ..")
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

    @classmethod
    def interfaces(cls):
        return list(map(lambda iface: iface.name, get_working_ifaces()))
