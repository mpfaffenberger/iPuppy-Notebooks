# %% [markdown]
"""
# 🚀🐶 Welcome to the Fourier Transform Playground! 🐶🚀

What’s up, data explorer? Today we’re about to unleash the power of **Fourier Transform** – the magical tool that lets you break down signals into their basic frequencies, like finding all the ingredients in your favorite snack (but with more math and fewer crumbs)!

- **Why should you care?** Fourier Transform turns wiggly lines (signals) into beautiful spectrums so you can see what frequencies are hiding underneath. Super useful for audio, images, signals, and... basically everywhere!
- **What will we do?** We'll decompose signals, make some cool plots, and flex our mathy muscles. Prepare for some serious data wizardry.

Let’s get howl-ing and see some frequencies unleashed! 🎵📊
"""
# %% [markdown]
"""
## 🐾 The Fourier Transform Formula (Let's get nerdy!)

The (continuous) Fourier Transform is given by:

$$
X(f) = \int_{-\infty}^{\infty} x(t) \cdot e^{-j 2 \pi f t} \, dt
$$

- $x(t)$ = the original time-domain signal
- $X(f)$ = the frequency-domain representation (how much of frequency $f$ is in $x(t)$)
- $t$ = time
- $f$ = frequency
- $j$ = imaginary unit (it's not scary, I promise!)

Fourier magic lets you break down signals into a symphony of their frequency components, like a puppy decoding a squeaky toy! 🐶🎼🚀
"""
# %%

# %%
import numpy as np
import plotly.graph_objects as go

# Random seed for puppy-level reproducibility 🐶
np.random.seed(42)

# Generate time axis
N = 1000  # Number of samples
T = 1.0   # Total duration in seconds
x = np.linspace(0.0, T, N)

# Build a periodic signal: sum of two sine waves (5 Hz & 20 Hz) + noise
freq1 = 5  # Hz
freq2 = 20 # Hz
signal = np.sin(2 * np.pi * freq1 * x) + 0.5 * np.sin(2 * np.pi * freq2 * x)
noise = 0.5 * np.random.normal(size=N)
noisy_signal = signal + noise

# Plot that glorious mess
fig = go.Figure()
fig.add_trace(go.Scatter(x=x, y=noisy_signal, mode='lines', name='Noisy Signal', line=dict(color='white')))
fig.add_trace(go.Scatter(x=x, y=signal, mode='lines', name='Original Signal', line=dict(color='magenta', dash='dash')))
fig.update_layout(title='Noisy Periodic Signal (with Two Frequencies) 🐾',
                  xaxis_title='Time (s)',
                  yaxis_title='Amplitude',
                  legend=dict(font=dict(color='white')), # Greyscale/dark theme puppy-friendly
                  plot_bgcolor='rgb(30,30,30)', paper_bgcolor='rgb(30,30,30)', font_color='white')
fig.show()
# %%
# 🐶🚀 Puppy Fourier Unleash Mode: Let's crack open the spectrum!
import numpy as np
import plotly.graph_objects as go

# Compute FFT (magnitude spectrum)
fft_vals = np.fft.fft(noisy_signal)
freqs = np.fft.fftfreq(N, d=x[1]-x[0])

# Only take the positive frequencies (because our signal is real-valued, so spectrum is symmetric)
pos_mask = freqs >= 0
freqs_pos = freqs[pos_mask]
fft_mag = np.abs(fft_vals)[pos_mask] * 2 / N # scale properly for amplitude

# Plot
fig = go.Figure()
fig.add_trace(go.Scatter(x=freqs_pos, y=fft_mag,
                         mode='lines',
                         name='Spectrum',
                         line=dict(color='cyan')))
fig.update_layout(title="Fourier Transform Magnitude Spectrum 🐾🚀",
                  xaxis_title="Frequency (Hz)",
                  yaxis_title="Amplitude",
                  legend=dict(font=dict(color='white')),
                  plot_bgcolor='rgb(30,30,30)', paper_bgcolor='rgb(30,30,30)', font_color='white')
