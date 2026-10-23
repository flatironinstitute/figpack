"""
Helpers for building views from spikeinterface widgets

These replace spikeinterface's private helpers (widgets.base.to_attr and
make_serializable), which have moved or been removed between versions.
"""

from types import SimpleNamespace


def widget_plot_data(widget):
    """The widget's plot data (a dict) with attribute access"""
    data_plot = widget.data_plot
    if isinstance(data_plot, dict):
        return SimpleNamespace(**data_plot)
    return data_plot


def serializable_unit_ids(unit_ids):
    """Unit ids as plain Python values (numpy scalars become int, str, ...)"""
    return [u.item() if hasattr(u, "item") else u for u in unit_ids]
