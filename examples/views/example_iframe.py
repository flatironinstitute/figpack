"""
Example showing how to use the Iframe view
"""

import figpack.views as vv

# Create an iframe view with a URL
iframe = vv.Iframe(url="https://www.example.com")

# Display the iframe
iframe.show(title="Iframe Example", open_in_browser=True)
