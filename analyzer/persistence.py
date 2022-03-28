import pathlib
import logging
import pandas

from analyzer.format import daytime

logger = logging.getLogger()
base_path = './data'


def data_export(loads, packets, name):
    name = daytime() if name == 'daytime' else name
    path = f"{base_path}/{name}"
    logger.info(f"persistence exported data to '{path}'")
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

    packets.to_json(f"{path}/packets.json", orient="index", indent=4)
    loads.to_json(f"{path}/loads.json", orient="index", indent=4)


def data_import(name):
    loads = pandas.read_json(f"{base_path}/{name}/loads.json", orient="index")
    packets = pandas.read_json(f"{base_path}/{name}/packets.json", orient="index")
    return loads, packets
