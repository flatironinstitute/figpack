# Markdown

Display formatted markdown content in figpack visualizations.

## Overview

`Markdown` renders markdown text with full support for standard markdown syntax including headers, lists, links, code blocks, and text formatting.

## Basic Usage

````python
import figpack.views as vv

# Simple markdown content
view = vv.Markdown("""
# My Title

This is a paragraph with **bold** and *italic* text.

## Features
- Bullet points
- [Links](https://example.com)
- `inline code`

```python
def example():
    print("Code blocks work too!")
````

""")

view.show(open_in_browser=True, title="Markdown Example")

````

## Constructor Parameters

- `content` (str): The markdown content to display

## Supported Markdown Features

### Headers
```markdown
# H1 Header
## H2 Header
### H3 Header
````

## Example

See [example_markdown.py](../examples/example_markdown.py) for a complete demonstration.

```

```
