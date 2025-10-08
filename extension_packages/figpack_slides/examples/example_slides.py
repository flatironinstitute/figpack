import figpack_slides.views as fps
import figpack.views as fpv


ccm_color = "#F0751C"


def main():

    header = fps.SlideHeader(height=10, background_color=ccm_color)
    footer = fps.SlideFooter(height=10, background_color=ccm_color)
    background_color = "white"

    slides = [
        fps.TitleSlide(
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
        ),
        fps.Slide(
            title=fps.SlideText(
                text="This is the first slide", font_size=40, font_family="SANS-SERIF"
            ),
            content=fpv.Markdown("Test Slide 1"),
            header=header,
            footer=footer,
            background_color=background_color,
        ),
        fps.Slide(
            title=fps.SlideText(
                text="This is the second slide", font_size=40, font_family="SANS-SERIF"
            ),
            content=fpv.Markdown("Test Slide 2"),
            header=header,
            footer=footer,
            background_color=background_color,
        ),
    ]
    v = fps.Slides(slides=slides)
    v.show(title="Figpack Slides Example", open_in_browser=True)


if __name__ == "__main__":
    main()
