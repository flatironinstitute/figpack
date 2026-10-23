"""
Tests for the figure spec schemas of figpack_slides views

Run from the repository root (after npm run build in this package):
    pytest --no-cov extension_packages/figpack_slides/tests
"""

import zarr

from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group
import figpack_slides.views as fpsv
from figpack_slides.views.TitleSlide import TitleSlideContent


def _spec(view):
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    return build_figure_spec(root)


ARROW = {
    "id": "1",
    "type": "shape",
    "shape": "arrow",
    "direction": "right",
    "position": {"x": 100, "y": 100},
    "size": {"length": 200, "thickness": 50},
    "style": {"stroke": "black", "strokeWidth": 2, "fill": "orange"},
}


def _deck():
    return fpsv.Slides(
        slides=[
            fpsv.TitleSlide(title="Deck", subtitle="Sub", author="Me"),
            fpsv.Slide(
                title=fpsv.SlideText("Slide", font_size=40, color="red"),
                hide_title=True,
                content=fpsv.Markdown("Some *text*", font_size=28, slide_index=1),
                header=fpsv.SlideHeader(height=10, background_color="blue"),
                footer=fpsv.SlideFooter(height=10, background_color="blue"),
                background_color="white",
                slide_metadata={"elements": [ARROW]},
            ),
            fpsv.Slide(title="Plain", content=fpsv.Markdown("Plain")),
        ]
    )


def test_schemas_are_registered():
    schemas = get_spec_schemas()
    assert schemas["slides.Slides"] is fpsv.Slides.spec_schema
    assert schemas["slides.Slide"] is fpsv.Slide.spec_schema
    assert schemas["slides.TitleSlideContent"] is TitleSlideContent.spec_schema
    assert schemas["slides.Markdown"] is fpsv.Markdown.spec_schema


def test_slide_props_are_written():
    spec = _spec(_deck())
    slides = spec["children"]
    # zarr 2 and zarr 3 list groups in different orders
    assert sorted(slides) == ["slide_1", "slide_2", "slide_3"]
    slide = slides["slide_2"]
    assert set(slide["props"]) == {p.name for p in fpsv.Slide.spec_schema.props}
    assert slide["props"]["slide_metadata"] == {"elements": [ARROW]}
    # Empty slide metadata is not written
    assert "slide_metadata" not in slides["slide_3"]["props"]
    # Markdown text and edit bookkeeping stay in data.zarr
    assert slide["children"]["content"] == {"props": {"font_size": 28}}


def test_title_slide_props_are_written():
    content = _spec(_deck())["children"]["slide_1"]["children"]["content"]
    assert set(content["props"]) == {
        p.name for p in TitleSlideContent.spec_schema.props
    }
    assert content["props"]["subtitle"] == {"text": "Sub"}
