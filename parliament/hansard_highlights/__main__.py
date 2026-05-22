"""Package entry point: ``python -m hansard_highlights``."""

from .fetch import main

if __name__ == "__main__":
    raise SystemExit(main())
