import pathlib
import tempfile

from ._bundle_utils import prepare_figure_bundle
from .figpack_view import FigpackView


def _save_figure(
    view: FigpackView,
    output_path: str,
    *,
    title: str,
    description: str = "",
    script: str = "",
) -> None:
    """
    Save the figure to a folder or a .tar.gz file

    Args:
        view: FigpackView instance to save
        output_path: Output path (destination folder or .tar.gz file path)
        title: Title for the figure
        description: Description text with markdown support
        script: Optional script text used to generate the figure
    """
    output_path_2 = pathlib.Path(output_path)
    if (output_path_2.suffix == ".gz" and output_path_2.suffixes[-2] == ".tar") or (
        output_path_2.suffix == ".tgz"
    ):
        # It's a .tar.gz file
        with tempfile.TemporaryDirectory(prefix="figpack_save_") as tmpdir:
            prepare_figure_bundle(
                view, tmpdir, title=title, description=description, script=script
            )
            # Create tar.gz file
            import tarfile

            with tarfile.open(output_path_2, "w:gz") as tar:
                tar.add(tmpdir, arcname=".")
    else:
        # It's a folder
        output_path_2.mkdir(parents=True, exist_ok=True)
        prepare_figure_bundle(
            view,
            str(output_path_2),
            title=title,
            description=description,
            script=script,
        )
