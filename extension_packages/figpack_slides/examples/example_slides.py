import figpack_slides.views as fps
import figpack.views as fpv


ccm_color = "#F0751C"

header = fps.SlideHeader(height=10, background_color=ccm_color)
footer = fps.SlideFooter(height=10, background_color=ccm_color)
background_color = "white"


def main():
    slides = [title_slide(), slide_1(), slide_2()]
    v = fps.Slides(slides=slides)
    v.show(title="Figpack Slides Example", open_in_browser=True)


def title_slide():
    return fps.TitleSlide(
        title=fps.SlideText(
            text="Figpack Slides Example",
            font_size=80,
            font_family="SANS-SERIF",
            color="white",
        ),
        subtitle=fps.SlideText(
            text="An example slide deck using figpack-slides",
            font_size=40,
            font_family="SANS-SERIF",
            color="white",
        ),
        author=fps.SlideText(
            text="By Your Name",
            font_size=30,
            font_family="SANS-SERIF",
            color="white",
        ),
        background_color=ccm_color,
    )


def slide_1():
    content_left = """
This is some example content for the first slide.

* Bullet point 1
* Bullet point 2
* Bullet point 3
"""
    content_right = """
This is content on the right side of the slide.

* Bullet point A
* Bullet point B
* Bullet point C
"""

    content = fpv.Box(
        direction="horizontal",
        items=[
            fpv.LayoutItem(view=fpv.Markdown(content_left, font_size=24), stretch=1),
            fpv.LayoutItem(view=fpv.Markdown(content_right, font_size=24), stretch=1),
        ],
    )

    return fps.Slide(
        title=fps.SlideText(
            text="This is the first slide", font_size=40, font_family="SANS-SERIF"
        ),
        content=content,
        header=header,
        footer=footer,
        background_color=background_color,
    )


def slide_2():
    content_left = """
This is some example content for the second slide.

* Bullet point A
* Bullet point B
"""

    content_right = fpv.TimeseriesGraph()
    content_right.add_line_series(
        name="Sine Wave", t=[0, 1, 2, 3, 4, 5], y=[0, 1, 0, -1, 0, 1]
    )

    content = fpv.Box(
        direction="horizontal",
        items=[
            fpv.LayoutItem(view=fpv.Markdown(content_left, font_size=24), stretch=1),
            fpv.LayoutItem(view=content_right, stretch=1),
        ],
    )

    return fps.Slide(
        title=fps.SlideText(
            text="This is the second slide xxx", font_size=40, font_family="SANS-SERIF"
        ),
        content=content,
        header=header,
        footer=footer,
        background_color=background_color,
    )


if __name__ == "__main__":
    main()
