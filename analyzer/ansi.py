def ansi(color_id):
    return f"\u001b[{color_id}m"


reset = ansi(0)


def red(message):
    return f"{ansi(31)}{message}{reset}"


def green(message):
    return f"{ansi(32)}{message}{reset}"


def yellow(message):
    return f"{ansi(33)}{message}{reset}"


def blue(message):
    return f"{ansi(34)}{message}{reset}"


def magenta(message):
    return f"{ansi(35)}{message}{reset}"


def cyan(message):
    return f"{ansi(36)}{message}{reset}"


def white(message):
    return f"{ansi(37)}{message}{reset}"


def accuracy_colored(accuracy):
    formatted = '{:.2f}'.format(accuracy * 100)
    if accuracy < 0.25:
        return red(formatted)
    elif accuracy < 0.75:
        return yellow(formatted)
    else:
        return green(formatted)


def time_colored(elapsed):
    formatted = '{:.2f}'.format(elapsed)
    if elapsed < 10:
        return green(formatted)
    elif elapsed < 100:
        return yellow(formatted)
    else:
        return red(formatted)
