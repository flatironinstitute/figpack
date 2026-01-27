"""
Example of creating a TiledImage view with figpack

This example creates a Mandelbrot set image and displays it using the TiledImage view.
"""

import numpy as np
import matplotlib.pyplot as plt
from figpack_spike_sorting.views import TiledImage, TiledImageLayer


def mandelbrot(height, width, x=-0.5, y=0, zoom: float = 1, max_iterations=100):
    """Generate a Mandelbrot set image"""
    # To make navigation easier we calculate these values
    x_width = 1.5
    y_height = 1.5 * height / width
    x_from = x - x_width / zoom
    x_to = x + x_width / zoom
    y_from = y - y_height / zoom
    y_to = y + y_height / zoom
    # Here the actual algorithm starts
    x_arr = np.linspace(x_from, x_to, width).reshape((1, width))
    y_arr = np.linspace(y_from, y_to, height).reshape((height, 1))
    c = x_arr + 1j * y_arr
    # Initialize z to all zero
    z = np.zeros(c.shape, dtype=np.complex128)
    # To keep track in which iteration the point diverged
    div_time = np.zeros(z.shape, dtype=int)
    # To keep track on which points did not converge so far
    m = np.full(c.shape, True, dtype=bool)
    for i in range(max_iterations):
        z[m] = z[m] ** 2 + c[m]
        diverged = np.greater(np.abs(z), 2, out=np.full(c.shape, False), where=m)
        div_time[diverged] = i
        m[np.abs(z) > 2] = False
    return div_time


def main():
    print("Creating Mandelbrot array")
    width = 2000
    height = 2000
    max_iterations = 300
    tile_size = 256

    x = mandelbrot(height, width, max_iterations=max_iterations, zoom=1.3)
    x = x.astype(np.float32) / max_iterations
    x[x > 1] = 1

    print("Converting to color map uint8")
    RdGy = plt.get_cmap("RdGy")
    # colorize and convert to uint8
    y = np.flip((RdGy(x)[:, :, :3] * 255).astype(np.uint8), axis=0)

    print("Creating TiledImage view")
    layer1 = TiledImageLayer(label="layer 1", data=y)

    # Create a second layer (modifying the first layer)
    y2 = y.copy()
    y2[:, :, 0] = 0  # Remove red channel
    layer2 = TiledImageLayer(label="layer 2", data=y2)

    view = TiledImage(tile_size=tile_size, layers=[layer1, layer2], verbose=True)

    print("Showing view...")
    view.show(title="Tiled Image Example", open_in_browser=True)


if __name__ == "__main__":
    main()
