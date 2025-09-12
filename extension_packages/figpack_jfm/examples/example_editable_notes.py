import figpack_jfm.views as fpj


def main():
    v = fpj.EditableNotes(initial_text="Hello, this is an editable note.")
    v.show(title="Editable Notes Example", open_in_browser=True)


if __name__ == "__main__":
    main()
