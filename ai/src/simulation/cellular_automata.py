import numpy as np

class CellularAutomata3D:
    """
    3D Cellular Automaton model for peat smouldering progression.
    States:
      0: Unburnt (Fuel)
      1: Smouldering (Active)
      2: Burnt (Ash/Inactive)
    """
    def __init__(self, shape=(50, 50, 20), dx=0.1, dt=60.0):
        self.shape = shape
        self.dx = dx
        self.dt = dt
        self.grid = np.zeros(shape, dtype=np.int32)
        self.temp_grid = np.ones(shape) * 25.0 # Ambient temperature

    def initialize_fire(self, x, y, z):
        self.grid[x, y, z] = 1
        self.temp_grid[x, y, z] = 300.0

    def step(self, moisture_grid, water_table):
        """
        Perform a simulation step.
        moisture_grid: np.ndarray (same shape) representing local moisture %.
        water_table: float or np.ndarray (2D) representing local groundwater level.
        """
        new_grid = self.grid.copy()
        new_temp = self.temp_grid.copy()
        
        # Simple CA rule logic:
        # A cell ignites based on neighboring active cells, suppressed by moisture & water tables
        x_dim, y_dim, z_dim = self.shape
        for x in range(1, x_dim-1):
            for y in range(1, y_dim-1):
                for z in range(1, z_dim-1):
                    # Ground water saturation barrier:
                    if z >= water_table:
                        new_grid[x, y, z] = 0
                        new_temp[x, y, z] = 20.0 # Wet peat temperature
                        continue
                    
                    if self.grid[x, y, z] == 0:
                        # Count burning neighbors
                        neighbors = self.grid[x-1:x+2, y-1:y+2, z-1:z+2]
                        active_neighbors = np.sum(neighbors == 1)
                        
                        if active_neighbors > 0:
                            # Igniting probability influenced by local moisture
                            p_ignite = 0.3 / (1.0 + moisture_grid[x, y, z])
                            if np.random.rand() < p_ignite:
                                new_grid[x, y, z] = 1
                                new_temp[x, y, z] = 300.0
                    
                    elif self.grid[x, y, z] == 1:
                        # Smouldering cells slowly burn out to state 2 (burnt)
                        if np.random.rand() < 0.05:
                            new_grid[x, y, z] = 2
                            new_temp[x, y, z] = 60.0 # Cooling down

        self.grid = new_grid
        self.temp_grid = new_temp
        return self.grid, self.temp_grid
