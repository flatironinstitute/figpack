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
    ):
        """
        Display the visualization component
        """
        from ._show_view import _show_view

        _show_view(
            self, port=port, open_in_browser=open_in_browser, allow_origin=allow_origin
        )

    def upload(self) -> str:
        """
        Upload the visualization to the cloud

        Returns:
            str: URL where the uploaded figure can be viewed

        Raises:
            EnvironmentError: If FIGPACK_UPLOAD_PASSCODE is not set
            Exception: If upload fails
        """
        from ._upload_view import _upload_view

        return _upload_view(self)

    def dev(self):
        port = 3004
        print(
            f"For development, run figpack-gui in dev mode and use http://localhost:5173?data=http://localhost:{port}/data.zarr"
        )
        self.show(
            port=port, open_in_browser=False, allow_origin="http://localhost:5173"
        )

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the view data to a Zarr group. Must be implemented by subclasses.

        Args:
            group: Zarr group to write data into
        """
        raise NotImplementedError("Subclasses must implement _write_to_zarr_group")
