# EmberBrain - AI Engine for Peat Smouldering Fire Detection

This directory contains the machine learning and physical modeling codebase for **EmberBrain**, the intelligence core of the EmberRoot project.

## Directory Structure

```text
ai/
├── README.md                  # This file
├── requirements.txt            # Python dependencies
├── config/
│   └── settings.yaml          # Hyperparameters and model configuration
├── data/                      # Data files (ignored by git, except structure)
│   ├── raw/
│   ├── processed/
│   └── meta/
├── models/                    # Exported model weights and checkpoints
│   ├── checkpoint/
│   └── export/
├── notebooks/                 # Jupyter notebooks for data analysis & prototyping
│   └── exploration.ipynb
└── src/                       # Core source code
    ├── __init__.py
    ├── data_loader.py         # Ingestion of sensor and satellite data
    ├── features.py            # Feature engineering (e.g. CO2/CO ratio)
    ├── train.py               # Model training pipelines
    ├── inference.py           # Real-time inference wrapper
    ├── simulation/            # Fire propagation models
    │   ├── __init__.py
    │   ├── cellular_automata.py # Cellular Automata (CA) model
    │   ├── pde_solver.py      # Numerical PDE solver
    │   └── pinn_surrogate.py  # Physics-Informed Neural Network surrogate
    └── assimilation/          # Data assimilation pipelines
        ├── __init__.py
        └── enkf.py            # Ensemble Kalman Filter implementation
```

## Getting Started

1. Set up a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
