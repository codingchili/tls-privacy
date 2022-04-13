# perform the nearest neighbor analysis.
import logging
import pathlib
import pickle
import time
from itertools import combinations

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

from analyzer.ansi import *


path = "data/models/"
logger = logging.getLogger()


def build_model(data, algorithm, set_names=None, file_name="model.bin",):
    model = learn(data, algorithm, set_names)
    model.__dict__[".algorithm"] = algorithm
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

    full_path = f"{path}{file_name}.bin"
    pickle.dump(model, open(full_path, 'wb'))
    logger.info(f"saved model to '{cyan(full_path)}'.")
    

def load_model(file_name="model.bin"):
    full_path = f"{path}{file_name}.bin"
    logger.info(f"loaded model from '{cyan(full_path)}'.")
    return pickle.load(open(full_path, 'rb'))


def predict(model, item):
    item = item.filter(model.__dict__['.features'])
    predicted = model.predict(item)

    start = time.monotonic_ns()
    probabilities = model.predict_proba(item)
    end = time.monotonic_ns()

    elapsed = (end - start) / (1000 * 1000)
    accuracy = probabilities[0][predicted[0]] * model.__dict__[".accuracy"]
    label = model.__dict__[".labels"][predicted[0]]
    logger.info(f"match {green(label)} with accuracy {accuracy_colored(accuracy)}% in {time_colored(elapsed)}ms.")
    return label, accuracy


def learn(data, algorithm, set_names=None, k_max=32, min_score=0.4, test_proportion=0.2):
    logger.info(f"started learning using algorithm {cyan(algorithm)}.")
    data = map_direction(data)
    y = create_labels(data)
    sets = feature_sets(data) if set_names is None else set_names
    best_features, best_model, best_score, best_k = None, None, 0, -1

    for index, feature_combination in enumerate(sets):
        x = data.filter(feature_combination, axis=1)
        x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=test_proportion, random_state=0)
        last_score = 0

        for k in range(1, k_max):
            if algorithm == 'rf':
                model = RandomForestClassifier(max_depth=k_max, random_state=0)
                model.fit(x_train, y_train)
                score = model.score(x_test, y_test)
            elif algorithm == 'knn':
                model = KNeighborsClassifier(n_neighbors=k)
                model.fit(x_train, y_train)
                score = model.score(x_test, y_test)
            else:
                logger.error(f"unsupported algorithm '{algorithm}', expected rf or knn.")
                exit(1)

            # prefers earlier scores if equal, which uses fewer features.
            if score > best_score:
                best_model, best_k, best_score, best_features = model, k, score, feature_combination

            percent = (int(((index * k_max + k) / (len(sets) * k_max)) * 100))
            log_progress(percent, score, k, feature_combination)

            if score < min_score or score <= last_score:
                break
            else:
                last_score = score

    log_complete(best_k, best_features, best_score)
    best_model.__dict__[".labels"] = labels(data)
    best_model.__dict__[".accuracy"] = best_score
    best_model.__dict__[".features"] = best_features
    return best_model


def log_progress(percent, score, k, feature_combination):
    logger.info(f"learning progress {yellow(percent)}% "
                f"score={cyan('{:.2f}'.format(score))} "
                f"k={cyan(str(k))} "
                f"features={cyan(list(feature_combination))}")


def log_complete(best_k, best_features, best_score):
    logger.info(f"learned best k={green(str(best_k))}, using features {green(best_features)} "
                f"with accuracy {accuracy_colored(best_score)}%.")


def map_direction(data):
    direction = ['in', 'out']
    if 'direction' in data:
        data["direction"] = data["direction"].map(lambda x: direction.index(x))
    return data


def labels(data):
    return data["label"].unique().tolist()


def create_labels(data):
    unique = labels(data)
    return data["label"].map(lambda x: unique.index(x))


def feature_sets(data):
    features = list(data.columns.drop('label'))
    return list(filter(
        lambda f: len(f) > 0, [c for i in range(len(features) + 1) for c in combinations(features, i)]))
