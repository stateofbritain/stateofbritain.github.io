"""Hansard Highlights — daily UK Parliament highlights pipeline.

Step 1 (this release): fetch a day's House of Commons sitting from the
Hansard API and compile it into a single transcript for downstream analysis.
"""

from .fetch import (
    Contribution,
    DebateSection,
    HansardAPIError,
    HansardClient,
    Transcript,
    fetch_transcript,
)

__version__ = "0.1.0"

__all__ = [
    "Contribution",
    "DebateSection",
    "HansardAPIError",
    "HansardClient",
    "Transcript",
    "fetch_transcript",
]
