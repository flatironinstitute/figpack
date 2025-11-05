import os
import pathlib
import tempfile
import webbrowser
from typing import Union

from ._bundle_utils import prepare_figure_bundle
from ._server_manager import ProcessServerManager
from ._upload_bundle import _upload_bundle
from .figpack_view import FigpackView


def _is_in_notebook() -> bool:
    """
    Detect if we are running in a Jupyter notebook environment.

    Returns:
        bool: True if running in a notebook, False otherwise
    """
    try:
        # Check if IPython is available and we're in a notebook
        from IPython import get_ipython  # type: ignore

        ipython = get_ipython()
        if ipython is None:
            return False

        # Check if we're in a notebook environment
        if hasattr(ipython, "kernel"):
            return True

        # Additional check for notebook-specific attributes
        if "ipykernel" in str(type(ipython)):
            return True

        return False
    except ImportError:
        return False


def _is_in_colab():
    try:
        import google.colab  # type: ignore

        return True
    except ImportError:
        return False


def _is_in_jupyterhub():
    return "JUPYTERHUB_USER" in os.environ


def _display_inline_iframe(url: str, height: int) -> None:
    """
    Display an iframe inline in a Jupyter notebook.

    Args:
        url: URL to display in the iframe
        height: Height of the iframe in pixels
    """
    try:
        from IPython.display import HTML, display

        iframe_html = f"""
        <iframe src="{url}" 
                width="100%" 
                height="{height}px" 
                frameborder="0"
                style="border: 1px solid #ccc; border-radius: 4px;">
        </iframe>
        """

        display(HTML(iframe_html))

    except ImportError:
        print(f"IPython not available. Please install IPython to use inline display.")
        print(f"Alternatively, open {url} in your browser.")


thisdir = pathlib.Path(__file__).parent.resolve()


def _show_view(
    view: FigpackView,
    *,
    open_in_browser: bool,
    port: Union[int, None],
    allow_origin: Union[str, None],
    upload: bool,
    ephemeral: bool,
    title: str,
    description: Union[str, None],
    script: Union[str, None],
    inline: bool,
    inline_height: int,
    wait_for_input: bool,
    _local_figure_name: Union[str, None],
):
    if upload:
        # Upload behavior: create temporary directory for this upload only
        with tempfile.TemporaryDirectory(prefix="figpack_upload_") as tmpdir:
            prepare_figure_bundle(
                view, tmpdir, title=title, description=description, script=script
            )

            # Check for API key - required for regular uploads, optional for ephemeral
            api_key = os.environ.get("FIGPACK_API_KEY")
            if not ephemeral and not api_key:
                raise EnvironmentError(
                    "FIGPACK_API_KEY environment variable must be set to upload views."
                )

            # Upload the bundle
            figure_url = _upload_bundle(
                tmpdir,
                api_key,
                title=title,
                ephemeral=ephemeral,
                use_consolidated_metadata_only=True,
            )

            if inline:
                # For uploaded figures, display the remote URL inline and continue
                _display_inline_iframe(figure_url, inline_height)
            else:
                # Not in notebook environment
                if open_in_browser:
                    webbrowser.open(figure_url)
                    print(f"Opening {figure_url} in browser.")
                else:
                    print(f"View the figure at: {figure_url}")
                # Wait until user presses Enter

            if wait_for_input:
                input("Press Enter to continue...")
            return figure_url
    else:
        # Local server behavior: use process-level server manager
        server_manager = ProcessServerManager.get_instance()

        # Create figure subdirectory in process temp directory
        figure_dir = server_manager.create_figure_subdir(
            _local_figure_name=_local_figure_name
        )

        # Prepare the figure bundle in the subdirectory
        prepare_figure_bundle(
            view, str(figure_dir), title=title, description=description, script=script
        )

        # Start or get existing server
        base_url, server_port = server_manager.start_server(
            port=port, allow_origin=allow_origin, enable_file_upload=True
        )

        # Construct URL to the specific figure subdirectory
        figure_subdir_name = figure_dir.name
        figure_url = f"{base_url}/{figure_subdir_name}"

        if inline:
            # Display inline and continue (don't block)
            _display_inline_iframe(figure_url, inline_height)
        else:
            # Not in notebook environment
            if open_in_browser:
                webbrowser.open(figure_url)
                print(f"Opening {figure_url} in browser.")
            else:
                print(f"Open {figure_url} in your browser to view the visualization.")

        if wait_for_input:
            input("Press Enter to continue...")
        return figure_url
