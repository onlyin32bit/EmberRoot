import os
import torch
import numpy as np
import matplotlib.pyplot as plt
from simulation.pinn_surrogate import PINNSurrogate

class EmberBrainInference:
    """
    Production-grade inference and visualization wrapper for EmberBrain's PINN surrogate.
    """
    def __init__(self, model_path=None):
        if model_path is None:
            model_path = os.path.join(os.path.dirname(__file__), "../models/export/pinn_surrogate.pt")
            
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = PINNSurrogate(input_dim=4, output_dim=2)
        
        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            print(f"[EmberBrain] Model weights loaded from: {model_path}")
        else:
            print(f"[EmberBrain] Warning: Weights not found at {model_path}. Model running with random initialization.")
            
        self.model.to(self.device)
        self.model.eval()

    def predict(self, x, y, z, t):
        """
        Executes model inference on coordinate vectors.
        x, y, z, t: numpy arrays or lists (must align in dimension)
        """
        x_arr = np.array(x, dtype=np.float32).reshape(-1, 1)
        y_arr = np.array(y, dtype=np.float32).reshape(-1, 1)
        z_arr = np.array(z, dtype=np.float32).reshape(-1, 1)
        t_arr = np.array(t, dtype=np.float32).reshape(-1, 1)
        
        x_t = torch.from_numpy(x_arr).to(self.device)
        y_t = torch.from_numpy(y_arr).to(self.device)
        z_t = torch.from_numpy(z_arr).to(self.device)
        t_t = torch.from_numpy(t_arr).to(self.device)
        
        with torch.no_grad():
            preds = self.model(x_t, y_t, z_t, t_t)
            preds_np = preds.cpu().numpy()
            
        T = preds_np[:, 0]
        O2 = preds_np[:, 1]
        return T, O2

    def plot_temperature_field(self, t_val=1800.0, output_path=None):
        """
        Generates 2D horizontal slices of temperature at multiple depths (5, 15, 30, 45 cm)
        and plots the result.
        """
        grid_x, grid_y = np.meshgrid(np.linspace(0, 5, 50), np.linspace(0, 5, 50))
        depths = [0.05, 0.15, 0.30, 0.45] # depths in meters
        
        fig, axes = plt.subplots(2, 2, figsize=(10, 8), sharex=True, sharey=True)
        fig.suptitle(f"Predicted Peat Temperature Field (Time t = {t_val}s)", fontsize=14)
        
        for idx, depth in enumerate(depths):
            ax = axes[idx // 2, idx % 2]
            flat_x = grid_x.flatten()
            flat_y = grid_y.flatten()
            flat_z = np.ones_like(flat_x) * depth
            flat_t = np.ones_like(flat_x) * t_val
            
            T, _ = self.predict(flat_x, flat_y, flat_z, flat_t)
            grid_T = T.reshape(grid_x.shape)
            
            im = ax.imshow(grid_T, extent=[0, 5, 0, 5], origin='lower', cmap='hot', vmin=20, vmax=350)
            ax.set_title(f"Depth z = {depth*100:.0f} cm")
            
            if idx >= 2:
                ax.set_xlabel("X coordinate (m)")
            if idx % 2 == 0:
                ax.set_ylabel("Y coordinate (m)")
                
        fig.subplots_adjust(right=0.85)
        cbar_ax = fig.add_axes([0.88, 0.15, 0.03, 0.7])
        fig.colorbar(im, cax=cbar_ax, label="Temperature (°C)")
        
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            print(f"[EmberBrain] Temperature field visualization saved to: {output_path}")
        else:
            plt.show()
        plt.close()

if __name__ == "__main__":
    infer = EmberBrainInference()
    T, O2 = infer.predict([2.5], [2.5], [0.5], [1800.0])
    print(f"Test prediction: Temp={T[0]:.2f}C, O2={O2[0]:.4f}")
    
    # Save test plot
    plot_path = os.path.join(os.path.dirname(__file__), "../models/export/temp_field.png")
    infer.plot_temperature_field(output_path=plot_path)
