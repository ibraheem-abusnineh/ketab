const csv = require('csv-parser');
const fs = require('fs');

/**
 * Parse CSV file and return array of user objects
 * @param {string} filePath - Path to CSV file
 * @param {string} role - 'parent' or 'teacher'
 * @returns {Promise<Array>} Array of user objects
 */
async function parseCSV(filePath, role) {
  return new Promise((resolve, reject) => {
    const users = [];
    let headers = [];
    let rowCount = 0;

    const arabicIndicToAscii = (s) => {
      if (!s) return '';
      const map = {
        '\u0660': '0','\u0661': '1','\u0662': '2','\u0663': '3','\u0664': '4',
        '\u0665': '5','\u0666': '6','\u0667': '7','\u0668': '8','\u0669': '9',
        '\u06F0': '0','\u06F1': '1','\u06F2': '2','\u06F3': '3','\u06F4': '4',
        '\u06F5': '5','\u06F6': '6','\u06F7': '7','\u06F8': '8','\u06F9': '9'
      };
      return s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, ch => map[ch] || ch);
    };

    const normalize = (v) => {
      const str = (typeof v === 'string' ? v : (v ?? '')).toString();
      // remove BOM + RTL marks, trim whitespace, and normalize spaces
      return str.replace(/[\uFEFF\u200E\u200F]/g, '').replace(/\s+/g, ' ').trim();
    };

    // Helper function to find header by variants
    const findHeader = (headers, variants) => {
      for (const variant of variants) {
        const found = headers.find(h => {
          const normalizedH = normalize(h);
          const normalizedVariant = normalize(variant);
          return normalizedH === normalizedVariant || 
                 normalizedH.includes(normalizedVariant) || 
                 normalizedVariant.includes(normalizedH);
        });
        if (found) return found;
      }
      return null;
    };

    // Helper function to get value by header or column index
    const getValue = (row, headers, headerVariants, columnIndex) => {
      // Try header-based lookup first
      const header = findHeader(headers, headerVariants);
      if (header && row[header] !== undefined) {
        return row[header];
      }
      // Fallback to column index
      const values = Object.values(row);
      if (values[columnIndex] !== undefined) {
        return values[columnIndex];
      }
      return '';
    };

    fs.createReadStream(filePath)
      .pipe(csv({
        separator: ',',
        mapHeaders: ({ header }) => normalize(header),
      }))
      .on('data', (row) => {
        try {
          rowCount++;
          
          // Capture headers from first row
          if (rowCount === 1) {
            headers = Object.keys(row);
          }

          // Normalize all cell values
          const nrow = Object.keys(row).reduce((acc, key) => {
            acc[key] = normalize(row[key]);
            return acc;
          }, {});

          let user = {};

          if (role === 'parent') {
            // Parents CSV mapping with fallback to column index
            user = {
              nationalNumber: arabicIndicToAscii(
                getValue(nrow, headers, ['الرقم الوطني لولي الأمر', 'الرقم الوطني'], 4)
              ).replace(/[^0-9]/g, ''),
              name: getValue(nrow, headers, ['الاسم'], 2),
              phone: arabicIndicToAscii(getValue(nrow, headers, ['الهاتف'], 5)),
              school: getValue(nrow, headers, ['المدرسة'], 0),
              directorate: getValue(nrow, headers, ['المديرية'], 1),
              role: 'parent'
            };
          } else if (role === 'teacher') {
            // Teachers CSV mapping with fallback to column index
            // Expected order: A=المدرسة, B=المديرية, C=الاسم, E=الرقم الوطني, F=الهاتف
            user = {
              nationalNumber: arabicIndicToAscii(
                getValue(nrow, headers, ['الرقم الوطني'], 4)
              ).replace(/[^0-9]/g, ''),
              name: getValue(nrow, headers, ['الاسم'], 2),
              phone: arabicIndicToAscii(getValue(nrow, headers, ['الهاتف'], 5)),
              school: getValue(nrow, headers, ['المدرسة'], 0),
              directorate: getValue(nrow, headers, ['المديرية'], 1),
              role: 'teacher'
            };
          }

          // Only add if national number exists
          if (user.nationalNumber && user.nationalNumber !== '') {
            users.push(user);
          }
        } catch (error) {
          console.warn('Error parsing row:', error, row);
        }
      })
      .on('end', () => {
        // If no users were parsed, include diagnostic info
        if (users.length === 0 && rowCount > 0) {
          const error = new Error(`No valid users found. Headers detected: ${headers.join(', ')}. Total rows processed: ${rowCount}`);
          error.headers = headers;
          error.rowCount = rowCount;
          reject(error);
        } else {
          resolve(users);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Validate user object
 * @param {Object} user - User object to validate
 * @returns {Object} {valid: boolean, errors: string[]}
 */
function validateUser(user) {
  const errors = [];
  const allowedRoles = ['parent', 'teacher', 'supervisor', 'student', 'developer', 'guest'];
  
  if (!user.nationalNumber || user.nationalNumber.trim() === '') {
    errors.push('National number is required');
  }
  
  if (!user.name || user.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!user.role || !allowedRoles.includes(user.role)) {
    errors.push('Role must be parent, teacher, supervisor, student, developer, or guest');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  parseCSV,
  validateUser
};
