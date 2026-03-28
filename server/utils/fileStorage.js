const fs = require('fs');
const path = require('path');

/**
 * Read JSON data from a file safely
 * @param {string} filePath - Path to the JSON file
 * @param {any} defaultValue - Default value if file doesn't exist or is invalid
 * @returns {any} Parsed JSON data or default value
 */
function readJSON(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading from ${filePath}:`, error);
    return defaultValue;
  }
}

/**
 * Write JSON data to a file atomically to prevent corruption
 * @param {string} filePath - Path to the JSON file
 * @param {any} data - Data to write
 * @returns {boolean} Success status
 */
function writeJSON(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temporary file
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Atomic rename
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    // Cleanup temp file if it exists
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
    return false;
  }
}

module.exports = {
  readJSON,
  writeJSON
};
