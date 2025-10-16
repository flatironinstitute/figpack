from typing import List

import figpack
from .slides_extension import slides_extension
from .Slide import Slide


class Slides(figpack.ExtensionView):
    def __init__(self, *, slides: List[Slide]):
        """
        A slide deck containing multiple slides
        """
        super().__init__(extension=slides_extension, view_type="slides.Slides")

        self.slides = slides

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        for i, slide in enumerate(self.slides):
            slide_group = group.create_group(f"slide_{i + 1}")
            slide.write_to_zarr_group(slide_group)

    @property
    def title(self) -> str:
        if len(self.slides) == 0:
            return "Empty Presentation"
        return self.slides[0].title.text
