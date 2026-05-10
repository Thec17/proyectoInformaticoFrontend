// uiRenderer.js
import { formattedData, updateHawbReal, updateMawbDate, deleteMawb } from './dataHandler.js';

const regsContainer = document.querySelector(".data");

// Object para almacenar datos guardados por usuario
export let savedData = {};

function getRealValuesFor(mawb, hawb) {
  const savedForHawb = savedData?.[mawb]?.[hawb];
  if (savedForHawb) {
    const pcs = savedForHawb.pcs === "" || savedForHawb.pcs == null ? null : Number(savedForHawb.pcs);
    const wgt = savedForHawb.wgt === "" || savedForHawb.wgt == null ? null : Number(savedForHawb.wgt);
    return {
      pcs: Number.isFinite(pcs) ? pcs : 0,
      wgt: Number.isFinite(wgt) ? wgt : 0,
      source: "local",
    };
  }

  const backendForHawb = formattedData?.[mawb]?.elements?.[hawb];
  const pcs = backendForHawb?.realPcs;
  const wgt = backendForHawb?.realWgt;
  return {
    pcs: Number.isFinite(Number(pcs)) ? Number(pcs) : 0,
    wgt: Number.isFinite(Number(wgt)) ? Number(wgt) : 0,
    source: "backend",
  };
}

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

export function renderMawb() {
  const mawbList = document.getElementById("mawb-list");
  mawbList.innerHTML = "";
  regsContainer.innerHTML = "";

  // Obtener y ordenar los MAWB por fecha (más reciente primero)
  const sortedMawbs = Object.keys(formattedData).sort((a, b) => {
    const dateA = formattedData[a].date ? new Date(formattedData[a].date) : new Date(0);
    const dateB = formattedData[b].date ? new Date(formattedData[b].date) : new Date(0);
    return dateB - dateA; // Orden descendente (más reciente primero)
  });

  sortedMawbs.forEach(mawb => {
    const mawbDate = formattedData[mawb].date || "";

    const list_option = document.createElement("option");
    list_option.value = mawb;
    mawbList.appendChild(list_option);

    const regContainer = document.createElement('div');
    regContainer.className = 'reg';

    regContainer.innerHTML = `
      <span class="reg-header">
        <strong>MAWB: </strong>
        <strong class="mawb">${mawb}</strong>
        <small class="awb-date">  ${mawbDate}</small>
        <button class="delete-mawb-btn" data-mawb="${mawb}">Borrar MAWB</button>
      </span>
    `;

    regsContainer.appendChild(regContainer);
  });
}

export function getFilteredDataByDate(dateFilter) {
  let filteredDate = dateFilter || getTodayDateColombian();
  
  // Si el filtro viene en formato ISO (YYYY-MM-DD), convertir a colombiano
  if (filteredDate && filteredDate.includes('-')) {
    const [year, month, day] = filteredDate.split('-');
    filteredDate = `${day}/${month}/${year}`;
  }
  
  const mawbKeys = Object.keys(formattedData).filter(mawb => {
    const mawbDate = formattedData[mawb].date || "";
    return mawbDate === filteredDate;
  });

  const summaryRows = [];
  let summaryTotalExpectedPCS = 0;
  let summaryTotalExpectedWGT = 0;
  let summaryTotalRealPCS = 0;
  let summaryTotalRealWGT = 0;

  mawbKeys.forEach(mawb => {
    const mawbInfo = formattedData[mawb];
    const expectedPCS = Number(mawbInfo["Total PCS"] || 0);
    const expectedWGT = Number(mawbInfo["Total WGT"] || 0);

    let realPCS = 0;
    let realWGT = 0;
    Object.keys(formattedData[mawb].elements).forEach(hawb => {
      const { pcs, wgt } = getRealValuesFor(mawb, hawb);
      realPCS += pcs;
      realWGT += wgt;
    });

    summaryRows.push({
      MAWB: mawb,
      Fecha: filteredDate,
      "Esperado PCS": expectedPCS,
      "Esperado WGT": expectedWGT,
      "Real PCS": realPCS,
      "Real WGT": realWGT
    });

    summaryTotalExpectedPCS += expectedPCS;
    summaryTotalExpectedWGT += expectedWGT;
    summaryTotalRealPCS += realPCS;
    summaryTotalRealWGT += realWGT;
  });

  const detailRows = [];
  mawbKeys.forEach(mawb => {
    Object.values(formattedData[mawb].elements).forEach(element => {
      const { pcs: realPCS, wgt: realWGT } = getRealValuesFor(mawb, element.HAWB);
      detailRows.push({
        MAWB: mawb,
        HAWB: element.HAWB,
        "Esperado PCS": element.PCS,
        "Esperado WGT": element.WGT,
        "Real PCS": realPCS,
        "Real WGT": realWGT
      });
    });
  });

  return {
    date: filteredDate,
    summary: summaryRows,
    detail: detailRows,
    summaryTotalExpectedPCS,
    summaryTotalExpectedWGT,
    summaryTotalRealPCS,
    summaryTotalRealWGT
  };
}

