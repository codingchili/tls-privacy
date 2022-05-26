import logging
import pathlib

import pandas

from analyzer.ansi import *
from analyzer.format import daytime
from urllib.parse import urlparse
from analyzer.sniffer import packets_in, packets_out

logger = logging.getLogger()
color_index = 0
assigned_colors = {}
colors = [
    'peru', 'yellowgreen', 'deepskyblue', 'hotpink',
    'indigo', 'slategray', 'cornflowerblue', 'darkolivegreen', 'limegreen', 'tomato',
]


def plot_quality(loads, capture):
    items = []
    for df in [y for x, y in loads.groupby('label', as_index=False)]:
        label = df.iloc[0]["label"]

        # one plot per label, to show the quality of individual loads.
        plot(df, capture, f"page-loads-by-label", x='time', y='in', file_name=label_to_filename(label))

        if len(df) > 0:
            items.append({
                'label': label,
                'time-avg': df["time"].mean(),
                'in-avg': df["in"].mean(),
                'packets-avg': df["packets"].mean(),
                'time-std': df["time"].std(),
                'in-std': df["in"].std(),
                'packets-std': df["packets"].std(),
            })
    # one plot for the dataset mean to stddev to show reliability.
    plot(pandas.DataFrame(items), capture, 'quality', x='in-avg', y='in-std')


def label_to_filename(label):
    parsed = urlparse(label)
    return f"{parsed.netloc.replace(':', '@')}{parsed.path.replace('/', '_')}"


def plot_all(loads, packets, capture):
    plot_quality(loads, capture)
    #plot(packets, capture, 'requests-in', x='time', y='csize', data_filter=packets_in)
    #plot(packets, capture, 'requests-out', x='time', y='csize', data_filter=packets_out)
    plot(loads, capture, 'load-in', x='time', y='in')
    plot(loads, capture, 'load-out', x='time', y='out')


def get_color(element):
    global assigned_colors, colors, color_index

    if element not in assigned_colors:
        if color_index < len(colors):
            assigned_colors[element] = colors[color_index]
            color_index += 1
        else:
            return 'gray'

    return assigned_colors[element]


def plot(data, filter, type, y=None, x=None, data_filter=None, file_name=None):
    global assigned_colors, color_index

    if data.empty:
        logger.info(f"skipping plot {filter}/{type}, no data.")
    else:
        if data_filter is not None:
            data = data_filter(data)

        assigned_colors, color_index = {}, 0
        figure = data.plot.scatter(x=x, y=y, c='none', s=12, alpha=0.5,
                                   edgecolors=data['label'].map(lambda e: get_color(e)))
        # plot.set_ylim([749000, 750000])
        # plot.set_xlim([500, 2800])
        save_to_file(figure, file_name, filter, type)


def save_to_file(figure, file_name, filter, type):
    path = f"data/plots/{filter}/{type}"
    filename = f"{daytime() if file_name is None else file_name}.png"
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

    full_path = f"{path}/{filename}"
    figure.figure.savefig(full_path, format='png')
    logger.info(f"visualizer wrote '{cyan(full_path)}'.")
