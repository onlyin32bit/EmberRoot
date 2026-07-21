import torch
import torch.nn as nn

class PINNSurrogate(nn.Module):
    """
    Physics-Informed Neural Network (PINN) surrogate model
    approximating 3D reaction-diffusion PDEs for peat smouldering fire.
    """
    def __init__(self, input_dim=4, output_dim=2, hidden_layers=[64, 64, 64]):
        super().__init__()
        layers = []
        in_dim = input_dim
        for h_dim in hidden_layers:
            layers.append(nn.Linear(in_dim, h_dim))
            layers.append(nn.Tanh())
            in_dim = h_dim
        layers.append(nn.Linear(in_dim, output_dim))
        self.net = nn.Sequential(*layers)

    def forward(self, x, y, z, t):
        # Concatenate coordinate inputs
        inputs = torch.cat([x, y, z, t], dim=-1)
        return self.net(inputs)

    def compute_residual(self, x, y, z, t, water_table):
        # Setup coordinates for autograd tracking
        x.requires_grad_(True)
        y.requires_grad_(True)
        z.requires_grad_(True)
        t.requires_grad_(True)
        
        pred = self.forward(x, y, z, t)
        T, O2 = pred[..., 0:1], pred[..., 1:2]
        
        # Calculate gradients using torch.autograd
        dT_dt = torch.autograd.grad(T, t, grad_outputs=torch.ones_like(T), create_graph=True)[0]
        dT_dx = torch.autograd.grad(T, x, grad_outputs=torch.ones_like(T), create_graph=True)[0]
        dT_dy = torch.autograd.grad(T, y, grad_outputs=torch.ones_like(T), create_graph=True)[0]
        dT_dz = torch.autograd.grad(T, z, grad_outputs=torch.ones_like(T), create_graph=True)[0]
        
        dT_dx2 = torch.autograd.grad(dT_dx, x, grad_outputs=torch.ones_like(dT_dx), create_graph=True)[0]
        dT_dy2 = torch.autograd.grad(dT_dy, y, grad_outputs=torch.ones_like(dT_dy), create_graph=True)[0]
        dT_dz2 = torch.autograd.grad(dT_dz, z, grad_outputs=torch.ones_like(dT_dz), create_graph=True)[0]
        
        # Thermodynamics / physical variables (simplified)
        k = 0.15 # Thermal conductivity
        rho = 800.0 # Density
        c = 1500.0 # Heat capacity
        Q = 1.0e6 # Reaction heat
        
        # Arrhenius reaction rate under moisture suppression
        # (suppressed if z is below the groundwater table)
        arrhenius = torch.exp(-1.0 / (T + 273.15))
        is_above_water = (z < water_table).float()
        omega = O2 * arrhenius * is_above_water
        
        # Residual of heat equation
        heat_residual = rho * c * dT_dt - k * (dT_dx2 + dT_dy2 + dT_dz2) - Q * omega
        return heat_residual
