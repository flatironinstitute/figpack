"""
Base view class for figpack visualization components
"""

import os
import random
import string
from typing import Optional

from .zarr import Group


class FigpackView:
    """
    Base class for all figpack visualization components
    """

    def show(
        self,
        *,
        title: str,
        description: Optional[str] = None,
        script: Optional[str] = None,
        port: Optional[int] = None,
        open_in_browser: Optional[bool] = None,
        upload: Optional[bool] = None,
        inline: Optional[bool] = None,
        inline_height: int = 600,
        ephemeral: Optional[bool] = None,
        allow_origin: Optional[str] = None,
        wait_for_input: Optional[bool] = None,
        _dev: Optional[bool] = None,
    ):
        """
        Display a figpack view component with intelligent environment detection and flexible display options.
        See https://flatironinstitute.github.io/figpack/show_function.html for complete documentation.

        Automatically adapts behavior based on context (Jupyter, Colab, JupyterHub, standalone).
        Display modes include local browser, inline notebook, and remote upload with ephemeral options.
        Environment variables (FIGPACK_UPLOAD, FIGPACK_INLINE, FIGPACK_OPEN_IN_BROWSER) can control default behaviors.

        Args:
            title: Title for browser tab and figure (required)
            description: Description text with markdown support (optional)
            script: Optional script text used to generate the figure
            port: Local server port, random if None
            open_in_browser: Auto-open in browser, auto-detects by environment
            upload: Upload figure to figpack servers, auto-detects by environment
            ephemeral: Use temporary figure for cloud notebooks, auto-detects
            inline: Display inline in notebook, auto-detects by environment
            inline_height: Height in pixels for inline display (default: 600)
            allow_origin: CORS allow-origin header for local server
            wait_for_input: Wait for Enter before continuing, auto-detects
            _dev: Developer mode for figpack development
        """
        from ._show_view import (
            _show_view,
            _is_in_notebook,
            _is_in_colab,
            _is_in_jupyterhub,
        )

        # determine upload
        if upload is None:
            if os.environ.get("FIGPACK_UPLOAD") == "1":
                upload = True
            elif os.environ.get("FIGPACK_UPLOAD") == "0":
                upload = False

        if upload is True:
            if ephemeral is True:
                # ephemeral is reserved for the case where we don't specify upload
                # and we are in a notebook in a remote environment such as
                # colab or jupyterhub
                raise ValueError(
                    "ephemeral cannot be set to True if upload is set to True"
                )
            else:
                ephemeral = (
                    False  # if we excplicitly set upload=True, force ephemeral=False
                )

        # determine inline
        if inline is None:
            if os.environ.get("FIGPACK_INLINE") == "1":
                inline = True
            elif os.environ.get("FIGPACK_INLINE") == "0":
                inline = False
            elif _is_in_notebook() and not upload:
                inline = True
            else:
                inline = False

        # determine open_in_browser
        if open_in_browser is None:
            open_in_browser = os.environ.get("FIGPACK_OPEN_IN_BROWSER") == "1"

        # determine ephemeral
        if ephemeral is None and not upload:
            ephemeral = False  # default to False
            if os.environ.get("FIGPACK_REMOTE_ENV") == "1":
                ephemeral = True
                upload = True
            elif os.environ.get("FIGPACK_REMOTE_ENV") == "0":
                ephemeral = False
            elif _is_in_notebook():
                if _is_in_colab():
                    # if we are in a notebook and in colab, we should show as uploaded ephemeral
                    print("Detected Google Colab notebook environment.")
                    upload = True
                    ephemeral = True
                elif _is_in_jupyterhub():
                    # if we are in a notebook and in jupyterhub, we should show as uploaded ephemeral
                    print("Detected JupyterHub notebook environment.")
                    upload = True
                    ephemeral = True

        if ephemeral is None:
            ephemeral = False

        if upload is None:
            upload = False

        # determine _dev
        if _dev is None:
            _dev = os.environ.get("FIGPACK_DEV") == "1"

        if port is None and os.environ.get("FIGPACK_PORT"):
            try:
                port = int(os.environ.get("FIGPACK_PORT", ""))
            except Exception:
                pass

        # determine wait_for_input
        if wait_for_input is None:
            wait_for_input = not _is_in_notebook()

        # Validate ephemeral parameter
        if ephemeral and not upload:
            raise ValueError("ephemeral=True requires upload=True to be set")

        _local_figure_name: Optional[str] = None

        if _dev:
            if open_in_browser:
                print("** Note: In dev mode, open_in_browser is forced to False **")
                open_in_browser = False
            if port is None:
                port = 3004
            if allow_origin is not None:
                raise ValueError("Cannot set allow_origin when _dev is True.")
            allow_origin = "http://localhost:5173"
            if upload:
                raise ValueError("Cannot upload when _dev is True.")

            # make a random figure name
            _local_figure_name = "fig_" + "".join(
                random.choices(string.ascii_lowercase + string.digits, k=8)
            )
            print("** Development mode **")
            print(
                f"For development, run figpack-figure in dev mode and use http://localhost:5173?figure=http://localhost:{port}/{_local_figure_name}/"
            )
            print("")

        return _show_view(
            self,
            port=port,
            open_in_browser=open_in_browser,
            allow_origin=allow_origin,
            upload=upload,
            ephemeral=ephemeral,
            title=title,
            description=description,
            script=script,
            inline=inline,
            inline_height=inline_height,
            wait_for_input=wait_for_input,
            _local_figure_name=_local_figure_name if _dev else None,
        )

    def save(
        self, output_path: str, *, title: str, description: str = "", script: str = ""
    ) -> None:
        """
        Save as figure either to a folder or to a .tar.gz file
        Args:
            output_path: Output path (destination folder or .tar.gz file path)
            title: Title for the figure
            description: Description text with markdown support
            script: Optional script text used to generate the figure
        """
        from ._save_figure import _save_figure

        _save_figure(
            self, output_path, title=title, description=description, script=script
        )

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the view data to a Zarr group. Must be implemented by subclasses.

        Args:
            group: Zarr group to write data into
        """
        raise NotImplementedError("Subclasses must implement write_to_zarr_group")
