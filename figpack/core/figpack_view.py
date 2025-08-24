"""
Base view class for figpack visualization components
"""

from typing import Union

import zarr


class FigpackView:
    """
    Base class for all figpack visualization components
    """

    def show(
        self,
        *,
        port: Union[int, None] = None,
        open_in_browser: bool = False,
        allow_origin: Union[str, None] = None,
        upload: Union[bool, None] = None,
        ephemeral: Union[bool, None] = None,
        _dev: bool = False,
        title: Union[str, None] = None,
        description: Union[str, None] = None,
        inline: Union[bool, None] = None,
        inline_height: int = 600,
    ):
        """
        Display the visualization component

        Args:
            port: Port number for local server
            open_in_browser: Whether to open in browser automatically
            allow_origin: CORS allow origin header
            upload: Whether to upload the figure
            ephemeral: Whether to upload as ephemeral figure (None=auto-detect, True=force ephemeral, False=force regular)
            _dev: Development mode flag
            title: Title for the browser tab and figure
            description: Description text (markdown supported) for the figure
            inline: Whether to display inline in notebook (None=auto-detect, True=force inline, False=force browser)
            inline_height: Height in pixels for inline iframe display (default: 600)
        """
        from ._show_view import (
            _show_view,
            _is_in_notebook,
            _is_in_colab,
            _is_in_jupyterhub,
        )

        if ephemeral is None and upload is None:
            # If we haven't specified both, then let's check if we're in a notebook in a non-local environment
            if _is_in_notebook():
                if _is_in_colab():
                    # if we are in a notebook and in colab, we should show as uploaded ephemeral
                    print("Detected Google Colab notebook environment.")
                    upload = True
                    ephemeral = True
                if _is_in_jupyterhub():
                    # if we are in a notebook and in jupyterhub, we should show as uploaded ephemeral
                    print("Detected JupyterHub notebook environment.")
                    upload = True
                    ephemeral = True

        # Validate ephemeral parameter
        if ephemeral and not upload:
            raise ValueError("ephemeral=True requires upload=True to be set")

        if _dev:
            if port is None:
                port = 3004
            if allow_origin is not None:
                raise ValueError("Cannot set allow_origin when _dev is True.")
            allow_origin = "http://localhost:5173"
            if upload:
                raise ValueError("Cannot upload when _dev is True.")

            print(
                f"For development, run figpack-gui in dev mode and use http://localhost:5173?data=http://localhost:{port}/data.zarr"
            )
            open_in_browser = False

        _show_view(
            self,
            port=port,
            open_in_browser=open_in_browser,
            allow_origin=allow_origin,
            upload=upload,
            ephemeral=ephemeral,
            title=title,
            description=description,
            inline=inline,
            inline_height=inline_height,
        )

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the view data to a Zarr group. Must be implemented by subclasses.

        Args:
            group: Zarr group to write data into
        """
        raise NotImplementedError("Subclasses must implement _write_to_zarr_group")
