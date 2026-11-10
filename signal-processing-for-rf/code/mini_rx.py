"""Mini QPSK receiver: TX -> impaired channel -> full sync chain -> BER.
Pure numpy so it runs anywhere."""
import numpy as np

SPS, BETA, SPAN = 4, 0.35, 8          # samples/symbol, RRC roll-off, filter span (symbols)


def rrc(beta=BETA, sps=SPS, span=SPAN):
    """Root-raised-cosine taps normalized to unit energy."""
    t = np.arange(-span * sps // 2, span * sps // 2 + 1) / sps
    h = np.empty_like(t)
    for i, ti in enumerate(t):
        if abs(ti) < 1e-9:
            h[i] = 1 - beta + 4 * beta / np.pi
        elif abs(abs(4 * beta * ti) - 1) < 1e-9:
            h[i] = beta / np.sqrt(2) * ((1 + 2 / np.pi) * np.sin(np.pi / (4 * beta))
                                        + (1 - 2 / np.pi) * np.cos(np.pi / (4 * beta)))
        else:
            h[i] = (np.sin(np.pi * ti * (1 - beta)) + 4 * beta * ti * np.cos(np.pi * ti * (1 + beta))) \
                   / (np.pi * ti * (1 - (4 * beta * ti) ** 2))
    return h / np.sqrt(np.sum(h ** 2))


def qpsk_map(bits):
    """Gray-coded QPSK: bit pair (b0, b1) -> ((1-2*b0) + j(1-2*b1)) / sqrt(2)."""
    b = bits.reshape(-1, 2)
    return ((1 - 2 * b[:, 0]) + 1j * (1 - 2 * b[:, 1])) / np.sqrt(2)


def qpsk_demap(sym):
    return np.column_stack([sym.real < 0, sym.imag < 0]).astype(int).ravel()


SYNC = np.tile([1 + 1j, -1 - 1j], 32) / np.sqrt(2)                  # 64 symbols: lets the loops lock
PREAMBLE = qpsk_map(np.random.default_rng(7).integers(0, 2, 64))   # 32 known symbols: marks frame start
H = rrc()


def transmit(bits):
    sym = np.concatenate([SYNC, PREAMBLE, qpsk_map(bits)])
    up = np.zeros(len(sym) * SPS, complex)
    up[::SPS] = sym                                  # zero-stuff to SPS samples/symbol
    return np.convolve(up, H)                        # pulse shaping


def channel(x, esn0_db, cfo=0.0, phase=0.0, delay=0.0, gain=1.0, rng=None):
    """cfo is normalized to the sample rate (cycles/sample); delay is in samples (fractional ok)."""
    rng = rng or np.random.default_rng()
    n = np.arange(len(x))
    # fractional delay with a windowed-sinc interpolator
    k = np.arange(-16, 17)
    d = np.sinc(k - delay % 1) * np.hamming(len(k))
    x = np.convolve(x, d / d.sum(), mode="same")
    x = np.concatenate([np.zeros(int(delay)), x])
    n = np.arange(len(x))
    x = gain * x * np.exp(1j * (2 * np.pi * cfo * n + phase))
    n0 = gain ** 2 * 10 ** (-esn0_db / 10)                     # unit-energy pulses: Es = 1 per symbol
    noise = np.sqrt(n0 / 2) * (rng.standard_normal(len(x)) + 1j * rng.standard_normal(len(x)))
    return x + noise


def loop_gains(bn_ts, zeta=0.707, kd=1.0):
    """Second-order loop filter gains (proportional, integral) from normalized bandwidth."""
    th = bn_ts / (zeta + 1 / (4 * zeta))
    den = 1 + 2 * zeta * th + th ** 2
    return 4 * zeta * th / den / kd, 4 * th ** 2 / den / kd


def agc(x, target=1.0 / SPS):
    return x * np.sqrt(target / np.mean(np.abs(x) ** 2))


def coarse_cfo(x, nfft=1 << 16):
    """QPSK^4 removes the modulation and leaves a tone at 4*cfo."""
    spec = np.abs(np.fft.fft(x ** 4, nfft))
    f = np.fft.fftfreq(nfft)[np.argmax(spec)] / 4
    return x * np.exp(-2j * np.pi * f * np.arange(len(x))), f


def interp(x, t):
    """Cubic (Catmull-Rom) interpolation of x at fractional index t."""
    i = int(np.floor(t)); mu = t - i
    p0, p1, p2, p3 = x[i - 1], x[i], x[i + 1], x[i + 2]
    return p1 + 0.5 * mu * (p2 - p0 + mu * (2 * p0 - 5 * p1 + 4 * p2 - p3 + mu * (3 * (p1 - p2) + p3 - p0)))


def timing_estimate(y, sps=SPS):
    """Feed-forward (Oerder-Meyr) estimate: |y|^2 peaks at symbol centers, so the phase
    of its symbol-rate spectral line tells where the eye opening is (0..sps samples)."""
    n = np.arange(len(y))
    c = np.sum(np.abs(y) ** 2 * np.exp(-2j * np.pi * n / sps))
    return (-np.angle(c) / (2 * np.pi) * sps) % sps


def gardner(y, sps=SPS, bn_ts=0.01):
    """Gardner timing recovery: returns one sample per symbol at the eye opening."""
    kp, ki = loop_gains(bn_ts, kd=2.7)
    t, v, prev, out = sps + timing_estimate(y, sps), 0.0, 0j, []   # start near the right phase
    while t + sps + 2 < len(y):
        cur = interp(y, t)
        mid = interp(y, t - sps / 2)
        e = np.real((prev - cur) * np.conj(mid))     # timing error detector
        v += ki * e
        t += sps + sps * (kp * e + v)                # advance to next symbol, nudged by the loop
        prev = cur
        out.append(cur)
    return np.array(out)


def costas(s, bn_ts=0.02):
    """QPSK Costas loop: removes residual frequency and phase."""
    kp, ki = loop_gains(bn_ts)
    phase, freq, out = 0.0, 0.0, np.empty_like(s)
    for i, x in enumerate(s):
        z = x * np.exp(-1j * phase)
        e = np.sign(z.real) * z.imag - np.sign(z.imag) * z.real
        freq += ki * e
        phase += freq + kp * e
        out[i] = z
    return out


def frame_sync(s):
    """Find the preamble and undo the 90-degree ambiguity of QPSK."""
    c = np.correlate(s, PREAMBLE, mode="valid")
    k = int(np.argmax(np.abs(c) > 0.7 * np.max(np.abs(c))))    # first strong peak, not the largest
    rot = np.exp(-1j * np.round(np.angle(c[k]) / (np.pi / 2)) * np.pi / 2)
    return s[k + len(PREAMBLE):] * rot


def receive(r):
    r = agc(r)
    r, f_est = coarse_cfo(r)
    y = np.convolve(r, H)                            # matched filter
    y = y / np.sqrt(np.mean(np.abs(y) ** 2))
    s = gardner(y)
    s = costas(s)
    return frame_sync(s), f_est


if __name__ == "__main__":
    rng = np.random.default_rng(2026)
    bits = rng.integers(0, 2, 2 * 4000)
    tx = transmit(bits)
    rx = channel(tx, esn0_db=15, cfo=0.004, phase=1.0, delay=37.4, gain=0.3, rng=rng)
    sym, f_est = receive(rx)
    n = min(len(sym), len(bits) // 2)
    ref = qpsk_map(bits[: 2 * n])
    errors = int(np.sum(qpsk_demap(sym[:n]) != bits[: 2 * n]))
    evm = np.sqrt(np.mean(np.abs(sym[100:n] - ref[100:n]) ** 2))   # skip loop settling
    print(f"coarse CFO estimate : {f_est:+.5f} cycles/sample (true +0.00400)")
    print(f"symbols / bit errors: {n} / {errors}  (BER {errors / (2 * n):.1e})")
    print(f"EVM                 : {20 * np.log10(evm):.1f} dB")
