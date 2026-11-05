#!/usr/bin/env python3
"""
Generate example_rotator.json, the list of examples shown on the front page of
the docs (example_rotator.html).

For each figure embedded in the tutorial pages, the list gives its URL, a
label, the tutorial it belongs to, and a link to the section of the docs that
describes it. The links are read from the built HTML, so this script must be
run after sphinx-build (from the docs directory):

    sphinx-build -b html . _build/html
    python devel/generate_example_rotator.py
"""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

DOCS_DIR = Path(__file__).parent.parent
BUILD_DIR = DOCS_DIR / "_build" / "html"

# Tutorial pages, in the order their examples are listed
TUTORIALS = [
    ("basic_views_tutorial", "Basic views"),
    ("spike_sorting_tutorial", "Spike sorting"),
    ("misc_tutorial", "Extensions"),
    ("nwb_tutorial", "NWB"),
]

# Section headings that do not describe the example on their own; the
# heading of the enclosing section is used instead
GENERIC_HEADINGS = {"Basic Usage", "Real-World Example"}

# Labels for examples whose section heading is not a good label
LABEL_OVERRIDES = {
    "tutorial_lossy_video_sync_example": "Lossy Video View (synchronized)",
    "figpack_force_graph": "Force Graph",
    "figpack_3d": "3D Scene",
    "MountainLayout": "MountainLayout",
}

# Examples that the front page may start with (chosen at random)
FEATURED = {
    "tutorial_uniform_timeseries",
    "tutorial_spectrogram_example",
    "tutorial_plotly_example",
    "tutorial_vertical_layout",
    "tutorial_gallery_example",
    "tutorial_complex_layout",
    "spike_sorting_tutorial_spike_amplitudes",
    "spike_sorting_tutorial_cross_correlograms",
    "spike_sorting_tutorial_unit_similarity_matrix",
    "tutorial_3d_mesh_example",
    "tutorial_track_animation_example",
    "tutorial_lossy_video_sync_example",
    "tutorial_linear_decode_example",
    "tutorial_sphere_embedding_example",
    "nwb_tutorial_plane_segmentation",
}


class _IframeSectionParser(HTMLParser):
    """Records each iframe with the chain of (section id, heading) enclosing it"""

    def __init__(self):
        super().__init__()
        self.stack = []  # [section id, heading text]
        self.in_heading = False
        self.iframes = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "section":
            self.stack.append([a.get("id", ""), ""])
        elif re.fullmatch(r"h[1-6]", tag) and self.stack and not self.stack[-1][1]:
            self.in_heading = True
        elif tag == "a" and self.in_heading and "headerlink" in (a.get("class") or ""):
            self.in_heading = False  # skip the permalink symbol
        elif tag == "iframe":
            src = a.get("data-src") or a.get("src")
            if src:
                self.iframes.append((src, [s[:] for s in self.stack]))

    def handle_endtag(self, tag):
        if tag == "section" and self.stack:
            self.stack.pop()
        elif re.fullmatch(r"h[1-6]", tag):
            self.in_heading = False

    def handle_data(self, data):
        if self.in_heading and self.stack:
            self.stack[-1][1] += data


def _example_key(src: str) -> str:
    m = re.match(r"\./?([^/]+)/", src)
    return m.group(1) if m else src


def main():
    examples = []
    for page, group in TUTORIALS:
        html_path = BUILD_DIR / f"{page}.html"
        if not html_path.exists():
            print(f"Error: {html_path} not found; run sphinx-build first")
            sys.exit(1)
        parser = _IframeSectionParser()
        parser.feed(html_path.read_text(encoding="utf-8"))
        for src, sections in parser.iframes:
            sections = [(sid, heading.strip()) for sid, heading in sections]
            # sections[0] is the page title; use the innermost specific heading
            inner = sections[1:] or sections
            label = inner[-1][1]
            for sid, heading in reversed(inner):
                if heading not in GENERIC_HEADINGS:
                    label = LABEL_OVERRIDES.get(heading, heading)
                    break
            key = _example_key(src)
            label = LABEL_OVERRIDES.get(key, label)
            is_hosted = src.startswith("http")
            if is_hosted:
                label += " (real data)"
            embedded_url = src
            if "embedded=1" not in embedded_url:
                embedded_url += ("&" if "?" in embedded_url else "?") + "embedded=1"
            full_url = re.sub(r"[?&]embedded=1", "", embedded_url)
            examples.append(
                {
                    "label": label,
                    "group": group,
                    "url": embedded_url,
                    "fullUrl": full_url,
                    "docUrl": f"{page}.html#{inner[-1][0]}",
                    "featured": key in FEATURED or is_hosted,
                }
            )

    output_file = DOCS_DIR / "example_rotator.json"
    output_file.write_text(json.dumps(examples, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(examples)} examples to {output_file}")


if __name__ == "__main__":
    main()