export function exportToExcelByDate(dateFilter) {
  const {date, summary, detail, summaryTotalExpectedPCS, summaryTotalExpectedWGT, summaryTotalRealPCS, summaryTotalRealWGT} = getFilteredDataByDate(dateFilter);

  const lines = [];
  lines.push([`Reporte por fecha: ${date}`]);
  lines.push([`Generado: ${new Date().toISOString()}`]);
  lines.push([]);
  lines.push(["Resumen de MAWB"]);
  lines.push(["MAWB", "Fecha", "Esperado PCS", "Esperado WGT", "Real PCS", "Real WGT"]);

  if (summary.length === 0) {
    lines.push(["No hay registros para esa fecha"]);
  } else {
    summary.forEach(row => {
      lines.push([String(row.MAWB), row.Fecha, row["Esperado PCS"], row["Esperado WGT"], row["Real PCS"], row["Real WGT"]]);
    });
    lines.push(["Totales", "", summaryTotalExpectedPCS, summaryTotalExpectedWGT, summaryTotalRealPCS, summaryTotalRealWGT]);
  }

  lines.push([]);
  lines.push(["Detalle de HAWB"]);
  lines.push(["MAWB", "HAWB", "Esperado PCS", "Esperado WGT", "Real PCS", "Real WGT"]);
  if (detail.length === 0) {
    lines.push(["No hay detalle para esta fecha"]);
  } else {
    detail.forEach(row => {
      lines.push([String(row.MAWB), String(row.HAWB), row['Esperado PCS'], row['Esperado WGT'], row['Real PCS'], row['Real WGT']]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(lines);
  
  // Aplicar anchos de columna automáticos
  worksheet['!cols'] = [
    { wch: 15 },  // MAWB
    { wch: 18 },  // HAWB / Fecha
    { wch: 14 },  // Esperado PCS / Esperado PCS
    { wch: 14 },  // Esperado WGT / Esperado WGT
    { wch: 12 },  // Real PCS / Real PCS
    { wch: 12 }   // Real WGT / Real WGT
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  XLSX.writeFile(workbook, `reporte_${date}.xlsx`);
}

export function renderHawb(mawb) {
  const popup_backdrop = document.querySelector(".popup_backdrop");
  const popup = popup_backdrop.querySelector("div");
  const infoContainer = popup.querySelector(".info_container");

  infoContainer.querySelector(".selected_mawb").textContent = mawb;

  const rowsContainer = infoContainer.querySelector(".rows");
  rowsContainer.innerHTML = "";

  const hawbList = document.getElementById("hawb-list");
  hawbList.innerHTML = "";
  Object.keys(formattedData[mawb]["elements"]).forEach(hawb => {
    const list_option = document.createElement("option");
    list_option.value = hawb;
    hawbList.appendChild(list_option);

    const row = document.createElement("span");
    row.className = "row";
    
    // Precargar: preferir lo local si existe; si no, usar lo que viene del backend
    const { pcs: realPCS, wgt: realWGT, source } = getRealValuesFor(mawb, hawb);
    const initialPCS =
      source === "local" ? (savedData?.[mawb]?.[hawb]?.pcs ?? "") : (realPCS ?? "");
    const initialWGT =
      source === "local" ? (savedData?.[mawb]?.[hawb]?.wgt ?? "") : (realWGT ?? "");
    
    row.innerHTML = `
      <p class="hawb">${hawb}</p>
      <p class="pcs"><span class="label">Esperado:</span> ${formattedData[mawb]["elements"][hawb]["PCS"]}</p>
      <p class="pcs"><input type="number" min="0" class="input-pcs" placeholder="Real" data-hawb="${hawb}" value="${initialPCS}"></p>
      <p class="wgt"><span class="label">Esperado:</span> ${formattedData[mawb]["elements"][hawb]["WGT"]}</p>
      <p class="wgt"><input type="number" min="0" class="input-wgt" placeholder="Real" data-hawb="${hawb}" value="${initialWGT}"></p>
    `;

    rowsContainer.append(row);
  });

  const selectedDate = infoContainer.querySelector(".selected_date");
  const dateInput = infoContainer.querySelector("#mawb-date-input");

  // Si los elementos no existen, crearlos dinámicamente
  const totalElement = infoContainer.querySelector(".total");
  if (totalElement && (!infoContainer.querySelector(".total_pcs_real") || !infoContainer.querySelector(".total_wgt_real"))) {
    totalElement.innerHTML = `
      <strong>TOTAL</strong>
      <p class="total_pcs">...</p>
      <p class="total_pcs_real">...</p>
      <p class="total_wgt">...</p>
      <p class="total_wgt_real">...</p>
    `;
  }

  // Obtener los elementos finales
  const finalTotalPCS = infoContainer.querySelector(".total_pcs");
  const finalTotalPCSReal = infoContainer.querySelector(".total_pcs_real");
  const finalTotalWGT = infoContainer.querySelector(".total_wgt");
  const finalTotalWGTReal = infoContainer.querySelector(".total_wgt_real");

  const mawbDate = formattedData[mawb].date || getTodayDateColombian();
  selectedDate.textContent = mawbDate;
  
  // Para el input date, convertir colombiano a ISO si es necesario
  let isoDate = mawbDate;
  if (mawbDate.includes('/')) {
    const [day, month, year] = mawbDate.split('/');
    isoDate = `${year}-${month}-${day}`;
  }
  dateInput.value = isoDate;

  // Función para calcular totales en tiempo real
  function calculateTotals() {
    let totalPCSValue = 0;
    let totalWGTValue = 0;

    // Recorrer todos los inputs de PCS y WGT
    const pcsInputs = rowsContainer.querySelectorAll(".input-pcs");
    const wgtInputs = rowsContainer.querySelectorAll(".input-wgt");

    pcsInputs.forEach(input => {
      const value = parseFloat(input.value) || 0;
      if (value > 0) {
        totalPCSValue += value;
      }
    });

    wgtInputs.forEach(input => {
      const value = parseFloat(input.value) || 0;
      if (value > 0) {
        totalWGTValue += value;
      }
    });

    // Mostrar totales esperados y calculados en columnas separadas
    const expectedPCS = formattedData[mawb]["Total PCS"];
    const expectedWGT = formattedData[mawb]["Total WGT"];

    if (finalTotalPCS) finalTotalPCS.textContent = expectedPCS;
    if (finalTotalPCSReal) finalTotalPCSReal.textContent = totalPCSValue || 0;
    if (finalTotalWGT) finalTotalWGT.textContent = expectedWGT;
    if (finalTotalWGTReal) finalTotalWGTReal.textContent = totalWGTValue || 0;
  }

  // Calcular totales iniciales
  calculateTotals();

  // Agregar event listeners a todos los inputs para cálculo automático
  const allInputs = rowsContainer.querySelectorAll("input[type='number']");
  allInputs.forEach(input => {
    input.addEventListener("input", calculateTotals);
    input.addEventListener("change", calculateTotals);
  });

  console.log(formattedData, "rendering");
  
  // Agregar botón de guardar
  let saveButton = infoContainer.querySelector(".btn-save-all");
  if (saveButton) {
    saveButton.remove();
  }
  
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-save-all";
  saveBtn.textContent = "Guardar Datos";
  saveBtn.addEventListener("click", async function() {
    const inputs = rowsContainer.querySelectorAll(".row");
    
    // Inicializar objeto para este MAWB si no existe
    if (!savedData[mawb]) {
      savedData[mawb] = {};
    }
    
    let hasSavedData = false;
    
    let selectedSaveDate = dateInput.value;
    if (!selectedSaveDate) {
      selectedSaveDate = getTodayDateColombian();
    } else {
      // Convertir ISO (YYYY-MM-DD) a colombiano (DD/MM/YYYY)
      const [year, month, day] = selectedSaveDate.split('-');
      selectedSaveDate = `${day}/${month}/${year}`;
    }

    // Recolectar datos de todos los inputs
    for (const rowElement of Array.from(inputs)) {
      const pcsInput = rowElement.querySelector(".input-pcs");
      const wgtInput = rowElement.querySelector(".input-wgt");
      const hawb = pcsInput.dataset.hawb;
      
      const pcs = pcsInput.value.trim();
      const wgt = wgtInput.value.trim();
      
      // Si al menos uno tiene valor, guardar (no es obligatorio que todos estén llenos)
      if (pcs || wgt) {
        // Validar que si tienen valor sean positivos
        if ((pcs && (isNaN(pcs) || Number(pcs) < 0)) || (wgt && (isNaN(wgt) || Number(wgt) < 0))) {
          alert("Los valores deben ser números positivos");
          return;
        }
        
        // Guardar datos localmente
        savedData[mawb][hawb] = {
          pcs: pcs,
          wgt: wgt
        };
        
        // Actualizar en el backend
        try {
          await updateHawbReal(mawb, hawb, pcs || 0, wgt || 0);
          console.log(`HAWB ${hawb} actualizado en el backend`);
        } catch (error) {
          console.error(`Error al actualizar HAWB ${hawb}:`, error);
          alert(`Error al guardar HAWB ${hawb}`);
          return;
        }
        
        hasSavedData = true;
      }
    }

    // Guardar fecha seleccionada en la data de MAWB y en el estado guardado
    formattedData[mawb].date = selectedSaveDate;
    selectedDate.textContent = selectedSaveDate;
    if (!savedData[mawb]) {
      savedData[mawb] = {};
    }
    savedData[mawb].date = selectedSaveDate;

    // Actualizar fecha en el backend
    try {
      await updateMawbDate(mawb, selectedSaveDate);
      console.log(`Fecha del MAWB ${mawb} actualizada en el backend`);
    } catch (error) {
      console.error(`Error al actualizar la fecha en el backend:`, error);
      alert(`Error al guardar la fecha en el servidor`);
      return;
    }

    // Actualizar fecha mostrada en la lista externa (fuera del popup)
    const allRegs = document.querySelectorAll('.reg');
    allRegs.forEach(reg => {
      const regMawb = reg.querySelector('.mawb')?.textContent;
      if (regMawb === mawb) {
        const dateLabel = reg.querySelector('.awb-date');
        if (dateLabel) {
          dateLabel.textContent = selectedSaveDate;
        }
      }
    });
    
    if (hasSavedData) {
      alert("✅ Cambios guardados correctamente (Datos + Fecha)");
    } else {
      alert("✅ Fecha actualizada correctamente");
    }
  });
  
  infoContainer.appendChild(saveBtn);

  const hawbFilter = document.getElementById("hawb-filter");
  hawbFilter.value = "";
  popup_backdrop.classList.remove("hidden");
}
