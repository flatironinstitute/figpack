import os
import figpack


def _load_javascript_code():
    """Load the JavaScript code from the built figpack_experimental.js file"""
    js_path = os.path.join(os.path.dirname(__file__), "../figpack_experimental.js")
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Could not find figpack_experimental.js at {js_path}. "
            "Make sure to run 'npm run build' to generate the JavaScript bundle."
        )


def _load_additional_javascript_assets():
    additional_javascript_assets = {}
    assets_path = os.path.join(os.path.dirname(__file__), "../assets")
    fnames = os.listdir(assets_path)

    for fname in fnames:
        if fname.endswith(".js"):
            with open(os.path.join(assets_path, fname), "r") as f:
                content = f.read()
            additional_javascript_assets[fname] = content

    return additional_javascript_assets


additional_javascript_assets = _load_additional_javascript_assets()

# Create and register the figpack_experimental extension
experimental_extension = figpack.FigpackExtension(
    name="figpack-experimental",
    javascript_code=_load_javascript_code(),
    additional_javascript_assets=additional_javascript_assets,
    version="1.0.0",
)
