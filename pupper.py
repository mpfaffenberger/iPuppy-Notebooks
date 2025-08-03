# %%
print('Welcome to iPuppy Notebooks!')
# %%
from IPython.display import display, Math
# LaTeX for Fourier Transform
ft_eq = r"""
\mathcal{F}\{f(t)\}(\xi) = \int_{-\infty}^{\infty} f(t) \, e^{-2\pi i \xi t} \, dt
"""
display(Math(ft_eq))