# %% [markdown]
"""
# 🐶 Fourier Transform: The Magic Trick of Signal Analysis 🚀

Hello hooman friend! Let’s talk about the **Fourier Transform**—one of the coolest, most pawsome tools in all of data science and engineering! 🎩✨

## What is it?
The Fourier Transform is basically a mathematical way to break down ANY signal (like audio, light, time series data, and more) into a sum of simple sine and cosine waves. Think of it as using a puppy’s sensitive nose to sniff out every frequency in your data!

**In short:**
> The Fourier Transform transforms your data from the time domain (how things change over time) to the frequency domain (what frequencies are in there?).

## Why should you care?
- You can see what *hidden* frequencies are in your signals.
- It’s amazing for audio processing, image analysis, and even machine learning.
- It lets you filter noise out like a data science bloodhound 🐾

## The Not-So-Scary Equations
- **Continuous:**  
  $$ F(\omega) = \int_{-\infty}^{\infty} f(t) e^{-i\omega t} dt $$
- **Discrete:**  
  $$ X_k = \sum_{n=0}^{N-1} x_n e^{-2\pi i k n / N} $$

Howl if you want a demo!🐾
"""
# %%
import numpy as np
import plotly.graph_objs as go

# Signal parameters
np.random.seed(42)  # so it's repeatable!
t = np.linspace(0, 2 * np.pi, 500)  # 0 to 2*pi, 500 samples
signal = 2 * np.sin(3 * t) + 1.5 * np.sin(7 * t + 0.6)  # periodic base
noise = np.random.normal(0, 0.8, size=t.shape)  # gaussian noise
noisy_signal = signal + noise

fig = go.Figure()
fig.add_trace(go.Scatter(x=t, y=noisy_signal, mode='lines', 
                        name='Noisy Signal',
                        line=dict(color='#00CED1')))
fig.add_trace(go.Scatter(x=t, y=signal, mode='lines', 
                        name='Original Signal',
                        line=dict(color='#FFD700', dash='dash')))
fig.update_layout(
    template='plotly_dark',
    title='🚀 Noisy Periodic Signal (with True Signal!)',
    xaxis_title='Time (t)',
    yaxis_title='Amplitude',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='right', x=1),
    font=dict(family='Arial', size=16)
)
fig.show()
# %% [markdown]
"""
## 🐾 What Are You Seeing in the FFT Plot?

- **Bright Peaks:** Each big spike corresponds to a major frequency hidden in your original noisy time series. These are the secret periodic waves your data is made from! 🎵
- **Background fuzz:** That gentle fuzz? That's noise! It's why the peaks aren't razor-sharp.
- **Location of Peaks:** Should be at the original frequencies we stuffed into the signal (around 3 and 7 Hz). If you see them — the puppy did his job! 🐶

No pie charts! Pie charts can't sniff out frequencies. But the FFT sure can. If you want to play with filtering, frequency removal, or anything else Fourier-y, just say the word! 🚀
"""
# %% [markdown]
"""
## 🐶 Noisy Periodic Signal Demo: What Are You Looking At?

- **Blue line:** This is a noisy signal — a combination of smooth periodic waves (sinusoids) + pure random noise, just like real-world data (which is usually a pretty wild mess!)
- **Yellow dashed line:** This is the underlying "true" signal if you could magically remove the noise! 🎩

Why is this cool? The whole point of using the Fourier Transform is to see through all that noise and figure out what frequencies are hiding in your data — almost like a data science x-ray for time series! 💪🐾

Want to see the Fourier Transform in action and sniff out those frequencies? Just say, "arf!" 🚀
"""
# %%
# FFT of Noisy Signal!
from numpy.fft import fft, fftfreq
import plotly.graph_objs as go

N = len(t)
dt = t[1] - t[0]  # sample spacing

fft_vals = fft(noisy_signal)
fft_mags = np.abs(fft_vals) / N  # normalize
freqs = fftfreq(N, dt)

