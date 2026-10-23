"""
Tests for updating the bundle references of figure pages when patching
"""

from figpack.core._patch_figure import _patched_page_html, swap_bundle_references

NEW_INDEX = """<!doctype html>
<html>
  <head>
    <link rel="icon" type="image/png" href="./assets/neurosift-logo-NEWLOGO1.png" />
    <script type="module" crossorigin src="./assets/index-NEW-JS_1.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-NEWCSS01.css">
  </head>
  <body><div id="root"></div></body>
</html>
"""

OLD_PAGE = """<!doctype html>
<html>
  <head>
    <link rel="icon" type="image/png" href="./assets/neurosift-logo-CLsuwLMO.png" />
    <title>My edited title</title>
    <script type="module" crossorigin src="./assets/index-D84t3VL-.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-GPjx4QpG.css">
  </head>
  <body><div id="root"></div>
    <script type="module" data-figpack-spec>
    figpack.render({"props": {"title": "see assets/index-AAAAAAAA.js"}}, { specVersion: 1 });
    </script>
  </body>
</html>
"""


def test_swap_bundle_references():
    patched, count = swap_bundle_references(OLD_PAGE, NEW_INDEX)
    assert count == 3
    assert 'src="./assets/index-NEW-JS_1.js"' in patched
    assert 'href="./assets/index-NEWCSS01.css"' in patched
    assert 'href="./assets/neurosift-logo-NEWLOGO1.png"' in patched
    # everything else is kept, including text that is not a src/href attribute
    assert "<title>My edited title</title>" in patched
    assert "see assets/index-AAAAAAAA.js" in patched
    assert "D84t3VL-" not in patched


def test_patched_page_html():
    # index.html with a figure spec: references swapped, contents kept
    patched = _patched_page_html("index.html", OLD_PAGE, NEW_INDEX)
    assert "data-figpack-spec" in patched and "index-NEW-JS_1.js" in patched
    # index.html without a spec (older figures): replaced by the new index.html
    old_plain = OLD_PAGE[: OLD_PAGE.index('<script type="module" data-figpack-spec')]
    assert _patched_page_html("index.html", old_plain, NEW_INDEX) == NEW_INDEX
    # another page without bundle references: left alone
    assert _patched_page_html("notes.html", "<p>hi</p>", NEW_INDEX) is None
