import pandas as pd
import numpy as np

class PeatFeatureExtractor:
    """
    Feature engineering utility for peat fire telemetry.
    Computes physical markers, temporal/spatial derivatives, and rolling baselines.
    """
    def __init__(self, co2_col='co2', co_col='co', temp_cols=None):
        self.co2_col = co2_col
        self.co_col = co_col
        self.temp_cols = temp_cols if temp_cols else ['temp_5', 'temp_15', 'temp_30', 'temp_45']
        
    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features from raw telemetry dataframe.
        """
        df = df.copy()
        
        # 1. CO2/CO Ratio - signature of smouldering progression (approaches ~1)
        # Handle zero divisions gracefully
        df['ratio_co2_co'] = df[self.co2_col] / (df[self.co_col] + 1e-5)
        
        # 2. Temporal Gradients: Rate of temperature change (dT/dt) per depth
        for col in self.temp_cols:
            df[f'{col}_dt'] = df[col].diff().fillna(0.0)
            
        # 3. Spatial Gradients: Temperature variations across depths (approximation of vertical heat conduction)
        df['grad_temp_5_15'] = (df['temp_5'] - df['temp_15']) / 10.0
        df['grad_temp_15_30'] = (df['temp_15'] - df['temp_30']) / 15.0
        df['grad_temp_30_45'] = (df['temp_30'] - df['temp_45']) / 15.0
        
        # 4. Adaptive Baselines: Moving Averages (EMA) to prevent false alerts caused by seasonal changes
        for col in self.temp_cols + [self.co_col, 'ratio_co2_co']:
            # Short-term rolling average (current trend)
            df[f'{col}_ema_short'] = df[col].ewm(span=6, adjust=False).mean() # ~30 mins
            # Long-term rolling average (baseline)
            df[f'{col}_ema_long'] = df[col].ewm(span=288, adjust=False).mean() # ~24 hours
            
            # Anomaly index based on deviation from baseline
            df[f'{col}_deviation'] = df[col] - df[f'{col}_ema_long']

        return df

    @staticmethod
    def classify_fire_stage(temp_5, temp_15, co, ratio_co2_co, moisture, water_table):
        """
        Physical logic thresholding for warning verification.
        Matches me/DesignDoc.md Section 5.5 and 6.1.
        """
        # Saturated soil below water table cannot support smouldering
        if water_table >= 0: # Saturated/flooded condition
            return 0 # Normal (flooded)

        # Smouldering threshold checks:
        # High temperatures in the peat layers + rising CO + falling CO2/CO ratio towards 1
        is_heating_up = (temp_5 > 45.0) or (temp_15 > 40.0)
        is_gas_anomalous = (co > 5.0) and (ratio_co2_co < 50.0)
        is_soil_dry = moisture < 25.0

        if is_heating_up and is_gas_anomalous:
            return 3 # Active Smouldering Warning
        elif is_heating_up or (is_gas_anomalous and is_soil_dry):
            return 2 # Suspicious / Watch stage
        elif temp_5 > 35.0 or co > 3.0:
            return 1 # Monitor / Tracking stage
        else:
            return 0 # Normal
