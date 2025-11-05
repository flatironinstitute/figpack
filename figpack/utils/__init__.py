import os


def read_script(
    file_path: str, *, _this_script_contains_no_sensitive_info: bool
) -> str:
    if (
        os.environ.get("FIGPACK_SUPPRESS_SCRIPT_WARNING") != "1"
        and not _this_script_contains_no_sensitive_info
    ):
        warning_message = """Figpack is reading a script file, which may get included in a figure.
Be cautious about including sensitive information in script files, as they may be exposed when sharing figures.
Enter y to continue, or any other key to abort. To suppress this warning, set the FIGPACK_SUPPRESS_SCRIPT_WARNING
environment variable to 1. Do you want to continue (y/n)?
"""
        response = input(warning_message)
        if response.lower() != "y":
            raise RuntimeError("Aborted reading script file.")
    else:
        shorter_warning = "Figpack is reading a script file. Be cautious about including sensitive information."
        print(shorter_warning)
    with open(file_path, "r") as f:
        content = f.read()
    return content
