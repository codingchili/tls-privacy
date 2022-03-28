import logging
import pathlib
import time

import pandas

logger = logging.getLogger()
color_index = 0
assigned_colors = {}
colors = [
    'peru', 'yellowgreen', 'deepskyblue', 'hotpink',
    'indigo', 'slategray', 'cornflowerblue', 'darkolivegreen', 'limegreen',
]


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

    plot = data.plot.scatter(x=x, y=y, c=data['label'].map(lambda e: get_color(e)), edgecolors='none', s=12, alpha=0.25)
    plot.set_xlabel(x)
    plot.set_ylabel(y)

    path = f"plots/{filter}/{type}/"
    filename = f"{time.strftime('%Y-%m-%d_%H.%M.%S')}.svg"
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)
    plot.figure.savefig(f"{path}/{filename}", format='svg')
    logger.info(f"wrote plot {type} to '{path}'.")


def plot_result(results, filter, type, y=None, x=None, data_filter=None):
    data = pandas.DataFrame(data=results)
    if data.empty:
        logger.info("skipping plot as no data is captured.")
    else:
        if data_filter is not None:
            data = data_filter(data)
        plot_requests(data, filter, type, x=x, y=y)
