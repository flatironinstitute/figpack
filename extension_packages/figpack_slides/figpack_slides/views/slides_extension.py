import figpack


def _load_javascript_code():
    """Load the JavaScript code from the built figpack_slides.js file"""
    import os

    js_path = os.path.join(os.path.dirname(__file__), "../figpack_slides.js")
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Could not find figpack_slides.js at {js_path}. "
            "Make sure to run 'npm run build' to generate the JavaScript bundle."
        )


# Create and register the figpack_slides extension
slides_extension = figpack.FigpackExtension(
    name="figpack-slides", javascript_code=_load_javascript_code(), version="0.1.0"
)
