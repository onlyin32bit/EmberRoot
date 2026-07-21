import numpy as np

class LatentEnKF:
    """
    Ensemble Kalman Filter (EnKF) executed in a reduced-order/latent space
    to update physical predictions dynamically from sparse sensor networks.
    """
    def __init__(self, ensemble_size=50, latent_dim=10, obs_dim=5):
        self.M = ensemble_size
        self.d = latent_dim
        self.p = obs_dim
        
        # Initialize ensemble of latent states (d x M)
        self.ensemble = np.random.randn(self.d, self.M)
        
    def forecast(self, forward_model_fn):
        """
        Propagate the ensemble through the surrogate/latent transition model.
        """
        for i in range(self.M):
            self.ensemble[:, i] = forward_model_fn(self.ensemble[:, i])
        return self.ensemble

    def update(self, observations, observation_operator_H, R_covariance):
        """
        Update the forecasted ensemble with telemetry observations.
        observations: np.ndarray (p x 1)
        observation_operator_H: matrix or function projecting latent space to observation space (p x d)
        R_covariance: measurement noise covariance (p x p)
        """
        # Calculate ensemble mean and anomalies
        mean = np.mean(self.ensemble, axis=1, keepdims=True)
        A = self.ensemble - mean # Latent state anomalies (d x M)
        
        # Project ensemble to observation space
        H = observation_operator_H
        obs_ensemble = H @ self.ensemble
        obs_mean = np.mean(obs_ensemble, axis=1, keepdims=True)
        HA = obs_ensemble - obs_mean # Projected anomalies (p x M)
        
        # Compute Kalman Gain: K = P_xy * (P_yy + R)^-1
        # P_xy = 1/(M-1) * A * HA^T
        # P_yy = 1/(M-1) * HA * HA^T
        P_xy = (A @ HA.T) / (self.M - 1)
        P_yy = (HA @ HA.T) / (self.M - 1)
        
        Kalman_Gain = P_xy @ np.linalg.inv(P_yy + R_covariance)
        
        # Perturbed observations for EnKF
        perturbed_obs = observations + np.random.multivariate_normal(
            mean=np.zeros(self.p), cov=R_covariance, size=self.M
        ).T
        
        # Update ensemble members
        self.ensemble = self.ensemble + Kalman_Gain @ (perturbed_obs - obs_ensemble)
        return self.ensemble
