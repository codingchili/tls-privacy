import asyncio
import logging
import json

from analyzer.ansi import *


class Notifier(asyncio.DatagramProtocol):

    def __init__(self, port, callback=None):
        self.logger = logging.getLogger()
        self.active = True
        self.listeners = []
        self.port = port
        self.address = '127.0.0.1'
        self.loop = asyncio.get_event_loop()
        if callback is not None:
            self.listeners.append(callback)

    async def start(self):
        await self.loop.create_datagram_endpoint(
            lambda: NotifierProtocol(self.listeners),
            local_addr=(self.address, self.port)
        )
        self.logger.info(f"listening for notifications in '{cyan(self.address)}:{cyan(self.port)}'.")

    def stop(self):
        self.active = False

    def listen(self, callback):
        self.listeners.append(callback)


class NotifierProtocol(asyncio.DatagramProtocol):

    def __init__(self, listeners):
        super().__init__()
        self.listeners = listeners
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data, address):
        data = json.loads(data.decode('utf-8'))
        try:
            for listener in self.listeners:
                listener(data)
            self.respond(address, True)
        except Exception as e:
            self.respond(address, False)

    def respond(self, address, success):
        self.transport.sendto(
            json.dumps({'acknowledged': success}).encode(),
            address
        )
