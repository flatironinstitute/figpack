"""
Command-line interface for figpack_slides
"""

import argparse
import sys
from .edit_server import run_server


def main():
    """Main entry point for the CLI"""
    parser = argparse.ArgumentParser(
        description="Start the figpack_slides edit server for live markdown editing"
    )

    parser.add_argument(
        "markdown_file",
        type=str,
        help="Path to the markdown slides file to edit",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=3001,
        help="Port to listen on (default: 3001)",
    )

    parser.add_argument(
        "--allowed-origin",
        type=str,
        default="http://localhost:3000",
        help="Allowed CORS origin (default: http://localhost:3000)",
    )

    args = parser.parse_args()

    try:
        run_server(
            markdown_path=args.markdown_file,
            port=args.port,
            allowed_origin=args.allowed_origin,
        )
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        sys.exit(0)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
