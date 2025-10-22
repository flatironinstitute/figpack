from typing import Any, Dict
import zarr


_UNSPECIFIED = object()


class Group:
    def __init__(self, zarr_group: zarr.Group):
        self._zarr_group = zarr_group

    def create_group(self, name: str) -> "Group":
        return Group(self._zarr_group.create_group(name))

    def create_dataset(
        self,
        name: str,
        *,
        data=_UNSPECIFIED,
        dtype=_UNSPECIFIED,
        chunks=_UNSPECIFIED,
        compressor=_UNSPECIFIED,
    ) -> None:
        kwargs = {}
        if data is not _UNSPECIFIED:
            kwargs["data"] = data
        if dtype is not _UNSPECIFIED:
            kwargs["dtype"] = dtype
        if chunks is not _UNSPECIFIED:
            kwargs["chunks"] = chunks
        if compressor is not _UNSPECIFIED:
            kwargs["compressor"] = compressor
        if _check_zarr_version() == 2:
            self._zarr_group.create_dataset(name, **kwargs)
        elif _check_zarr_version() == 3:
            self._zarr_group.create_array(name, **kwargs)  # type: ignore
        else:
            raise RuntimeError("Unsupported Zarr version")

    @property
    def attrs(self) -> Dict[str, Any]:
        return self._zarr_group.attrs  # type: ignore

    def __getitem__(self, key: str) -> Any:
        return self._zarr_group[key]

    # implement in operator
    def __contains__(self, key: str) -> bool:
        return key in self._zarr_group

    def __iter__(self):
        return iter(self._zarr_group)

    def __reversed__(self):
        return reversed(self._zarr_group)


def _check_zarr_version():
    version = zarr.__version__
    major_version = int(version.split(".")[0])
    return major_version