# Only keep positive frequencies (real-world meaningful)
pos_mask = freqs > 0

fig = go.Figure()
fig.add_trace(go.Scatter(x=freqs[pos_mask], y=fft_mags[pos_mask],
                         mode='lines',
                         name='FFT Magnitude',
                         line=dict(color='#FF69B4')))
fig.update_layout(
    template='plotly_dark',
    title='🚀 FFT of Noisy Signal: Frequency Domain Paw-ty!',
    xaxis_title='Frequency (Hz)',
    yaxis_title='Amplitude (normalized)',
    font=dict(family='Arial', size=16)
)
fig.show()
# %% [markdown]
"""
## 🌊🐶 Wavelet Transform: The Surfer Pup of Signal Analysis 🏄‍♂️🚀

Okay, Fourier is great for sniffing out *what* frequencies are in a signal... but what if you want to know **when and where** those frequencies appear? That's where the **Wavelet Transform** jumps in—surf's up, data pup! 🌊🐾

### What makes Wavelets different from Fourier?
- **Fourier:** Perfect for signals where frequencies are steady, but loses track of *when* they occur (think: endless ocean waves, all at once).
- **Wavelets:** Instead of looking at whole signals with never-ending sine waves, wavelets let us use *short*, wiggly little waves ("wavelets") that slide & scale along your data. It's like a puppy on a surfboard catching every wave, big or small, wherever it pops up in time!

**With wavelets you see:**
- *Which* frequencies exist
- *When* in time they appear
- How strong they are

### 🧑‍🔬 The Not-So-Scary Math
Wavelet Transform decomposes a signal using tiny scaled and shifted versions of a base wavelet:
$$ W(a, b) = \int_{-\infty}^{\infty} f(t) \ \psi^*\left(\frac{t-b}{a}\right) dt $$
Where:
- $f(t)$ = your signal
- $\psi$ = the chosen wavelet (like a little "wiggle")
- $a$ = scale (frequency-ish)
- $b$ = position (time-ish)

### 🏄 Why do data scientists care?
- Perfect for analyzing signals where stuff *changes* over time—like stock prices, earthquakes, heartbeats, and barks 🐕
- Lets you zoom in for both the big picture (low frequency) and tiny details (high frequency)!

Want to see your signal surfed with a wavelet demo? Just say "arf arf!" and I'll break out my surfboard!
"""
# %%
import pywt
import plotly.graph_objs as go

# Perform single-level DWT decomposition
wavelet = 'db4'  # Daubechies 4, a classic choice!
coeffs = pywt.dwt(noisy_signal, wavelet)
cA, cD = coeffs  # Approximation and Detail coefficients

# Plot approximation and detail coefficients
fig = go.Figure()
fig.add_trace(go.Scatter(y=cA, mode='lines', name='Approximation (Low Freqs)', line=dict(color='#37FF8B')))
fig.add_trace(go.Scatter(y=cD, mode='lines', name='Detail (High Freqs)', line=dict(color='#FF9B19')))
fig.update_layout(
    template='plotly_dark',
    title='🌊 DWT Decomposition: Approximation vs Detail 🚀',
    xaxis_title='Coefficient Index',
    yaxis_title='Value',
    font=dict(family='Arial', size=16)
)
fig.show()
# %% [markdown]
"""
## 🏄‍♂️ DWT: Wavelet Decomposition Explained!

- **Approximation Coefficients (A):**
  - These capture the *low-frequency* content of your signal, like the slow, smooth trends and big shapes - the puppy laying in the shade.
- **Detail Coefficients (D):**
  - These capture the *high-frequency* content, aka noise, sharp changes, or tiny wiggles - the puppy running in circles chasing its tail!

**Why is this cool?**
- DWT gives you time *and* frequency info at different scales.
- You can filter out noise, compress data, or reconstruct clean signals.

🐾 Want to see deeper levels of decomposition? Or reconstruct the signal from just the approximation or detail? Bark your order! 🚀
"""
