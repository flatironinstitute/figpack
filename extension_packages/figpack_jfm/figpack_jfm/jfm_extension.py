import figpack


def _load_javascript_code():
    """Load the JavaScript code from the built figpack_jfm.js file"""
    import os

    js_path = os.path.join(os.path.dirname(__file__), "figpack_jfm.js")
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Could not find figpack_jfm.js at {js_path}. "
            "Make sure to run 'npm run build' to generate the JavaScript bundle."
        )


# Create and register the figpack_jfm extension
jfm_extension = figpack.FigpackExtension(
    name="figpack-jfm",
    javascript_code=_load_javascript_code(),
    version="1.0.0",
)
