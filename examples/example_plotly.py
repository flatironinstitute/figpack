import os
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import figpack.views as vv


def main():
    view = example_plotly()

    title = "Plotly Visualization Examples"
    description_md = """
# Plotly Visualization Examples

This example demonstrates several types of interactive plots using figpack and plotly.

Features:
- **Mathematical Functions**: Trigonometric functions with different styles
- **Statistical Data**: Distribution analysis with histogram and curve fitting
- **Scatter Plot**: Correlation visualization with color mapping
- **Time Series**: Simple time-based data visualization

All plots are interactive with zoom, pan, and hover capabilities.
"""

    upload = os.environ.get("FIGPACK_UPLOAD") == "1"
    view.show(
        open_in_browser=True,
        upload=upload,
        title=title,
        description=description_md,
    )


def example_plotly():
    # Create subplots with different types
    fig = make_subplots(
        rows=2,
        cols=2,
        subplot_titles=(
            "Mathematical Functions",
            "Statistical Distribution",
            "Scatter Plot with Colors",
            "Time Series Data",
        ),
        specs=[
            [{"secondary_y": False}, {"secondary_y": True}],
            [{"secondary_y": False}, {"secondary_y": False}],
        ],
        vertical_spacing=0.12,
        horizontal_spacing=0.1,
    )

    # 1. Mathematical Functions (Sine and Cosine)
    x = np.linspace(0, 4 * np.pi, 150)
    y_sin = np.sin(x)
    y_cos = np.cos(x)

    fig.add_trace(
        go.Scatter(
            x=x,
            y=y_sin,
            mode="lines",
            name="sin(x)",
            line=dict(color="#FF6B6B", width=2.5),
        ),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Scatter(
            x=x,
            y=y_cos,
            mode="lines",
            name="cos(x)",
            line=dict(color="#4ECDC4", width=2.5),
        ),
        row=1,
        col=1,
    )

    # 2. Statistical Distribution
    np.random.seed(42)
    data = np.random.normal(100, 15, 800)

    fig.add_trace(
        go.Histogram(
            x=data,
            nbinsx=25,
            name="Data Distribution",
            marker_color="rgba(78, 205, 196, 0.7)",
            yaxis="y2",
        ),
        row=1,
        col=2,
    )

    # Add normal distribution curve
    x_norm = np.linspace(data.min(), data.max(), 100)
    y_norm = (
        800
        * 25
        * (1 / np.sqrt(2 * np.pi * 15**2))
        * np.exp(-0.5 * ((x_norm - 100) / 15) ** 2)
        * (data.max() - data.min())
        / 25
    )

    fig.add_trace(
        go.Scatter(
            x=x_norm,
            y=y_norm,
            mode="lines",
            name="Normal Curve",
            line=dict(color="#FF6B6B", width=3),
            yaxis="y2",
        ),
        row=1,
        col=2,
    )

    # 3. Scatter Plot with Color Mapping
    np.random.seed(123)
    n_points = 150
    x_scatter = np.random.randn(n_points)
    y_scatter = 0.6 * x_scatter + 0.4 * np.random.randn(n_points)
    colors = x_scatter + y_scatter  # Color by sum

    fig.add_trace(
        go.Scatter(
            x=x_scatter,
            y=y_scatter,
            mode="markers",
            name="Correlated Points",
            marker=dict(
                size=8,
                color=colors,
                colorscale="Viridis",
                showscale=True,
                colorbar=dict(x=0.48, len=0.4, y=0.25),
            ),
            hovertemplate="X: %{x:.2f}<br>Y: %{y:.2f}<extra></extra>",
        ),
        row=2,
        col=1,
    )

    # 4. Time Series Data
    dates = np.arange("2023-01-01", "2023-07-01", dtype="datetime64[D]")
    np.random.seed(456)
    values = 50 + np.cumsum(np.random.randn(len(dates)) * 0.8)

    fig.add_trace(
        go.Scatter(
            x=dates,
            y=values,
            mode="lines+markers",
            name="Time Series",
            line=dict(color="#45B7D1", width=2),
            marker=dict(size=4),
        ),
        row=2,
        col=2,
    )

    # Update layout
    fig.update_layout(
        height=800,
        showlegend=True,
        title_text="Plotly Examples",
        title_x=0.5,
        title_font_size=18,
        template="plotly_white",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )

    # Update individual subplot properties
    fig.update_xaxes(title_text="x", row=1, col=1)
    fig.update_yaxes(title_text="f(x)", row=1, col=1)

    fig.update_xaxes(title_text="Value", row=1, col=2)
    fig.update_yaxes(title_text="Frequency", row=1, col=2)

    fig.update_xaxes(title_text="X Variable", row=2, col=1)
    fig.update_yaxes(title_text="Y Variable", row=2, col=1)

    fig.update_xaxes(title_text="Date", row=2, col=2)
    fig.update_yaxes(title_text="Value", row=2, col=2)

    view = vv.PlotlyFigure(fig=fig)
    return view


if __name__ == "__main__":
    main()
