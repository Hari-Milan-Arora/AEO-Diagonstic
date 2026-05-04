"""
AEO Diagnostic Engine — Shared Utility Functions
Deterministic hashing, seeded random, and common helpers.
"""

import math
from typing import List


def hash_str(s: str) -> int:
    """Deterministic hash for a string (matches JS engine behavior)."""
    h = 0
    for ch in s:
        h = ((h << 5) - h) + ord(ch)
        h = h & 0xFFFFFFFF  # 32-bit
    return abs(h)


class SeededRandom:
    """Deterministic PRNG matching the JS engine's seededRand."""

    def __init__(self, seed: int):
        self._state = seed % 2147483647
        if self._state <= 0:
            self._state += 2147483646

    def next(self) -> float:
        self._state = (self._state * 16807) % 2147483647
        return (self._state - 1) / 2147483646

    def pick(self, arr: list):
        return arr[int(self.next() * len(arr))]

    def chance(self, probability: float) -> bool:
        return self.next() < probability


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def round1(v: float) -> float:
    return round(v * 10) / 10


def pct(count: int, total: int) -> int:
    if total == 0:
        return 0
    return round(count / total * 100)
