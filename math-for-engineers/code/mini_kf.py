"""Mini position estimator: a 1D Kalman filter that fuses wheel odometry
(prediction) with a noisy absolute position fix (measurement).

Run directly to see a 60-second simulation, or import Kalman1D / simulate / run.
Only numpy is required.
"""
import numpy as np


class Kalman1D:
    """Scalar Kalman filter for position x with variance P."""

    def __init__(self, x0, P0, Q, R):
        self.x = x0      # position estimate [m]
        self.P = P0      # variance of that estimate [m^2]
        self.Q = Q       # variance added by one prediction step [m^2]
        self.R = R       # variance of one measurement [m^2]

    def predict(self, u, dt):
        """Move by the odometry velocity u for dt seconds."""
        self.x += u * dt             # ch6: integrate velocity into position
        self.P += self.Q             # ch12: independent errors add their variances

    def update(self, z):
        """Blend in a position measurement z. Returns the gain used."""
        K = self.P / (self.P + self.R)   # ch11/ch12: trust each side by its variance
        self.x += K * (z - self.x)       # ch7: same shape as y += alpha * (x - y)
        self.P = (1.0 - K) * self.P      # the blend is more certain than either side
        return K


def simulate(seed=0, T=60.0, dt=0.1, sigma_odo=0.1, odo_bias=0.02, sigma_z=0.5):
    """Generate a ground-truth trajectory, odometry readings and position fixes."""
    rng = np.random.default_rng(seed)
    n = int(round(T / dt))
    t = np.arange(n) * dt
    v_true = 0.5 + 0.3 * np.sin(2 * np.pi * t / 20)             # speed profile [m/s]
    x_true = np.concatenate(([0.0], np.cumsum(v_true[:-1]) * dt))  # x[k+1] = x[k] + v[k] dt
    u = v_true + odo_bias + rng.normal(0, sigma_odo, n)          # wheel odometry [m/s]
    z = x_true + rng.normal(0, sigma_z, n)                       # position fix [m]
    return t, x_true, u, z


def run(seed=0, q_scale=1.0, T=60.0, dt=0.1, sigma_odo=0.1, odo_bias=0.02, sigma_z=0.5):
    """Run the filter and dead reckoning on one simulated mission."""
    t, x_true, u, z = simulate(seed, T, dt, sigma_odo, odo_bias, sigma_z)
    Q = q_scale * (sigma_odo * dt) ** 2
    kf = Kalman1D(x0=z[0], P0=sigma_z ** 2, Q=Q, R=sigma_z ** 2)
    est = np.empty_like(z)
    dead = np.empty_like(z)
    gain = np.empty_like(z)
    d = z[0]                                  # dead reckoning starts at the first fix
    for k in range(z.size):
        if k:
            kf.predict(u[k - 1], dt)
            d += u[k - 1] * dt
        gain[k] = kf.update(z[k])
        est[k] = kf.x
        dead[k] = d
    rms = lambda e: float(np.sqrt(np.mean(e ** 2)))
    return {
        "t": t, "true": x_true, "z": z, "est": est, "dead": dead, "gain": gain,
        "rms_meas": rms(z - x_true), "rms_kf": rms(est - x_true),
        "rms_dead": rms(dead - x_true), "final_dead": float(abs(dead[-1] - x_true[-1])),
    }


if __name__ == "__main__":
    r = run(seed=0)
    print(f"position fix alone  : rms error {r['rms_meas']:.3f} m")
    print(f"odometry alone      : rms error {r['rms_dead']:.3f} m (final {r['final_dead']:.2f} m)")
    print(f"Kalman filter       : rms error {r['rms_kf']:.3f} m")
    print(f"steady-state gain K : {r['gain'][-1]:.4f}")
