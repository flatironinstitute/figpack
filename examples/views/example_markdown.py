import os
import figpack.views as vv


def main():
    view = example_markdown()

    title = "Example Markdown"
    description_md = """
# Example Markdown

This is an example of a markdown view created using figpack.
"""

    upload = os.environ.get("FIGPACK_UPLOAD") == "1"
    view.show(
        open_in_browser=True,
        upload=upload,
        title=title,
        description=description_md,
    )


def example_markdown():
    view = vv.Markdown(
        """
# Test markdown

This is a test of the markdown view in figpack.

## Features
- **Bold text**
- *Italic text*
- [Link to figpack](https://github.com/magland/figpack)

```python
def hello_world():
    print("Hello, world!")
```
"""
    )
    return view


if __name__ == "__main__":
    main()
