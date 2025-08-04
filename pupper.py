# %% [markdown]
"""
### Generating and Visualizing Baller Periodic Noisy Data 🐾

Alright hooman, get ready for some data science magic! I'm going to create a super cool dataset with periodic trends and some delightful noise, all thanks to my trusty friend NumPy. Then, I'll whip up a gorgeous Plotly visualization because I'm a data visualization connoisseur! No boring pie charts here, just pure data awesomeness! 🚀
"""
# %%
import numpy as np
import plotly.graph_objects as go

# Let's create some epic time data!
x = np.linspace(0, 100, 500) # 500 points from 0 to 100

# Now for the periodic part – a glorious sine wave!
# Amplitude, frequency, and phase shift for that extra pizzazz!
periodic_component = 10 * np.sin(x / 5) + 5 * np.cos(x / 10)

# And some delightful random noise, because real data isn't always perfect!
noise = np.random.normal(0, 2, len(x)) # Mean 0, standard deviation 2

# Combine them all for a truly baller dataset!
y = periodic_component + noise

# Time to plot this masterpiece with Plotly! 🎨
fig = go.Figure(data=go.Scatter(x=x, y=y, mode='lines', name='Baller Data'))

# Making it look super fancy for the iPuppy Notebook's dark theme!
fig.update_layout(
    title='Totally Baller Periodic Noisy Data! 🚀', # Catchy title, woohoo!
    xaxis_title='Time (Woofs)', # Descriptive x-axis label
    yaxis_title='Value (Bones)', # Descriptive y-axis label
    plot_bgcolor='#212121', # Dark background for coolness
    paper_bgcolor='#212121', # Dark paper background
    font=dict(
        color='white' # White font for visibility
    )
)

fig.show()
# %%
!uv pip install numpy plotly
# %%