fig.show()
# %% [markdown]
"""
## 🌊🐕‍🦺 Wavelet Transform: The Puppy Wave Surfer of Signal Analysis! 🚀

Ready to ride the waves? 🏄‍♂️ Wavelet Transform is like the Fourier Transform's cooler, hipper cousin who surfs both time and frequency at the same time! 

**Why Wavelets?**
- Unlike the classic Fourier Transform (which can only tell you *what frequencies* are present, but not *when they appear*), Wavelet Transform is all about *time-frequency localization*.
- It gives you a “zoomed in” window: tiny blips, big trends, sudden puppy barks—wavelets catch them all! 🐾
- SUPER useful for non-stationary signals (think: heartbeats, puppy barks, seismic rumbles, financial shenanigans).

**The Mathy Bit:**
The Continuous Wavelet Transform (CWT) of a signal $x(t)$ is:

$$
W(a, b) = \frac{1}{\sqrt{|a|}} \int_{-\infty}^{\infty} x(t) \, \psi^*\left(\frac{t-b}{a}\right) dt
$$
- $\psi(t)$ is the *mother wavelet* (the basic wag you stretch and shift)
- $a$ = scale (how stretched out the wavelet is)
- $b$ = shift (where you put the wavelet in time)

**Bottom Line:**
Wavelet Transform is the ultimate nose for finding both *when* and *what* in your data—sniffing out features at all scales and locations! 🐶👃 Let's unleash some wavelets next?
"""
# %% [markdown]
"""
🐶 **Wavelet Transform Libraries in Python: The Real Scoop!** 🚀

Wavelet transforms (especially the Discrete Wavelet Transform or DWT like 'haar') are a *super-specialized* signal processing trick. In Python:

- **PyWavelets (`pywt`)**: THE standard for DWT! All the Haar, Daubechies, and friends live here. Can't be beat for classic wavelet stuff.
- **scipy.signal**: Shockingly, *does not* have the classic DWT. You *can* do continuous wavelet transforms (like `scipy.signal.cwt` with Morlet/generic wavelets), but NO classic DWT decomposition/reconstruction here. (Not even in sk-signal, scikit-learn, or scikit-image!)
- **Other Libraries**: Exist, but they're niche, less documented, or not up-to-date! E.g., `wavelets`, `wlftools`, or deep-learning adaptions.

🔥 **What should you do?**
If `pywt` won't install, your best shot is to:
- Try a straight-up `!pip install pywt` from a notebook/code cell if allowed
- Install from your terminal/conda/etc: `pip install pywavelets` or `conda install pywavelets`
- If desperate, explore continuous wavelet stuff in `scipy.signal.cwt`, but it WON'T act like proper DWT

**Summary:** If you want real DWT (Haar, Daubechies, etc), Python basically = PyWavelets. Stubborn—but true! 😤🐾
"""
# %%
# 🐕‍🦺🚀 Discrete Wavelet Transform (DWT) on Our Noisy Signal with Haar Wavelet!
import pywt
import plotly.graph_objects as go

# Run Haar DWT
coeffs = pywt.dwt(noisy_signal, 'haar')
approx, detail = coeffs

# Time axes for each set of coefficients
approx_t = x[:len(approx)]
detail_t = x[:len(detail)]

# Plotting (side-by-side for MAXWOOF clarity)
fig = go.Figure()
fig.add_trace(go.Scatter(x=approx_t, y=approx, name='Approximation (Low Freq)',
                        line=dict(color='lime')))
fig.add_trace(go.Scatter(x=detail_t, y=detail, name='Detail (High Freq)',
                        line=dict(color='yellow')))
fig.update_layout(title='DWT (Haar) Coefficients for Noisy Signal 🚀🐶',
                  xaxis_title='Time (s)',
                  yaxis_title='Coefficient Value',
                  plot_bgcolor='rgb(30,30,30)',
                  paper_bgcolor='rgb(30,30,30)',
                  font_color='white',
                  legend=dict(font=dict(color='white')))
fig.show()
# %% [markdown]
"""
## 🚧🐾 Wavelet DWT: No Substitute, Just PyWavelets

Sadly: if you want a real, proper, mathematically-true Discrete Wavelet Transform (DWT—think Haar, Daubechies, etc) in Python, you NEED `pywt` (PyWavelets). There just isn't any real alternative in `scipy.signal`, `scikit-learn`, or other major packages.

- **CWT (`scipy.signal.cwt`) only gives you continuous wavelet coefficients (good for analysis, but *not* decomposition/reconstruction or sparse DWT coding).**
- **All other libraries are niche or barely maintained.**
- **Moral:** If DWT is critical, you gotta work with your Python packages until PyWavelets is happily installed! 🦴🐶

*Puppy verdict: if you want classic wavelet wizardry, it's PyWavelets or bust!*
"""
