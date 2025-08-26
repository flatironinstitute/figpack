import pathlib
import tempfile

from ._bundle_utils import prepare_figure_bundle
from .figpack_view import FigpackView


def _save_figure(view: FigpackView, output_path: str, *, title: str):
    """
    Save the figure to a folder or a .tar.gz file

    Args:
        view: FigpackView instance to save
        output_path: Output path (destination folder or .tar.gz file path)
    """
    output_path = pathlib.Path(output_path)
    if (output_path.suffix == ".gz" and output_path.suffixes[-2] == ".tar") or (
        output_path.suffix == ".tgz"
    ):
        # It's a .tar.gz file
        with tempfile.TemporaryDirectory(prefix="figpack_save_") as tmpdir:
            prepare_figure_bundle(view, tmpdir, title=title)
            # Create tar.gz file
            import tarfile

            with tarfile.open(output_path, "w:gz") as tar:
                tar.add(tmpdir, arcname=".")
    else:
        # It's a folder
        output_path.mkdir(parents=True, exist_ok=True)
        prepare_figure_bundle(view, str(output_path), title=title)
