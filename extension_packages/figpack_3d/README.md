# figpack_3d

3D visualization extension for figpack using Three.js.

## Build

```bash
npm install
npm run build
pip install -e .
```

## Usage

```python
from figpack_3d import ThreeDView

view = ThreeDView(background_color="#222222")
view.add_cube(position=(0, 0, 0), color="#ff4444")
view.add_sphere(position=(3, 0, 0), color="#4444ff")
view.show(title="3D Scene", open_in_browser=True)
