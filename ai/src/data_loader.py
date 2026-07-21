import os
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

class PeatTelemetryDataset(Dataset):
    """
    Production-grade Dataset loader for Peat Sensor Telemetry.
    Parses and structures multi-depth temperatures, gas profiles, moisture, and water tables.
    """
    def __init__(self, data_path, target_cols=None, features_cols=None):
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Telemetry data not found at: {data_path}")
            
        self.df = pd.read_csv(data_path)
        self.df['timestamp'] = pd.to_datetime(self.df['timestamp'])
        self.df = self.df.sort_values('timestamp').reset_index(drop=True)
        
        # Resample to uniform intervals (e.g., 5 min) and interpolate missing telemetry
        self.df.set_index('timestamp', inplace=True)
        self.df = self.df.resample('5Min').mean(numeric_only=True)
        self.df = self.df.interpolate(method='linear').bfill().ffill()
        self.df.reset_index(inplace=True)
        
        # Default columns matching me/DesignDoc.md schema
        self.temp_cols = ['temp_5', 'temp_15', 'temp_30', 'temp_45']
        self.gas_cols = ['co', 'co2', 'ch4']
        self.env_cols = ['moisture', 'water_table']
        
        self.feature_cols = features_cols if features_cols else (self.temp_cols + self.gas_cols + self.env_cols)
        self.target_cols = target_cols if target_cols else self.temp_cols
        
        self.X = self.df[self.feature_cols].values.astype(np.float32)
        self.y = self.df[self.target_cols].values.astype(np.float32)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        return torch.tensor(self.X[idx]), torch.tensor(self.y[idx])


def get_telemetry_dataloader(data_path, batch_size=32, shuffle=True, num_workers=0):
    """
    Helper function to instantiate dataset and return PyTorch DataLoader.
    """
    dataset = PeatTelemetryDataset(data_path)
    return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle, num_workers=num_workers)


def generate_mock_telemetry_csv(output_path, num_rows=200):
    """
    Generates a realistic telemetry dataset matching the DesignDoc schema for testing and baseline runs.
    """
    np.random.seed(42)
    start_time = pd.Timestamp("2026-07-20 00:00:00")
    timestamps = [start_time + pd.Timedelta(minutes=5 * i) for i in range(num_rows)]
    
    data = {
        'timestamp': timestamps,
        'node_id': ['node_01'] * num_rows,
        'temp_5': 25.0 + np.random.normal(0, 0.5, num_rows),
        'temp_15': 24.5 + np.random.normal(0, 0.3, num_rows),
        'temp_30': 23.8 + np.random.normal(0, 0.2, num_rows),
        'temp_45': 23.0 + np.random.normal(0, 0.1, num_rows),
        'co': 1.5 + np.random.normal(0, 0.1, num_rows),
        'co2': 400.0 + np.random.normal(0, 5.0, num_rows),
        'ch4': 2.0 + np.random.normal(0, 0.1, num_rows),
        'moisture': 45.0 + np.random.normal(0, 1.0, num_rows),
        'water_table': -15.0 + np.random.normal(0, 0.5, num_rows), # cm relative to datum
        'battery_v': 3.7 + np.random.normal(0, 0.05, num_rows)
    }
    
    # Simulate a rising hotspot on subset of data
    for i in range(120, 180):
        data['temp_5'][i] += (i - 120) * 4.5
        data['temp_15'][i] += (i - 120) * 3.0
        data['co'][i] += (i - 120) * 0.8
        data['co2'][i] += (i - 120) * 5.0
        data['moisture'][i] -= (i - 120) * 0.5

    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated realistic telemetry file: {output_path}")
