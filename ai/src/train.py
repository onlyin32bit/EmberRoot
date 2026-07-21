import os
import yaml
import torch
import torch.optim as optim
import numpy as np
from torch.utils.data import random_split
from simulation.pinn_surrogate import PINNSurrogate
from data_loader import PeatTelemetryDataset, generate_mock_telemetry_csv, get_telemetry_dataloader

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "../config/settings.yaml")
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def train_pipeline():
    config = load_config()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[EmberBrain] Training started on device: {device}")
    
    # 1. Setup Data Paths & Generation
    data_dir = os.path.join(os.path.dirname(__file__), "../data/processed")
    os.makedirs(data_dir, exist_ok=True)
    telemetry_path = os.path.join(data_dir, "telemetry.csv")
    
    if not os.path.exists(telemetry_path):
        print("[EmberBrain] Telemetry data not found. Generating simulated dataset...")
        generate_mock_telemetry_csv(telemetry_path, num_rows=1000)
        
    # 2. Instantiate Dataset
    dataset = PeatTelemetryDataset(telemetry_path)
    dataset_size = len(dataset)
    train_size = int(0.8 * dataset_size)
    val_size = dataset_size - train_size
    
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    train_loader = get_telemetry_dataloader(telemetry_path, batch_size=32, shuffle=True)
    
    # 3. Model setup
    model = PINNSurrogate(
        input_dim=4,
        output_dim=2,
        hidden_layers=config["pinn"]["hidden_layers"]
    ).to(device)
    
    optimizer = optim.Adam(model.parameters(), lr=config["pinn"]["learning_rate"], weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=20)
    
    epochs = config["pinn"]["epochs"]
    lambda_heat = config["pinn"]["lambda_residuals"]["heat"]
    
    best_loss = float('inf')
    export_dir = os.path.join(os.path.dirname(__file__), "../models/export")
    os.makedirs(export_dir, exist_ok=True)
    checkpoint_dir = os.path.join(os.path.dirname(__file__), "../models/checkpoint")
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    # 4. Training Loop
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        train_data_loss = 0.0
        train_phys_loss = 0.0
        
        for batch_X, batch_y in train_loader:
            batch_X, batch_y = batch_X.to(device), batch_y.to(device)
            optimizer.zero_grad()
            
            # Forward prediction (T, O2)
            # The input contains features: temp_5, temp_15, temp_30, temp_45, co, co2, ch4, moisture, water_table
            # To pass coordinate inputs to PINN: we map feature indices
            # Let's extract inputs:
            x_coord = batch_X[:, 0:1] # mapped x
            y_coord = batch_X[:, 1:2] # mapped y
            z_coord = batch_X[:, 2:3] # depth
            t_coord = torch.rand_like(z_coord) * 1800.0 # simulated time index
            
            pred = model(x_coord, y_coord, z_coord, t_coord)
            loss_data = torch.mean((pred - batch_y[:, 0:2]) ** 2) # fit first 2 targets: temp_5 and temp_15
            
            # Autograd PDE Residual loss
            # Extract water table from telemetry (index 8 of features)
            water_table = batch_X[:, 8:9]
            heat_res = model.compute_residual(x_coord, y_coord, z_coord, t_coord, water_table)
            loss_physics = torch.mean(heat_res ** 2)
            
            loss = loss_data + lambda_heat * loss_physics
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * batch_X.size(0)
            train_data_loss += loss_data.item() * batch_X.size(0)
            train_phys_loss += loss_physics.item() * batch_X.size(0)
            
        train_loss /= len(train_loader.dataset)
        train_data_loss /= len(train_loader.dataset)
        train_phys_loss /= len(train_loader.dataset)
        
        scheduler.step(train_loss)
        
        # Save checkpoints and best models
        if train_loss < best_loss:
            best_loss = train_loss
            best_path = os.path.join(export_dir, "pinn_surrogate.pt")
            torch.save(model.state_dict(), best_path)
            
        if epoch % 100 == 0 or epoch == 1:
            print(f"[EmberBrain] Epoch {epoch:04d}/{epochs} | Total Loss: {train_loss:.5f} | Data Loss: {train_data_loss:.5f} | Physics Loss: {train_phys_loss:.5f} | Best Loss: {best_loss:.5f}")
            
    print(f"[EmberBrain] Training complete. Best model weights saved to {best_path}")

if __name__ == "__main__":
    train_pipeline()
