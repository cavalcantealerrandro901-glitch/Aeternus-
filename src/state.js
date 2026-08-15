let maintenanceMode = false;

module.exports = {
    getMaintenance: () => maintenanceMode,
    setMaintenance: (status) => { maintenanceMode = status; }
};
