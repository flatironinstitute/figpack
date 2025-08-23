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
        upload: bool = False,
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
            _dev: Development mode flag
            title: Title for the browser tab and figure
            description: Description text (markdown supported) for the figure
            inline: Whether to display inline in notebook (None=auto-detect, True=force inline, False=force browser)
            inline_height: Height in pixels for inline iframe display (default: 600)
        """
        from ._show_view import _show_view

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
