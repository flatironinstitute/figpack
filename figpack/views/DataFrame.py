"""
DataFrame view for figpack - displays pandas DataFrames as interactive tables
"""

import json

import numpy as np
import zarr

from ..core.figpack_view import FigpackView
from ..core.zarr import Group


class DataFrame(FigpackView):
    """
    A DataFrame visualization component for displaying pandas DataFrames as interactive tables
    """

    def __init__(self, df):
        """
        Initialize a DataFrame view

        Args:
            df: The pandas DataFrame to display

        Raises:
            ValueError: If df is not a pandas DataFrame
        """
        import pandas as pd

        if not isinstance(df, pd.DataFrame):
            raise ValueError("df must be a pandas DataFrame")

        self.df = df

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the DataFrame data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "DataFrame"

        try:
            # Convert DataFrame to CSV string
            csv_string = self.df.to_csv(index=False)

            # Convert CSV string to bytes and store in numpy array
            csv_bytes = csv_string.encode("utf-8")
            csv_array = np.frombuffer(csv_bytes, dtype=np.uint8)

            # Store the CSV data as compressed array
            group.create_dataset(
                "csv_data",
                data=csv_array,
            )

            # Store metadata about the DataFrame
            group.attrs["data_size"] = len(csv_bytes)
            group.attrs["row_count"] = len(self.df)
            group.attrs["column_count"] = len(self.df.columns)

            # Store column information
            column_info = []
            for col in self.df.columns:
                dtype_str = str(self.df[col].dtype)
                # Simplify dtype names for frontend
                if dtype_str.startswith("int"):
                    simple_dtype = "integer"
                elif dtype_str.startswith("float"):
                    simple_dtype = "float"
                elif dtype_str.startswith("bool"):
                    simple_dtype = "boolean"
                elif dtype_str.startswith("datetime"):
                    simple_dtype = "datetime"
                elif dtype_str == "object":
                    # Check if it's actually strings
                    if self.df[col].dtype == "object":
                        simple_dtype = "string"
                    else:
                        simple_dtype = "object"
                else:
                    simple_dtype = "string"

                column_info.append(
                    {"name": str(col), "dtype": dtype_str, "simple_dtype": simple_dtype}
                )

            # Store column info as JSON string
            column_info_json = json.dumps(column_info)
            group.attrs["column_info"] = column_info_json

        except Exception as e:
            # If DataFrame processing fails, store error information
            group.attrs["error"] = f"Failed to process DataFrame: {str(e)}"
            group.attrs["row_count"] = 0
            group.attrs["column_count"] = 0
            group.attrs["data_size"] = 0
            group.attrs["column_info"] = "[]"
            # Create empty array as placeholder
            group.create_dataset("csv_data", data=np.array([], dtype=np.uint8))
