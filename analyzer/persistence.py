import pathlib
import logging

from analyzer.format import daytime

logger = logging.getLogger()


def data_export(loads, packets, name):
    path = f"./data/{name}"
    logger.info(f"persistence exported data to '{path}'")
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

    packets.to_json(f"{path}/packets-{daytime()}.json", orient="index", indent=4)
    loads.to_json(f"{path}/loads-{daytime()}.json", orient="index", indent=4)


def data_import(loads, packets):
    pass
