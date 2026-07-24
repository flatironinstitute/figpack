"""
Example of the SphereEmbedding view: a sphere embedded into a time-varying
geometry with scalar fields displayed as heatmaps on the surface.

The grid follows the shtns conventions: cos_theta are Gauss nodes (as from
shtns sh.cos_theta) and phi is equally spaced starting at 0. If shtns is
installed, it is used to construct the grid; otherwise an equivalent grid is
built with numpy.
"""

import numpy as np

from figpack_experimental.views import SphereEmbedding


def make_grid(nlat: int, nphi: int):
    try:
        import shtns

        lmax = nlat - 1
        sh = shtns.sht(lmax, lmax)
        sh.set_grid(nlat, nphi)
        cos_theta = sh.cos_theta
    except ImportError:
        # Gauss-Legendre nodes, north pole first (shtns default ordering)
        cos_theta = np.polynomial.legendre.leggauss(nlat)[0][::-1]
    phi = 2 * np.pi * np.arange(nphi) / nphi
    return cos_theta, phi


def main():
    nlat, nphi = 64, 128
    num_times = 60
    cos_theta, phi = make_grid(nlat, nphi)

    theta = np.arccos(cos_theta)
    theta_grid = theta[:, None] * np.ones(nphi)[None, :]
    phi_grid = np.ones(nlat)[:, None] * phi[None, :]

    times = np.arange(num_times) * 0.1  # seconds

    # Unit sphere positions (z along the polar axis)
    sin_theta = np.sin(theta_grid)
    x = sin_theta * np.cos(phi_grid)
    y = sin_theta * np.sin(phi_grid)
    z = np.cos(theta_grid)

    # Time-varying field: a rotating pattern of spherical-harmonic character
    field = np.zeros((num_times, nlat, nphi), dtype=np.float32)
    for it, t in enumerate(times):
        field[it] = np.sin(3 * theta_grid) * np.cos(
            4 * phi_grid - 2 * np.pi * t / times[-1] * 3
        ) + 0.5 * np.cos(5 * theta_grid)

    # Time-varying geometry: radial displacement proportional to the field
    # (rotating with it), with a breathing amplitude that never vanishes
    coords = np.zeros((num_times, nlat, nphi, 3), dtype=np.float32)
    for it, t in enumerate(times):
        amplitude = 0.12 + 0.06 * np.sin(2 * np.pi * t / times[-1])
        r = 1.0 + amplitude * field[it]
        coords[it, :, :, 0] = r * x
        coords[it, :, :, 1] = r * y
        coords[it, :, :, 2] = r * z

    # A static field for comparison
    static_field = (np.cos(theta_grid) ** 2).astype(np.float32)

    view = SphereEmbedding(
        coords=coords,
        fields={
            "rotating pattern": field,
            "cos^2(theta)": static_field,
        },
        cos_theta=cos_theta,
        phi=phi,
        times=times,
    )
    # Include this script's source in the figure (shown under Figure Info)
    with open(__file__, "r") as f:
        script = f.read()
    view.show(title="Sphere Embedding Example", open_in_browser=True, script=script)


if __name__ == "__main__":
    main()
