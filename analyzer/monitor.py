# feed back into browser duplication monitoring.
import asyncio
import logging
import time

import pandas

from analyzer.ansi import *
from analyzer.learning import predict, load_model

logger = logging.getLogger()
poll_rate = 0.1


async def start_monitor(sniffer, model_name, timeout):
    if model_name is None:
        logger.error("model name for monitor mode not specified, use --load FILE.")
        exit(1)
    else:
        asyncio.get_event_loop().create_task(monitor_loop(sniffer, model_name, timeout=timeout))


async def monitor_loop(sniffer, model_name, timeout):
    model = load_model(model_name)
    last = time.monotonic()

    def callback(loads, packets):
        nonlocal last
        last = time.monotonic()

    sniffer.listen(callback)
    sniffer.update_label("monitor-mode")

    while True:
        now = time.monotonic()
        # no packets in the last second, request has ended.
        if (now - last) > timeout:
            requests, loads = sniffer.collect_batch()

            if len(loads) > 0:
                logger.info(f"no packets in the last {yellow(timeout)}s, observed x{cyan(len(loads))} loads.")
                for index, loads in loads.iterrows():
                    print(loads.head())
                    label, accuracy = predict(model, pandas.DataFrame([loads]))
                    # notifier.publish({'label': label, 'accuracy': accuracy})
                    # notifier.publish({'label': label, 'accuracy': accuracy})

            sniffer.update_label("monitor-mode")
            last = time.monotonic()
        await asyncio.sleep(poll_rate)
