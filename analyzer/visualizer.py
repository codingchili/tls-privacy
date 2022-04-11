import logging
import pathlib

from analyzer.ansi import *
from analyzer.format import daytime
from analyzer.sniffer import packets_in, packets_out

logger = logging.getLogger()
color_index = 0
assigned_colors = {}
colors = [
    'peru', 'yellowgreen', 'deepskyblue', 'hotpink',
    'indigo', 'slategray', 'cornflowerblue', 'darkolivegreen', 'limegreen', 'tomato',
]


def plot_all(loads, packets, capture):
    #plot_result(packets, capture, 'requests-in', x='time', y='csize', data_filter=packets_in)
    #plot_result(packets, capture, 'requests-out', x='time', y='csize', data_filter=packets_out)
    plot_result(loads, capture, 'load-in', x='time', y='in')
    plot_result(loads, capture, 'load-out', x='time', y='out')


def get_color(element):
    global assigned_colors, colors, color_index

    if element not in assigned_colors:
        assigned_colors[element] = colors[color_index]
        color_index += 1

    return assigned_colors[element]


def plot_requests(data, filter, type, x, y):
    global assigned_colors, color_index
    assigned_colors = {}
    color_index = 0

    plot = data.plot.scatter(x=x, y=y, edgecolors=data['label'].map(lambda e: get_color(e)), c='none', s=12, alpha=0.5)
    #plot.set_ylim([29000, 30000])
    #plot.set_xlim([500, 2800])

    path = f"data/plots/{filter}/{type}/"
    filename = f"{daytime()}.png"
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)
    plot.figure.savefig(f"{path}/{filename}", format='png')
    logger.info(f"visualizer wrote '{cyan(path)}'.")


def plot_result(data, filter, type, y=None, x=None, data_filter=None):
    if data.empty:
        logger.info("skipping plot as no data is captured.")
    else:
        if data_filter is not None:
            data = data_filter(data)
        plot_requests(data, filter, type, x=x, y=y)
