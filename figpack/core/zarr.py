from typing import Any, Dict
import numpy as np


_UNSPECIFIED = object()


class Group:
    def __init__(self, zarr_group):
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
        else:
            if data is not _UNSPECIFIED:
                chunks2 = _get_optimal_chunk_size(data.shape, data.dtype)
                if chunks2 is not _UNSPECIFIED:
                    kwargs["chunks"] = chunks2
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
    import zarr

    version = zarr.__version__
    major_version = int(version.split(".")[0])
    return major_version


def _get_optimal_chunk_size(shape: tuple, dtype) -> tuple:
    """Compute an optimal chunk shape targeting ~5 MB per chunk,
    chunking along only one dimension and avoiding mostly empty chunks.
    """
    target_bytes = 5 * 1024 * 1024  # 5 MB

    if np.prod(shape) <= 1:
        # all dimensions are zero or one
        # return shape of unspecified to let zarr choose on this edge case
        return _UNSPECIFIED

    # Ensure dtype is a numpy dtype to get itemsize
    if isinstance(dtype, str):
        dtype = np.dtype(dtype)

    itemsize = np.dtype(dtype).itemsize

    # Total array size in bytes
    total_bytes = np.prod(shape) * itemsize
    if total_bytes <= target_bytes:
        # Entire array fits comfortably in one chunk
        return shape

    # Choose the first non-singleton dimension to chunk along
    for axis, dim in enumerate(shape):
        if dim > 1:
            break
    else:
        return shape  # all singleton

    # Compute how many elements fit in target_bytes
    target_elements = target_bytes // itemsize

    # Compute product of all other dimensions (fixed)
    other_size = np.prod(shape) // shape[axis]

    # Determine chunk length along chosen axis
    chunk_len = max(1, min(shape[axis], target_elements // other_size))

    # Construct chunk shape
    chunk_shape = list(shape)
    chunk_shape[axis] = chunk_len

    return tuple([int(c) for c in chunk_shape])


if __name__ == "__main__":
    # Test the _get_optimal_chunk_size function for a variety of shapes and dtypes
    test_cases = [
        ((1000, 1000), np.float32),
        ((5000, 2000), np.uint8),
        ((100, 100, 100), np.float64),
        ((10, 30, 30, 1500), np.int16),
        ((1, 1, 1), np.float32),
    ]

    for shape, dtype in test_cases:
        chunk_size = _get_optimal_chunk_size(shape, dtype)
        print(f"Optimal chunk size for shape {shape} and dtype {dtype}: {chunk_size}")
