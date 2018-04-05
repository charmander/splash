#!/usr/bin/env python3
import math
import string


NAME_LENGTH = 10
NAME_ALPHABET = string.digits + string.ascii_lowercase
NAME_BITS = NAME_LENGTH * math.log2(len(NAME_ALPHABET))


def generate_host(rng):
    return ''.join(rng.choice(NAME_ALPHABET) for _ in range(NAME_LENGTH))


if __name__ == '__main__':
    from random import SystemRandom

    rng = SystemRandom()
    print('splash-' + generate_host(rng))
