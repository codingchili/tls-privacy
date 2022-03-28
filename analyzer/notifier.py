import asyncio
import logging


class Notifier:

    def __init__(self, address, callback=None):
        self.logger = logging.getLogger()
        self.address = address
        self.active = True
        self.listeners = []
        if callback is not None:
            self.listeners.append(callback)

        self.logger.info(f"listening for notifications in '{address}'.")

    def stop(self):
        self.active = False

    def listen(self, callback):
        self.listeners.append(callback)

    async def start(self):
        file = open(self.address, 'r+')
        file.truncate(0)

        while True:
            line = file.readline()
            if not line or not line.endswith('\n'):
                if self.active:
                    await asyncio.sleep(0.01)
                    continue
                else:
                    break
            else:
                line = line[:-1]
                for listener in self.listeners:
                    listener({'label': line, 'exit': line == 'exit'})
