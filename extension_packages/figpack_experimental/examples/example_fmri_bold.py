import figpack_experimental.views as jv

url = "https://s3.amazonaws.com/openneuro.org/ds006661/sub-001/func/sub-001_task-main_run-01_bold.nii.gz"

v = jv.FmriBold.from_nii(url)
v.show(title="fMRI BOLD Example", open_in_browser=True)
