import numpy as np

import figpack
from .jfm_extension import jfm_extension


class EditableNotes(figpack.ExtensionView):
    def __init__(
        self,
        *,
        initial_text: str = "",
    ):
        """
        Initialize a EditableNotes view

        Args:
            initial_text: Initial text content for the editable notes
        """
        super().__init__(extension=jfm_extension, view_type="jfm.EditableNotes")

        self.initial_text = initial_text

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super()._write_to_zarr_group(group)

        group.create_dataset("text", data=text_to_bytes(self.initial_text))


def text_to_bytes(text: str) -> np.ndarray:
    """Convert text to a numpy array of bytes"""
    text_bytes = text.encode("utf-8")
    return np.frombuffer(text_bytes, dtype="uint8")
