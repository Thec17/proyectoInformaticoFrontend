// dataHandler.js
const BACKEND_URL = "https://proyectoinformaticobackend.onrender.com";

export let groups = [];
export let dataLoaded;
export let formattedData = {};

// Helper para convertir fecha a formato colombiano DD/MM/YYYY
function formatDateToColombian(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper para obtener la fecha de hoy en zona local (sin ambigüedades de zona horaria)
function getTodayDateColombian() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

// Nueva función para cargar datos desde el backend
export async function loadDataFromBackend(file) {
  try {
    // Paso 1: Enviar archivo al backend
    const formData = new FormData();
    formData.append("file", file);
    
    const uploadResponse = await fetch(`${BACKEND_URL}/upload`, {
      method: "POST",
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Error al subir archivo: ${uploadResponse.status}`);
    }
    
    const uploadData = await uploadResponse.json();
    console.log("Upload response:", uploadData);
    
    // Paso 2: Obtener lista de MAWBs
    const mawbListResponse = await fetch(`${BACKEND_URL}/mawb`);
    if (!mawbListResponse.ok) {
      throw new Error(`Error al obtener lista de MAWBs: ${mawbListResponse.status}`);
      console.log("test");
      
    }
    
    const mawbList = await mawbListResponse.json();
    console.log("MAWB List:", mawbList);
    
    // Paso 3: Obtener detalles de cada MAWB y construir formattedData
    formattedData = {};
    
    for (const mawbNumber of mawbList) {
      const mawbResponse = await fetch(`${BACKEND_URL}/mawb/${mawbNumber}`);
      if (!mawbResponse.ok) {
        console.error(`Error al obtener MAWB ${mawbNumber}`);
        continue;
      }
      
      const mawbData = await mawbResponse.json();
      console.log("MAWB details:", mawbData);
      
      // Construir estructura compatible con el frontend
      formattedData[mawbNumber] = {
        date: mawbData.date,
        "Total PCS": mawbData.total_expected_pcs,
        "Total WGT": mawbData.total_expected_wgt,
        elements: {}
      };
      
      // Agregar detalles de los HAWBs
      mawbData.hawbs.forEach(hawb => {
        formattedData[mawbNumber].elements[hawb.HAWB] = {
          MAWB: mawbNumber,
          HAWB: hawb.HAWB,
          PCS: hawb.expected_pcs,
          WGT: hawb.expected_wgt,
          realPcs: hawb.real_pcs,
          realWgt: hawb.real_wgt
        };
      });
    }
    
    console.log("Formatted data from backend:", formattedData);
    
  } catch (error) {
    console.error("Error loading data from backend:", error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}

// Carga MAWBs existentes desde la BD (sin necesidad de subir Excel).
// Esto permite que al abrir la página ya se vea lo que está en Neon.
export async function loadExistingDataFromBackend() {
  // Reutilizamos la misma estructura que crea `loadDataFromBackend`,
  // para que el render funcione sin cambios.
  try {
    formattedData = {};

    const mawbListResponse = await fetch(`${BACKEND_URL}/mawb`);
    if (!mawbListResponse.ok) {
      throw new Error(`Error al obtener lista de MAWBs: ${mawbListResponse.status}`);
    }

    const mawbList = await mawbListResponse.json();

    for (const mawbNumber of mawbList) {
      const mawbResponse = await fetch(`${BACKEND_URL}/mawb/${mawbNumber}`);
      if (!mawbResponse.ok) {
        console.error(`Error al obtener MAWB ${mawbNumber}`);
        continue;
      }

      const mawbData = await mawbResponse.json();

      formattedData[mawbNumber] = {
        date: mawbData.date,
        "Total PCS": mawbData.total_expected_pcs,
        "Total WGT": mawbData.total_expected_wgt,
        elements: {},
      };

      mawbData.hawbs.forEach(hawb => {
        formattedData[mawbNumber].elements[hawb.HAWB] = {
          MAWB: mawbNumber,
          HAWB: hawb.HAWB,
          PCS: hawb.expected_pcs,
          WGT: hawb.expected_wgt,
          realPcs: hawb.real_pcs,
          realWgt: hawb.real_wgt,
        };
      });
    }
  } catch (error) {
    console.error("Error loading existing data from backend:", error);
    throw error;
  }
}

// Mantener función original para compatibilidad
export function loadData(file) {
  return loadDataFromBackend(file);
}

// Función para actualizar valores reales de un HAWB en el backend
export async function updateHawbReal(mawbNumber, hawbNumber, realPcs, realWgt) {
  try {
    const response = await fetch(`${BACKEND_URL}/hawb/real`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mawb: mawbNumber,
        hawb: hawbNumber,
        pcs: realPcs,
        wgt: realWgt
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error al actualizar HAWB: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("HAWB updated:", result);
    
    // Actualizar formattedData localmente
    if (formattedData[mawbNumber] && formattedData[mawbNumber].elements[hawbNumber]) {
      formattedData[mawbNumber].elements[hawbNumber].realPcs = realPcs;
      formattedData[mawbNumber].elements[hawbNumber].realWgt = realWgt;
    }
    
    return result;
  } catch (error) {
    console.error("Error updating HAWB:", error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}

export function formatData() {
  // console.log("FORMAT DATA FUNC");
  groups.shift();

  // clear previous results so repeated uploads start fresh
  formattedData = {};

  // Step 1: Find the column positions for MAWB, # HAWB, PIEC, and PESO
  let columnPositions = {
    mawb: null,
    hawb: null,
    piec: null,
    peso: null
  };

  // Document date: always use upload time (no parsing del contenido)
  let documentDate = new Date();
  const documentDateString = getTodayDateColombian();

  // bypass parsing logic since fecha debe ser la fecha de carga
  // (se conserva la variable por compatibilidad con el resto del código)

  // Search through the data to find the column headers
  for (let element of dataLoaded) {
    for (let key in element) {
      const value = element[key];
      if (value === "MAWB") columnPositions.mawb = key;
      if (value === "# HAWB") columnPositions.hawb = key;
      if (value === "PIEC") columnPositions.piec = key;
      if (value === "PESO") columnPositions.peso = key;
    }
    
    // If all columns are found, we can stop searching
    if (columnPositions.mawb && columnPositions.hawb && columnPositions.piec && columnPositions.peso) {
      break;
    }
  }

  console.log("Column positions found:", columnPositions);

  // Step 2: Process each row and check if all values are numeric
  dataLoaded.forEach(element => {
    // Check if this row contains all four columns
    if (columnPositions.mawb && columnPositions.hawb && columnPositions.piec && columnPositions.peso) {
      const mawbValue = element[columnPositions.mawb];
      const hawbValue = element[columnPositions.hawb];
      const piecValue = element[columnPositions.piec];
      const pesoValue = element[columnPositions.peso];

      // Verify all values are numeric (not NaN)
      const allNumeric = !isNaN(mawbValue) && !isNaN(hawbValue) && !isNaN(piecValue) && !isNaN(pesoValue) &&
                        mawbValue !== "" && hawbValue !== "" && piecValue !== "" && pesoValue !== "";

      if (allNumeric) {
        // Create a unique key combining both IDs
        const mawbKey = mawbValue;
        const hawbKey = hawbValue;
        
        console.log(`Processing: MAWB=${mawbKey}, HAWB=${hawbKey}, PCS=${piecValue}, WGT=${pesoValue}`);

        // Initialize the main entry if it doesn't exist
        if (!Object.hasOwn(formattedData, mawbKey)) {
          formattedData[mawbKey] = {
            elements: {},
            date: documentDateString
          };
        }

        // Add the element with both IDs
        if (!Object.hasOwn(formattedData[mawbKey].elements, hawbKey)) {
          formattedData[mawbKey].elements[hawbKey] = {
            MAWB: mawbKey,
            HAWB: hawbKey,
            PCS: piecValue,
            WGT: pesoValue
          };
        }
      }
    }
  });

  // console.log("Formatted data:", formattedData);

  // Step 3: Calculate Total PCS and Total WGT for each MAWB
  Object.keys(formattedData).forEach(mawbKey => {
    let totalPCS = 0;
    let totalWGT = 0;

    // Sum all PCS and WGT values for this MAWB
    Object.keys(formattedData[mawbKey].elements).forEach(hawbKey => {
      const element = formattedData[mawbKey].elements[hawbKey];
      totalPCS += Number(element.PCS) || 0;
      totalWGT += Number(element.WGT) || 0;
    });

    // Add totals to the MAWB object
    formattedData[mawbKey]["Total PCS"] = totalPCS;
    formattedData[mawbKey]["Total WGT"] = totalWGT;

    // console.log(`MAWB ${mawbKey}: Total PCS=${totalPCS}, Total WGT=${totalWGT}`);
  });

  console.log("Final formatted data with totals:", formattedData);
}