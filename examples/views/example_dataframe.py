"""
Example demonstrating the DataFrame view
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import figpack.views as vv


def main():
    # Create a sample DataFrame with various data types
    np.random.seed(42)  # For reproducible results

    n_rows = 50
    base_date = datetime(2023, 1, 1)

    data = {
        "employee_id": range(1, n_rows + 1),
        "name": [f"Employee_{i:03d}" for i in range(1, n_rows + 1)],
        "department": np.random.choice(
            ["Engineering", "Sales", "Marketing", "HR", "Finance"], n_rows
        ),
        "salary": np.random.normal(75000, 15000, n_rows).round(2),
        "years_experience": np.random.randint(0, 20, n_rows),
        "is_remote": np.random.choice([True, False], n_rows),
        "hire_date": [
            base_date + timedelta(days=int(x))
            for x in np.random.randint(0, 1000, n_rows)
        ],
        "performance_score": np.random.uniform(1.0, 5.0, n_rows).round(1),
    }

    df = pd.DataFrame(data)

    # Ensure salary is positive
    df["salary"] = np.abs(df["salary"])

    print("Sample DataFrame:")
    print(df.head())
    print(f"\nDataFrame shape: {df.shape}")
    print(f"Column types:\n{df.dtypes}")

    # Create the DataFrame view
    dataframe_view = vv.DataFrame(df)

    # Display the DataFrame
    dataframe_view.show(
        title="Employee Data Table",
        description="Interactive table showing employee information with sortable columns and resizable headers.",
    )


if __name__ == "__main__":
    main()
